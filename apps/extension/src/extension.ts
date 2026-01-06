/**
 * DevRadar VS Code Extension
 *
 * Main entry point for the extension. Handles activation, deactivation,
 * and orchestrates all services.
 */

import * as vscode from 'vscode';

import { ActivityTracker } from './services/activityTracker';
import { AuthService } from './services/authService';
import { WebSocketClient } from './services/wsClient';
import { ConfigManager } from './utils/configManager';
import { Logger } from './utils/logger';
import { ActivityProvider } from './views/activityProvider';
import { FriendsProvider } from './views/friendsProvider';
import { StatusBarManager } from './views/statusBarItem';

import type { UserStatusType } from '@devradar/shared';

/**
 * Extension context manager that coordinates all services.
 */
class DevRadarExtension implements vscode.Disposable {
  private readonly disposables: vscode.Disposable[] = [];
  private readonly logger: Logger;
  private readonly configManager: ConfigManager;
  private readonly authService: AuthService;
  private readonly wsClient: WebSocketClient;
  private readonly activityTracker: ActivityTracker;
  private readonly friendsProvider: FriendsProvider;
  private readonly activityProvider: ActivityProvider;
  private readonly statusBar: StatusBarManager;

  constructor(context: vscode.ExtensionContext) {
    this.logger = new Logger('DevRadar');
    this.configManager = new ConfigManager();

    // Initialize services
    this.authService = new AuthService(context, this.configManager, this.logger);
    this.wsClient = new WebSocketClient(this.authService, this.configManager, this.logger);
    this.activityTracker = new ActivityTracker(this.wsClient, this.configManager, this.logger);

    // Initialize views
    this.friendsProvider = new FriendsProvider(this.logger);
    this.activityProvider = new ActivityProvider(this.wsClient, this.logger);
    this.statusBar = new StatusBarManager(this.wsClient, this.authService, this.logger);

    // Track disposables
    this.disposables.push(
      this.authService,
      this.wsClient,
      this.activityTracker,
      this.friendsProvider,
      this.activityProvider,
      this.statusBar,
      this.configManager
    );
  }

  /**
   * Activates the extension and registers all commands/views.
   */
  async activate(): Promise<void> {
    this.logger.info('Activating DevRadar extension...');

    try {
      // Register tree views
      this.registerTreeViews();

      // Register commands
      this.registerCommands();

      // Setup event listeners
      this.setupEventListeners();

      // Initialize auth and connect if logged in
      await this.initializeConnection();

      this.logger.info('DevRadar extension activated successfully');
    } catch (error) {
      this.logger.error('Failed to activate extension', error);
      void vscode.window.showErrorMessage('DevRadar: Failed to activate extension');
    }
  }

  /**
   * Registers tree view providers for sidebar.
   */
  private registerTreeViews(): void {
    this.disposables.push(
      vscode.window.registerTreeDataProvider('devradar.friends', this.friendsProvider),
      vscode.window.registerTreeDataProvider('devradar.activity', this.activityProvider)
    );
  }

  /**
   * Registers all extension commands.
   */
  private registerCommands(): void {
    const commands: { id: string; handler: (...args: unknown[]) => unknown }[] = [
      {
        id: 'devradar.login',
        handler: () => this.handleLogin(),
      },
      {
        id: 'devradar.logout',
        handler: () => this.handleLogout(),
      },
      {
        id: 'devradar.togglePrivacy',
        handler: () => this.handleTogglePrivacy(),
      },
      {
        id: 'devradar.poke',
        handler: (item: unknown) => this.handlePoke(item),
      },
      {
        id: 'devradar.refreshFriends',
        handler: () => {
          this.handleRefreshFriends();
        },
      },
      {
        id: 'devradar.viewProfile',
        handler: (item: unknown) => {
          this.handleViewProfile(item);
        },
      },
      {
        id: 'devradar.setStatus',
        handler: () => this.handleSetStatus(),
      },
    ];

    for (const command of commands) {
      this.disposables.push(vscode.commands.registerCommand(command.id, command.handler));
    }
  }

