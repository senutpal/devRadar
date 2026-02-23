'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import type { WebSocketMessage, MessageType } from '@/lib/api/types';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3000/ws';

const RECONNECT = {
  initialDelayMs: 1000,
  maxDelayMs: 30_000,
  multiplier: 2,
  maxAttempts: 10,
} as const;

type MessageHandler = (payload: unknown, message: WebSocketMessage) => void;

interface UseWebSocketOptions {
  enabled?: boolean;
  onConnect?: () => void;
  onDisconnect?: () => void;
  handlers?: Partial<Record<MessageType, MessageHandler>>;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const { enabled = true, onConnect, onDisconnect, handlers } = options;
  const wsRef = useRef<WebSocket | null>(null);
  const attemptRef = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const handlersRef = useRef(handlers);
  const connectFnRef = useRef<() => void>(() => {});
  const onConnectRef = useRef(onConnect);
  const onDisconnectRef = useRef(onDisconnect);

  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  useEffect(() => {
    onConnectRef.current = onConnect;
  }, [onConnect]);

  useEffect(() => {
    onDisconnectRef.current = onDisconnect;
  }, [onDisconnect]);

  const getToken = useCallback(() => {
    return typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
  }, []);

  const send = useCallback((type: string, payload: unknown = {}) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, payload, timestamp: Date.now() }));
    }
  }, []);

  const connect = useCallback(() => {
    const token = getToken();
    if (
      !token ||
      wsRef.current?.readyState === WebSocket.OPEN ||
      wsRef.current?.readyState === WebSocket.CONNECTING
    )
      return;

    const ws = new WebSocket(`${WS_URL}?token=${token}`);
    wsRef.current = ws;

    ws.onopen = () => {
      attemptRef.current = 0;
      setIsConnected(true);
      onConnectRef.current?.();
    };

    ws.onmessage = (event) => {
      try {
        const msg: WebSocketMessage = JSON.parse(event.data);
        handlersRef.current?.[msg.type]?.(msg.payload, msg);
      } catch (err) {
        console.warn('WebSocket: malformed message', err, event.data);
      }
    };

    ws.onclose = (event) => {
      setIsConnected(false);
      onDisconnectRef.current?.();
      wsRef.current = null;

      if (event.code >= 4001 && event.code <= 4003) return;

      if (attemptRef.current < RECONNECT.maxAttempts) {
        const delay = Math.min(
          RECONNECT.initialDelayMs * Math.pow(RECONNECT.multiplier, attemptRef.current),
          RECONNECT.maxDelayMs
        );
        attemptRef.current++;
        timeoutRef.current = setTimeout(() => connectFnRef.current(), delay);
      }
    };

    ws.onerror = () => {};
  }, [getToken]);

  useEffect(() => {
    connectFnRef.current = connect;
  }, [connect]);

  const disconnect = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    attemptRef.current = RECONNECT.maxAttempts;
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.close(1000);
      wsRef.current = null;
    }
    setIsConnected(false);
  }, []);

  useEffect(() => {
    if (enabled) connect();
    return () => disconnect();
  }, [enabled, connect, disconnect]);

  useEffect(() => {
    if (!isConnected) return;
    const id = setInterval(() => send('HEARTBEAT', {}), 30_000);
    return () => clearInterval(id);
  }, [isConnected, send]);

  return { isConnected, send, disconnect, connect };
}
