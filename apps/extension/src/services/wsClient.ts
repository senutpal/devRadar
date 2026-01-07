/**
 * WebSocket Client Service
 *
 * Handles WebSocket connection with:
 * - Exponential backoff reconnection with jitter
 * - Message queueing for offline resilience
 * - Application-level heartbeat ping/pong
 * - Proper cleanup and disposal
 */

import {
  type WebSocketMessage,
  type MessageType,
  type ActivityPayload,
  type UserStatusType,
  type PokePayload,
  WS_RECONNECT_CONFIG,
  HEARTBEAT_INTERVAL_MS,
} from '@devradar/shared';
import * as vscode from 'vscode';

import type { AuthService } from './authService';
import type { ConfigManager } from '../utils/configManager';
import type { Logger } from '../utils/logger';

/*** WebSocket connection states ***/
export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

/*** Queued message for offline resilience ***/
interface QueuedMessage {
  message: WebSocketMessage;
  timestamp: number;
}

/*** WebSocket client with reconnection and message handling ***/
export class WebSocketClient implements vscode.Disposable {
  private ws: WebSocket | null = null;
  private connectionState: ConnectionState = 'disconnected';
  private reconnectAttempts = 0;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private lastPongTime = 0;
  private messageQueue: QueuedMessage[] = [];
  private readonly maxQueueSize = 100;
  private readonly messageQueueMaxAge = 60_000; // 1 minute

  private readonly disposables: vscode.Disposable[] = [];
  private readonly onMessageEmitter = new vscode.EventEmitter<WebSocketMessage>();
  private readonly onConnectionStateChangeEmitter = new vscode.EventEmitter<ConnectionState>();

  /*** Event that fires when a message is received ***/
  readonly onMessage = this.onMessageEmitter.event;

  /*** Event that fires when connection state changes ***/
  readonly onConnectionStateChange = this.onConnectionStateChangeEmitter.event;

  constructor(
    private readonly authService: AuthService,
    private readonly configManager: ConfigManager,
    private readonly logger: Logger
  ) {
    this.disposables.push(this.onMessageEmitter, this.onConnectionStateChangeEmitter);
  }

  /*** Gets the current connection state ***/
  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  /*** Checks if connected ***/
  isConnected(): boolean {
    return this.connectionState === 'connected' && this.ws?.readyState === WebSocket.OPEN;
  }

  /*** Connects to the WebSocket server ***/
  connect(): void {
    if (this.connectionState === 'connecting' || this.connectionState === 'connected') {
      this.logger.debug('Already connected or connecting');
      return;
    }

    const token = this.authService.getToken();
    if (!token) {
      this.logger.warn('Cannot connect: no auth token');
      return;
    }

    this.setConnectionState('connecting');
    this.logger.info('Connecting to WebSocket server...');

    try {
      const wsUrl = this.configManager.get('wsUrl');
      /* Connect with token in URL */
      this.ws = new WebSocket(`${wsUrl}?token=${token}`);
      this.setupWebSocketHandlers();
    } catch (error) {
      this.logger.error('Failed to create WebSocket', error);
      this.scheduleReconnect();
    }
  }

  /*** Disconnects from the WebSocket server ***/
  disconnect(): void {
    this.logger.info('Disconnecting from WebSocket server...');
    this.cancelReconnect();
    this.stopHeartbeat();

    if (this.ws) {
      this.ws.onclose = null; /* Prevent reconnect on intentional disconnect */
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }

    this.setConnectionState('disconnected');
  }

  /*** Sends a message to the server ***/
  send(type: MessageType, payload: unknown): void {
    const message: WebSocketMessage = {
      type,
      payload,
      timestamp: Date.now(),
    };

    if (this.isConnected() && this.ws) {
      try {
        this.ws.send(JSON.stringify(message));
        this.logger.debug('Sent message', { type });
      } catch (error) {
        this.logger.error('Failed to send message', error);
        this.queueMessage(message);
      }
    } else {
      this.queueMessage(message);
    }
  }

  /*** Sends a status update ***/
  sendStatusUpdate(status: UserStatusType, activity?: ActivityPayload): void {
    this.send('STATUS_UPDATE', {
      userId: this.authService.getUser()?.id,
      status,
      activity,
      updatedAt: Date.now(),
    });
  }

  /*** Sends a poke to another user ***/
  sendPoke(toUserId: string, message?: string): void {
    const payload: PokePayload = {
      fromUserId: this.authService.getUser()?.id ?? '',
      toUserId,
    };
    if (message !== undefined) {
      payload.message = message;
    }
    this.send('POKE', payload);
  }

  /*** Sets up WebSocket event handlers ***/
  private setupWebSocketHandlers(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      this.logger.info('WebSocket connected');

      this.setConnectionState('connected');
      this.reconnectAttempts = 0;
      this.lastPongTime = Date.now();
      this.startHeartbeat();
      this.flushMessageQueue();
    };

