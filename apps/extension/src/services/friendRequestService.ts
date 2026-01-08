/*** Friend Request Service
 *
 * Handles friend request operations:
 * - Searching users
 * - Sending/accepting/rejecting/cancelling friend requests
 * - Fetching incoming/outgoing requests
 * - Listening to WebSocket events for real-time updates
 */

import * as vscode from 'vscode';

import type { AuthService } from './authService';
import type { ConfigManager } from '../utils/configManager';
import type { Logger } from '../utils/logger';
import type { PublicUserDTO, FriendRequestDTO, PaginatedResponse } from '@devradar/shared';

/*** Events emitted by FriendRequestService ***/
export interface FriendRequestEvents {
  onRequestReceived: vscode.Event<FriendRequestDTO>;
  onRequestAccepted: vscode.Event<{ requestId: string; friend: PublicUserDTO }>;
  onRequestsChanged: vscode.Event<void>;
}

/*** Friend Request Service ***/
export class FriendRequestService implements vscode.Disposable {
  private readonly disposables: vscode.Disposable[] = [];

  private readonly onRequestReceivedEmitter = new vscode.EventEmitter<FriendRequestDTO>();
  private readonly onRequestAcceptedEmitter = new vscode.EventEmitter<{
    requestId: string;
    friend: PublicUserDTO;
  }>();
  private readonly onRequestsChangedEmitter = new vscode.EventEmitter<void>();

  readonly onRequestReceived = this.onRequestReceivedEmitter.event;
  readonly onRequestAccepted = this.onRequestAcceptedEmitter.event;
  readonly onRequestsChanged = this.onRequestsChangedEmitter.event;

  constructor(
    private readonly configManager: ConfigManager,
    private readonly authService: AuthService,
    private readonly logger: Logger
  ) {
    this.disposables.push(
      this.onRequestReceivedEmitter,
      this.onRequestAcceptedEmitter,
      this.onRequestsChangedEmitter
    );
  }

  /*** Get the Authorization header ***/
  private getAuthHeader(): Record<string, string> {
    const token = this.authService.getToken();
    if (!token) {
      throw new Error('Not authenticated');
    }
    return { Authorization: `Bearer ${token}` };
  }

  /*** Get base server URL ***/
  private getServerUrl(): string {
    return this.configManager.get('serverUrl');
  }

  /*** Default timeout for fetch requests in milliseconds ***/
  private static readonly DEFAULT_TIMEOUT = 10_000;

  /*** Fetch with timeout using AbortController ***/
  private async fetchWithTimeout(
    url: string,
    options: RequestInit = {},
    timeout: number = FriendRequestService.DEFAULT_TIMEOUT
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /*** Search for users by query ***/
  async searchUsers(query: string): Promise<PublicUserDTO[]> {
    if (query.length < 2) {
      return [];
    }

    try {
      const response = await this.fetchWithTimeout(
        `${this.getServerUrl()}/api/v1/users/search?q=${encodeURIComponent(query)}`,
        {
          headers: this.getAuthHeader(),
        }
      );

      if (!response.ok) {
        throw new Error(`Search failed: ${String(response.status)}`);
      }

      const result = (await response.json()) as { data: PublicUserDTO[] };
      return result.data;
    } catch (error) {
      this.logger.error('Failed to search users', error);
      throw error;
    }
  }

  /*** Send a friend request to a user ***/
  async sendRequest(toUserId: string): Promise<FriendRequestDTO> {
    try {
      const response = await this.fetchWithTimeout(
        `${this.getServerUrl()}/api/v1/friend-requests`,
        {
          method: 'POST',
          headers: {
            ...this.getAuthHeader(),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ toUserId }),
        }
      );

      if (!response.ok) {
        let message = `Request failed: ${String(response.status)}`;
        try {
          const errorData = (await response.json()) as { error?: { message?: string } };
          if (errorData.error?.message) {
            message = errorData.error.message;
          }
        } catch {
          // Response wasn't JSON, use default message
        }
        throw new Error(message);
      }

      const result = (await response.json()) as { data: FriendRequestDTO };
      this.onRequestsChangedEmitter.fire();
      return result.data;
    } catch (error) {
      this.logger.error('Failed to send friend request', error);
      throw error;
    }
  }

  /*** Get incoming friend requests ***/
  async getIncomingRequests(page = 1, limit = 20): Promise<PaginatedResponse<FriendRequestDTO>> {
    try {
      const response = await this.fetchWithTimeout(
        `${this.getServerUrl()}/api/v1/friend-requests/incoming?page=${String(page)}&limit=${String(limit)}`,
        {
          headers: this.getAuthHeader(),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to get incoming requests: ${String(response.status)}`);
      }

      return (await response.json()) as PaginatedResponse<FriendRequestDTO>;
    } catch (error) {
      this.logger.error('Failed to get incoming requests', error);
      throw error;
    }
  }

  /*** Get outgoing friend requests ***/
  async getOutgoingRequests(page = 1, limit = 20): Promise<PaginatedResponse<FriendRequestDTO>> {
    try {
      const response = await this.fetchWithTimeout(
        `${this.getServerUrl()}/api/v1/friend-requests/outgoing?page=${String(page)}&limit=${String(limit)}`,
        {
          headers: this.getAuthHeader(),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to get outgoing requests: ${String(response.status)}`);
      }

      return (await response.json()) as PaginatedResponse<FriendRequestDTO>;
    } catch (error) {
      this.logger.error('Failed to get outgoing requests', error);
      throw error;
    }
  }

