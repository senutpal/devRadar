/**
 * Authentication Service
 *
 * Handles GitHub OAuth flow and token management.
 * Uses VS Code's built-in authentication API for secure token storage.
 */

import * as vscode from 'vscode';

import type { ConfigManager } from '../utils/configManager';
import type { Logger } from '../utils/logger';
import type { UserDTO } from '@devradar/shared';

/**
 * Authentication state.
 */
export interface AuthState {
  isAuthenticated: boolean;
  user: UserDTO | null;
  token: string | null;
}

/**
 * Token storage key in VS Code secrets.
 */
const TOKEN_KEY = 'devradar.accessToken';
const USER_KEY = 'devradar.user';

/**
 * Handles authentication with the DevRadar backend.
 */
export class AuthService implements vscode.Disposable {
  private readonly disposables: vscode.Disposable[] = [];
  private readonly onAuthStateChangeEmitter = new vscode.EventEmitter<boolean>();
  private readonly uriHandler: DevRadarUriHandler;
  private currentUser: UserDTO | null = null;
  private accessToken: string | null = null;

  /**
   * Event that fires when auth state changes.
   */
  readonly onAuthStateChange = this.onAuthStateChangeEmitter.event;

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly configManager: ConfigManager,
    private readonly logger: Logger
  ) {
    this.disposables.push(this.onAuthStateChangeEmitter);

    // Register URI handler once for OAuth callbacks
    this.uriHandler = new DevRadarUriHandler(this.logger);
    this.disposables.push(vscode.window.registerUriHandler(this.uriHandler));

    // Start periodic token validation (every 5 minutes)
    const validationInterval = setInterval(
      () => {
        void this.revalidateSession();
      },
      5 * 60 * 1000
    );
    this.disposables.push({
      dispose: () => {
        clearInterval(validationInterval);
      },
    });
  }

  /**
   * Revalidates the current session.
   */
  private async revalidateSession(): Promise<void> {
    if (!this.accessToken) return;

    const isValid = await this.validateToken(this.accessToken);
    if (!isValid) {
      this.logger.warn('Token expired or invalidated during background check');
      await this.logout();
    }
  }

  /**
   * Checks if user is authenticated.
   */
  async isAuthenticated(): Promise<boolean> {
    if (this.accessToken) {
      // Validate in background if enough time has passed (e.g. 5 minutes)
      // For now, we'll optimistically return true but verify in background
      // If invalid, it will trigger logout which fires the event
      // To strictly enforce validation on every check would add latency

      // Simple expiration check could be added here if we had the expiry time
      return true;
    }

    // Try to restore from secrets
    const token = await this.context.secrets.get(TOKEN_KEY);
    if (token) {
      this.accessToken = token;

      // Restore user info
      const userJson = this.context.globalState.get<string>(USER_KEY);
      if (userJson) {
        try {
          this.currentUser = JSON.parse(userJson) as UserDTO;
        } catch {
          this.logger.warn('Failed to parse stored user');
        }
      }

      // Validate token with server
      const isValid = await this.validateToken(token);
      if (!isValid) {
        await this.clearAuth();
        return false;
      }

      return true;
    }

    return false;
  }

  /**
   * Gets the current user.
   */
  getUser(): UserDTO | null {
    return this.currentUser;
  }

  /**
   * Gets the access token.
   */
  getToken(): string | null {
    return this.accessToken;
  }

  /**
   * Initiates the GitHub OAuth login flow.
   */
  async login(): Promise<boolean> {
    try {
      this.logger.info('Starting GitHub OAuth flow...');

      const serverUrl = this.configManager.get('serverUrl');
      const callbackUri = await vscode.env.asExternalUri(
        vscode.Uri.parse(`${vscode.env.uriScheme}://devradar.devradar/auth/callback`)
      );

      // Open browser for OAuth
      const authUrl = `${serverUrl}/auth/github?redirect_uri=${encodeURIComponent(callbackUri.toString())}`;

      await vscode.env.openExternal(vscode.Uri.parse(authUrl));

      // Wait for callback with token
      const result = await this.uriHandler.waitForCallback(60_000); // 60 second timeout

      if (!result.success || !result.token) {
        this.logger.error('OAuth callback failed', result.error);
        return false;
      }

      // Store token securely
      await this.context.secrets.store(TOKEN_KEY, result.token);
      this.accessToken = result.token;

      // Fetch user profile
      await this.fetchUserProfile();

      this.logger.info('Login successful');
      this.onAuthStateChangeEmitter.fire(true);

      return true;
    } catch (error) {
      this.logger.error('Login failed', error);
      throw error;
    }
  }

  /**
   * Logs out the current user.
   */
  async logout(): Promise<void> {
    this.logger.info('Logging out...');

    try {
      // Notify server (optional, fire and forget)
      const serverUrl = this.configManager.get('serverUrl');
      if (this.accessToken) {
        void fetch(`${serverUrl}/auth/logout`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
        }).catch(() => {
          // Ignore errors
        });
      }
    } finally {
      await this.clearAuth();
      this.onAuthStateChangeEmitter.fire(false);
    }
  }

  /**
   * Validates a token with the server.
   */
  private async validateToken(token: string): Promise<boolean> {
    try {
      const serverUrl = this.configManager.get('serverUrl');
      const response = await fetch(`${serverUrl}/api/v1/users/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const user = (await response.json()) as UserDTO;
        this.currentUser = user;
        await this.context.globalState.update(USER_KEY, JSON.stringify(user));
        return true;
      }

      return false;
    } catch (error) {
      this.logger.warn('Token validation failed', error);
      return false;
    }
  }

  /**
   * Fetches the user profile from the server.
   */
  private async fetchUserProfile(): Promise<void> {
    try {
      const serverUrl = this.configManager.get('serverUrl');
      const response = await fetch(`${serverUrl}/api/v1/users/me`, {
        headers: {
          Authorization: `Bearer ${this.accessToken ?? ''}`,
        },
      });

      if (response.ok) {
        const user = (await response.json()) as UserDTO;
        this.currentUser = user;
        await this.context.globalState.update(USER_KEY, JSON.stringify(user));
      } else {
        throw new Error(`Failed to fetch user profile: ${String(response.status)}`);
      }
    } catch (error) {
      this.logger.error('Failed to fetch user profile', error);
      throw error;
    }
  }

  /**
   * Clears all auth state.
   */
  private async clearAuth(): Promise<void> {
    this.accessToken = null;
    this.currentUser = null;
    await this.context.secrets.delete(TOKEN_KEY);
    await this.context.globalState.update(USER_KEY, undefined);
  }

  dispose(): void {
    for (const disposable of this.disposables) {
      disposable.dispose();
    }
  }
}

/**
 * URI Handler for OAuth callback.
 */
class DevRadarUriHandler implements vscode.UriHandler {
  private callbackResolve:
    | ((result: { success: boolean; token?: string; error?: string }) => void)
    | null = null;
  private callbackTimeout: NodeJS.Timeout | null = null;

  constructor(private readonly logger: Logger) {}

  /**
   * Handles incoming URI from OAuth callback.
   */
  handleUri(uri: vscode.Uri): vscode.ProviderResult<void> {
    this.logger.info('Received callback URI', {
      path: uri.path,
      query: uri.query,
      scheme: uri.scheme,
      authority: uri.authority,
    });

    // Check if this is an auth callback (handle both /auth/callback and variations)
    if (uri.path.includes('auth/callback') || uri.path.includes('callback')) {
      const params = new URLSearchParams(uri.query);
      const token = params.get('token');
      const error = params.get('error');

      this.logger.debug('Processing auth callback', { hasToken: !!token, hasError: !!error });

      if (this.callbackResolve) {
        if (this.callbackTimeout) {
          clearTimeout(this.callbackTimeout);
        }

        if (token) {
          this.logger.info('Token received, completing login');
          this.callbackResolve({ success: true, token });
        } else {
          this.logger.warn('No token in callback', { error });
          this.callbackResolve({
            success: false,
            error: error ?? 'Unknown error',
          });
        }
        this.callbackResolve = null;
      } else {
        this.logger.warn('Received callback but no resolver waiting');
      }
    } else {
      this.logger.debug('Ignoring non-auth URI', { path: uri.path });
    }
  }

  /**
   * Waits for the OAuth callback with timeout.
   */
  waitForCallback(
    timeoutMs: number
  ): Promise<{ success: boolean; token?: string; error?: string }> {
    return new Promise((resolve) => {
      this.callbackResolve = resolve;

      this.callbackTimeout = setTimeout(() => {
        if (this.callbackResolve) {
          this.callbackResolve({ success: false, error: 'Timeout waiting for callback' });
          this.callbackResolve = null;
        }
      }, timeoutMs);
    });
  }
}
