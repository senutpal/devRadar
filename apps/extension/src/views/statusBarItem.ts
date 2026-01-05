/**
 * Status Bar Manager
 *
 * Manages the DevRadar status bar item showing connection state and user status.
 */

import * as vscode from 'vscode';

import type { AuthService } from '../services/authService';
import type { WebSocketClient, ConnectionState } from '../services/wsClient';
import type { Logger } from '../utils/logger';

/**
 * Status bar item manager.
 */
export class StatusBarManager implements vscode.Disposable {
  private readonly statusBarItem: vscode.StatusBarItem;
  private connectionState: ConnectionState = 'disconnected';
  private isAuthenticated = false;

  constructor(
    _wsClient: WebSocketClient,
    private readonly authService: AuthService,
    _logger: Logger
  ) {
    // Reserved for future use
    void _wsClient;
    void _logger;
    // Create status bar item with high priority (shown on the left)
    this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);

    this.statusBarItem.command = 'devradar.setStatus';
    void this.update();
    this.statusBarItem.show();
  }

  /**
   * Sets the connection state and updates display.
   */
  setConnectionState(state: ConnectionState): void {
    this.connectionState = state;
    void this.update();
  }

  /**
   * Updates the status bar item.
   */
  async update(): Promise<void> {
    this.isAuthenticated = await this.authService.isAuthenticated();
    this.render();
  }

  /**
   * Renders the status bar item based on current state.
   */
  private render(): void {
    if (!this.isAuthenticated) {
      this.statusBarItem.text = '$(broadcast) DevRadar';
      this.statusBarItem.tooltip = 'DevRadar: Click to login';
      this.statusBarItem.command = 'devradar.login';
      this.statusBarItem.backgroundColor = undefined;
      return;
    }

    // Build status based on connection state
    const user = this.authService.getUser();
    const username = user?.displayName ?? user?.username ?? 'User';

    switch (this.connectionState) {
      case 'connected':
        this.statusBarItem.text = `$(broadcast) ${username}`;
        this.statusBarItem.tooltip = this.buildConnectedTooltip(username);
        this.statusBarItem.backgroundColor = undefined;
        break;

      case 'connecting':
        this.statusBarItem.text = '$(sync~spin) Connecting...';
        this.statusBarItem.tooltip = 'DevRadar: Connecting to server...';
        this.statusBarItem.backgroundColor = undefined;
        break;

      case 'reconnecting':
        this.statusBarItem.text = '$(sync~spin) Reconnecting...';
        this.statusBarItem.tooltip = 'DevRadar: Reconnecting to server...';
        this.statusBarItem.backgroundColor = new vscode.ThemeColor(
          'statusBarItem.warningBackground'
        );
        break;

      case 'disconnected':
      default:
        this.statusBarItem.text = '$(circle-slash) Disconnected';
        this.statusBarItem.tooltip = 'DevRadar: Not connected to server';
        this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
        break;
    }
  }

  /**
   * Builds the tooltip for connected state.
   */
  private buildConnectedTooltip(username: string): vscode.MarkdownString {
    const md = new vscode.MarkdownString();
    md.isTrusted = true;
    md.supportHtml = true;

    md.appendMarkdown(`### DevRadar - ${username}\n\n`);
    md.appendMarkdown(`🟢 **Connected**\n\n`);
    md.appendMarkdown(`---\n\n`);
    md.appendMarkdown(`Click to change your status\n\n`);
    md.appendMarkdown(
      `[Toggle Privacy](command:devradar.togglePrivacy) | [Logout](command:devradar.logout)`
    );

    return md;
  }

  /**
   * Shows the status bar item.
   */
  show(): void {
    this.statusBarItem.show();
  }

  /**
   * Hides the status bar item.
   */
  hide(): void {
    this.statusBarItem.hide();
  }

  dispose(): void {
    this.statusBarItem.dispose();
  }
}