    this.ws.onclose = (event) => {
      this.logger.info('WebSocket closed', { code: event.code, reason: event.reason });
      this.stopHeartbeat();
      this.ws = null;

      /* Check for auth failure code (4001) */
      if (event.code === 4001) {
        this.logger.error('Authentication failed (4001), clearing auth session');
        this.setConnectionState('disconnected');
        /* Trigger logout/clear auth */
        void this.authService.logout();
        return;
      }

      if (event.code !== 1000) {
        /* Abnormal closure, try to reconnect */
        this.scheduleReconnect();
      } else {
        this.setConnectionState('disconnected');
      }
    };

    this.ws.onerror = (error) => {
      this.logger.error('WebSocket error', error);
    };

    this.ws.onmessage = (event) => {
      try {
        const data = typeof event.data === 'string' ? event.data : '';
        const message = JSON.parse(data) as WebSocketMessage;

        /* Handle heartbeat and pong response */
        if (message.type === 'HEARTBEAT' || message.type === 'PONG') {
          this.lastPongTime = Date.now();
          return;
        }

        /* Handle auth success response if server sends one (optional but good practice) */
        if (message.type === 'AUTH_SUCCESS') {
          this.logger.info('WebSocket authentication successful');
          return;
        }

        this.logger.debug('Received message', { type: message.type });
        this.onMessageEmitter.fire(message);
      } catch (error) {
        this.logger.error('Failed to parse WebSocket message', error);
      }
    };
  }

  /*** Starts the heartbeat interval ***/
  private startHeartbeat(): void {
    this.stopHeartbeat();

    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected()) {
        /* Check if we've received a pong recently */
        const timeSinceLastPong = Date.now() - this.lastPongTime;
        if (timeSinceLastPong > HEARTBEAT_INTERVAL_MS * 2) {
          this.logger.warn('No pong received, connection may be dead');
          this.ws?.close(4000, 'No heartbeat response');
          return;
        }

        /* Send ping */
        this.send('HEARTBEAT', { ping: true });
      }
    }, HEARTBEAT_INTERVAL_MS);
  }

  /*** Stops the heart beat interval ***/
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /***  Schedules a reconnection attempt with exponential backoff and jitter ***/
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= WS_RECONNECT_CONFIG.maxAttempts) {
      this.logger.error('Max reconnection attempts reached');
      this.setConnectionState('disconnected');
      void vscode.window.showErrorMessage(
        'DevRadar: Unable to connect to server. Please check your connection.'
      );
      return;
    }

    this.setConnectionState('reconnecting');

    /* Calculate delay with exponential backoff */
    const baseDelay = Math.min(
      WS_RECONNECT_CONFIG.initialDelayMs *
        Math.pow(WS_RECONNECT_CONFIG.multiplier, this.reconnectAttempts),
      WS_RECONNECT_CONFIG.maxDelayMs
    );

    /* Add jitter (±25% of base delay) */
    const jitter = baseDelay * 0.25 * (Math.random() * 2 - 1);
    const delay = Math.floor(baseDelay + jitter);

    this.logger.info(
      `Scheduling reconnect attempt ${String(this.reconnectAttempts + 1)} in ${String(delay)}ms`
    );

    this.reconnectTimeout = setTimeout(() => {
      this.reconnectAttempts++;
      this.connect();
    }, delay);
  }

  /*** Cancels any pending reconnection ***/
  private cancelReconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    this.reconnectAttempts = 0;
  }

  /*** Queues a message for later delivery ***/
  private queueMessage(message: WebSocketMessage): void {
    /* Prune old messages */
    const now = Date.now();
    this.messageQueue = this.messageQueue.filter(
      (qm) => now - qm.timestamp < this.messageQueueMaxAge
    );

    /* Add new message */
    if (this.messageQueue.length < this.maxQueueSize) {
      this.messageQueue.push({ message, timestamp: now });
      this.logger.debug('Message queued', {
        type: message.type,
        queueSize: this.messageQueue.length,
      });
    } else {
      this.logger.warn('Message queue full, dropping message');
    }
  }

  /*** Flushes the message queue after reconnection. ***/
  private flushMessageQueue(): void {
    if (this.messageQueue.length === 0) return;

    this.logger.info(`Flushing ${String(this.messageQueue.length)} queued messages`);

    const now = Date.now();
    const validMessages = this.messageQueue.filter(
      (qm) => now - qm.timestamp < this.messageQueueMaxAge
    );

    for (const qm of validMessages) {
      if (this.isConnected() && this.ws) {
        try {
          this.ws.send(JSON.stringify(qm.message));
        } catch (error) {
          this.logger.error('Failed to send queued message', error);
        }
      }
    }

    this.messageQueue = [];
  }

  /*** Updates and emits connection state. ***/
  private setConnectionState(state: ConnectionState): void {
    if (this.connectionState !== state) {
      this.connectionState = state;
      this.onConnectionStateChangeEmitter.fire(state);
    }
  }

  dispose(): void {
    this.disconnect();

    for (const disposable of this.disposables) {
      disposable.dispose();
    }
  }
}