  /**
   * Sets up event listeners for configuration changes and auth events.
   */
  private setupEventListeners(): void {
    // Listen for configuration changes
    this.disposables.push(
      vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration('devradar')) {
          this.configManager.reload();
          this.handleConfigChange();
        }
      })
    );

    // Listen for auth state changes
    this.authService.onAuthStateChange((isAuthenticated) => {
      // Update VS Code context for viewsWelcome visibility
      void vscode.commands.executeCommand(
        'setContext',
        'devradar.isAuthenticated',
        isAuthenticated
      );

      if (isAuthenticated) {
        this.wsClient.connect();
        this.activityTracker.start();
      } else {
        this.wsClient.disconnect();
        this.activityTracker.stop();
      }
      this.friendsProvider.refresh();
      void this.statusBar.update();
    });

    // Listen for WebSocket messages
    this.wsClient.onMessage((message) => {
      switch (message.type) {
        case 'FRIEND_STATUS':
          this.friendsProvider.handleFriendStatus(message.payload);
          break;
        case 'POKE':
          this.handlePokeReceived(message.payload);
          break;
        case 'CONFLICT_ALERT':
          this.handleConflictAlert(message.payload);
          break;
        case 'ACHIEVEMENT':
          this.handleAchievement(message.payload);
          break;
        case 'ERROR':
          this.handleServerError(message.payload);
          break;
      }
    });

    // Listen for connection state changes
    this.wsClient.onConnectionStateChange((state) => {
      this.statusBar.setConnectionState(state);
    });
  }

  /**
   * Initializes the connection if user is already authenticated.
   */
  private async initializeConnection(): Promise<void> {
    const isAuthenticated = await this.authService.isAuthenticated();

    // Set initial VS Code context for viewsWelcome visibility
    void vscode.commands.executeCommand('setContext', 'devradar.isAuthenticated', isAuthenticated);

    if (isAuthenticated) {
      this.logger.info('User is authenticated, connecting...');
      this.wsClient.connect();
      this.activityTracker.start();
    } else {
      this.logger.info('User is not authenticated');
    }

    void this.statusBar.update();
    this.friendsProvider.refresh();
  }

  /**
   * Handles the login command.
   */
  private async handleLogin(): Promise<void> {
    try {
      this.logger.info('Starting login flow...');
      const success = await this.authService.login();

      if (success) {
        void vscode.window.showInformationMessage('DevRadar: Successfully logged in!');
      }
    } catch (error) {
      this.logger.error('Login failed', error);
      void vscode.window.showErrorMessage('DevRadar: Login failed. Please try again.');
    }
  }

  /**
   * Handles the logout command.
   */
  private async handleLogout(): Promise<void> {
    try {
      await this.authService.logout();
      void vscode.window.showInformationMessage('DevRadar: Logged out successfully');
    } catch (error) {
      this.logger.error('Logout failed', error);
    }
  }

  /**
   * Handles toggling privacy mode.
   */
  private async handleTogglePrivacy(): Promise<void> {
    const currentMode = this.configManager.get('privacyMode');
    const newMode = !currentMode;

    await this.configManager.update('privacyMode', newMode);

    const message = newMode
      ? 'DevRadar: Privacy mode enabled - your activity is now hidden'
      : 'DevRadar: Privacy mode disabled - your activity is now visible';

    void vscode.window.showInformationMessage(message);

    // Send update to server
    this.activityTracker.sendStatusUpdate();
  }

  /**
   * Type guard for friend item.
   */
  private isFriendItem(item: unknown): item is { userId: string; username?: string } {
    return (
      typeof item === 'object' &&
      item !== null &&
      'userId' in item &&
      typeof (item as { userId: unknown }).userId === 'string'
    );
  }

  /**
   * Handles the poke command for a friend.
   */
  private async handlePoke(item: unknown): Promise<void> {
    if (this.isFriendItem(item)) {
      await this.sendPoke(item.userId);
    } else {
      // Show quick pick to select friend
      const friends = this.friendsProvider.getOnlineFriends();
      if (friends.length === 0) {
        void vscode.window.showInformationMessage('DevRadar: No friends online to poke');
        return;
      }

      const selected = await vscode.window.showQuickPick(
        friends.map((f) => ({
          label: f.displayName ?? f.username,
          description: `@${f.username}`,
          userId: f.id,
        })),
        { placeHolder: 'Select a friend to poke' }
      );

      if (selected) {
        await this.sendPoke(selected.userId);
      }
    }
  }

  /**
   * Sends a poke to a specific user.
   */
  private async sendPoke(userId: string): Promise<void> {
    const message = await vscode.window.showInputBox({
      prompt: 'Optional message with your poke (max 500 chars)',
      placeHolder: 'Hey! 👋',
      validateInput: (value) => {
        if (value.length > 500) {
          return 'Message too long (max 500 characters)';
        }
        return null;
      },
    });

    if (message === undefined) {
      return; // User cancelled
    }

    const trimmedMessage = message.trim();
    // Sanitize: strip control characters and angle brackets (poke messages are plain text)
    /* eslint-disable no-control-regex */
    const sanitizedMessage = trimmedMessage
      .replace(/[\u0000-\u001f\u007f-\u009f]/g, '') // Remove control chars
      .replace(/[<>]/g, ''); // Remove angle brackets to prevent HTML injection
    /* eslint-enable no-control-regex */

    this.wsClient.sendPoke(userId, sanitizedMessage);
    void vscode.window.showInformationMessage('DevRadar: Poke sent! 👋');
  }

  /**
   * Handles refreshing the friends list.
   */
  private handleRefreshFriends(): void {
    this.friendsProvider.refresh();
  }

  /**
   * Handles viewing a friend's profile.
   */
  private handleViewProfile(item: unknown): void {
    if (item && typeof item === 'object' && 'userId' in item) {
      const friendItem = item as { userId: string; username?: string };

      if (friendItem.username) {
        const url = `https://github.com/${friendItem.username}`;
        void vscode.env.openExternal(vscode.Uri.parse(url));
      }
    }
  }

  /**
   * Handles setting the user's status.
   */
  private async handleSetStatus(): Promise<void> {
    const statuses: { label: string; value: UserStatusType; icon: string }[] = [
      { label: 'Online', value: 'online', icon: '🟢' },
      { label: 'Idle', value: 'idle', icon: '🟡' },
      { label: 'Do Not Disturb', value: 'dnd', icon: '🔴' },
      { label: 'Offline (Invisible)', value: 'offline', icon: '⚫' },
    ];

    const selected = await vscode.window.showQuickPick(
      statuses.map((s) => ({
        label: `${s.icon} ${s.label}`,
        value: s.value,
      })),
      { placeHolder: 'Select your status' }
    );

    if (selected) {
      this.activityTracker.setManualStatus(selected.value);
      void vscode.window.showInformationMessage(`DevRadar: Status set to ${selected.label}`);
    }
  }

  /**
   * Handles configuration changes.
   */
  private handleConfigChange(): void {
    this.logger.debug('Configuration changed, updating services...');
    this.activityTracker.reconfigure();
    void this.statusBar.update();
  }

  /**
   * Handles receiving a poke from another user.
   */
  private handlePokeReceived(payload: unknown): void {
    if (!this.configManager.get('enableNotifications')) {
      return;
    }

    if (typeof payload === 'object' && payload !== null && 'fromUserId' in payload) {
      const poke = payload as { fromUserId: string; fromUsername?: string; message?: string };
      const from = poke.fromUsername ?? poke.fromUserId;
      const message = poke.message ? `: "${poke.message}"` : '';

      void vscode.window
        .showInformationMessage(`DevRadar: ${from} poked you${message} 👋`, 'Poke Back')
        .then((action) => {
          if (action === 'Poke Back') {
            void this.sendPoke(poke.fromUserId);
          }
        });
    }
  }

  /**
   * Handles conflict alert from server.
   */
  private handleConflictAlert(payload: unknown): void {
    if (!this.configManager.get('enableNotifications')) {
      return;
    }

    if (typeof payload === 'object' && payload !== null && 'editors' in payload) {
      const alert = payload as { fileHash: string; editors: string[] };
      const editorCount = alert.editors.length;

      void vscode.window.showWarningMessage(
        `DevRadar: ⚠️ ${String(editorCount)} people are editing the same file!`,
        'View Details'
      );
    }
  }

  /**
   * Handles achievement notification.
   */
  private handleAchievement(payload: unknown): void {
    if (!this.configManager.get('enableNotifications')) {
      return;
    }

    if (typeof payload === 'object' && payload !== null && 'title' in payload) {
      const achievement = payload as { title: string; description?: string };

      void vscode.window.showInformationMessage(
        `DevRadar: 🏆 Achievement Unlocked - ${achievement.title}!`
      );
    }
  }

  /**
   * Handles server errors.
   */
  private handleServerError(payload: unknown): void {
    if (typeof payload === 'object' && payload !== null && 'message' in payload) {
      const error = payload as { message: string; code?: string };
      this.logger.error('Server error', error);
    }
  }

  /**
   * Disposes all resources.
   */
  dispose(): void {
    this.logger.info('Disposing DevRadar extension...');

    for (const disposable of this.disposables) {
      disposable.dispose();
    }
  }
}

// Singleton instance
let extension: DevRadarExtension | undefined;

/**
 * Extension activation entry point.
 */
export async function activate(context: vscode.ExtensionContext): Promise<void> {
  extension = new DevRadarExtension(context);
  context.subscriptions.push(extension);
  await extension.activate();
}

/**
 * Extension deactivation entry point.
 */
export function deactivate(): void {
  extension?.dispose();
  extension = undefined;
  Logger.disposeShared();
}