  /*** Get pending request count (for badge) ***/
  async getPendingCount(): Promise<number> {
    try {
      const response = await this.fetchWithTimeout(
        `${this.getServerUrl()}/api/v1/friend-requests/count`,
        {
          headers: this.getAuthHeader(),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to get pending count: ${String(response.status)}`);
      }

      const result = (await response.json()) as { data: { count: number } };
      return result.data.count;
    } catch (error) {
      this.logger.error('Failed to get pending request count', error);
      return 0;
    }
  }

  /*** Accept a friend request ***/
  async acceptRequest(requestId: string): Promise<void> {
    try {
      const response = await this.fetchWithTimeout(
        `${this.getServerUrl()}/api/v1/friend-requests/${requestId}/accept`,
        {
          method: 'POST',
          headers: this.getAuthHeader(),
        }
      );

      if (!response.ok) {
        let message = `Accept failed: ${String(response.status)}`;
        try {
          const errorData = (await response.json()) as { error?: { message?: string } };
          if (errorData.error?.message) {
            message = errorData.error.message;
          }
        } catch {
          // Response wasn't JSON, use default message
        }
        throw new Error(message);
      }

      this.onRequestsChangedEmitter.fire();
    } catch (error) {
      this.logger.error('Failed to accept friend request', error);
      throw error;
    }
  }

  /*** Reject a friend request ***/
  async rejectRequest(requestId: string): Promise<void> {
    try {
      const response = await this.fetchWithTimeout(
        `${this.getServerUrl()}/api/v1/friend-requests/${requestId}/reject`,
        {
          method: 'POST',
          headers: this.getAuthHeader(),
        }
      );

      if (!response.ok) {
        let message = `Reject failed: ${String(response.status)}`;
        try {
          const errorData = (await response.json()) as { error?: { message?: string } };
          if (errorData.error?.message) {
            message = errorData.error.message;
          }
        } catch {
          // Response wasn't JSON, use default message
        }
        throw new Error(message);
      }

      this.onRequestsChangedEmitter.fire();
    } catch (error) {
      this.logger.error('Failed to reject friend request', error);
      throw error;
    }
  }

  /*** Cancel an outgoing friend request ***/
  async cancelRequest(requestId: string): Promise<void> {
    try {
      const response = await this.fetchWithTimeout(
        `${this.getServerUrl()}/api/v1/friend-requests/${requestId}`,
        {
          method: 'DELETE',
          headers: this.getAuthHeader(),
        }
      );

      if (!response.ok && response.status !== 204) {
        let message = `Cancel failed: ${String(response.status)}`;
        try {
          const errorData = (await response.json()) as { error?: { message?: string } };
          if (errorData.error?.message) {
            message = errorData.error.message;
          }
        } catch {
          // Response wasn't JSON, use default message
        }
        throw new Error(message);
      }

      this.onRequestsChangedEmitter.fire();
    } catch (error) {
      this.logger.error('Failed to cancel friend request', error);
      throw error;
    }
  }

  /*** Handle WebSocket message for friend request received ***/
  handleFriendRequestReceived(payload: { request: FriendRequestDTO }): void {
    this.logger.info('Friend request received', { from: payload.request.fromUser.username });
    this.onRequestReceivedEmitter.fire(payload.request);
    this.onRequestsChangedEmitter.fire();

    /* Show VS Code notification */
    const fromName = payload.request.fromUser.displayName ?? payload.request.fromUser.username;
    void vscode.window
      .showInformationMessage(`${fromName} sent you a friend request`, 'Accept', 'View')
      .then((action) => {
        if (action === 'Accept') {
          this.acceptRequest(payload.request.id).catch((error: unknown) => {
            this.logger.error('Failed to accept request from notification', error);
            void vscode.window.showErrorMessage('Failed to accept friend request');
          });
        } else if (action === 'View') {
          void vscode.commands.executeCommand('devradar.focusFriendRequests');
        }
      });
  }

  /*** Handle WebSocket message for friend request accepted ***/
  handleFriendRequestAccepted(payload: { requestId: string; friend: PublicUserDTO }): void {
    this.logger.info('Friend request accepted', { friend: payload.friend.username });
    this.onRequestAcceptedEmitter.fire(payload);
    this.onRequestsChangedEmitter.fire();

    /* Show VS Code notification */
    const friendName = payload.friend.displayName ?? payload.friend.username;
    void vscode.window.showInformationMessage(`${friendName} accepted your friend request! 🎉`);
  }

  /*** Unfriend a user by removing the friendship ***/
  async unfriend(userId: string): Promise<void> {
    try {
      const response = await this.fetchWithTimeout(
        `${this.getServerUrl()}/api/v1/friends/${userId}`,
        {
          method: 'DELETE',
          headers: this.getAuthHeader(),
        }
      );

      if (!response.ok && response.status !== 204) {
        let message = `Unfriend failed: ${String(response.status)}`;
        try {
          const errorData = (await response.json()) as { error?: { message?: string } };
          if (errorData.error?.message) {
            message = errorData.error.message;
          }
        } catch {
          // Response wasn't JSON, use default message
        }
        throw new Error(message);
      }
    } catch (error) {
      this.logger.error('Failed to unfriend user', error);
      throw error;
    }
  }

  dispose(): void {
    for (const disposable of this.disposables) {
      disposable.dispose();
    }
  }
}
