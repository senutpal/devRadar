/*** Activity Tree View Provider
 *
 * Displays recent activity and achievements in the sidebar ***/

import * as vscode from 'vscode';

import type { WebSocketClient } from '../services/wsClient';
import type { Logger } from '../utils/logger';

/*** Activity event type ***/
export interface ActivityEvent {
  id: string;
  type: 'friend_online' | 'friend_offline' | 'poke' | 'achievement' | 'conflict';
  title: string;
  description: string;
  timestamp: number;
  userId?: string;
  username?: string;
}

/*** Tree item representing an activity event ***/
class ActivityTreeItem extends vscode.TreeItem {
  constructor(public readonly activity: ActivityEvent) {
    super(activity.title, vscode.TreeItemCollapsibleState.None);

    this.id = `activity-${activity.id}`;
    this.description = this.formatTime(activity.timestamp);
    this.tooltip = activity.description;
    this.iconPath = this.getIcon();
    this.contextValue = `activity-${activity.type}`;
  }

  /*** Gets the appropriate icon for the activity type ***/
  private getIcon(): vscode.ThemeIcon {
    switch (this.activity.type) {
      case 'friend_online':
        return new vscode.ThemeIcon('person', new vscode.ThemeColor('testing.iconPassed'));
      case 'friend_offline':
        return new vscode.ThemeIcon('person', new vscode.ThemeColor('disabledForeground'));
      case 'poke':
        return new vscode.ThemeIcon('bell', new vscode.ThemeColor('list.warningForeground'));
      case 'achievement':
        return new vscode.ThemeIcon('star-full', new vscode.ThemeColor('list.highlightForeground'));
      case 'conflict':
        return new vscode.ThemeIcon('warning', new vscode.ThemeColor('testing.iconFailed'));
      default:
        return new vscode.ThemeIcon('info');
    }
  }

  /*** Formats timestamp to relative time ***/
  private formatTime(timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (seconds < 60) {
      return 'just now';
    }
    if (minutes < 60) {
      return `${String(minutes)}m ago`;
    }
    if (hours < 24) {
      return `${String(hours)}h ago`;
    }

    /*** Format as date ***/
    const date = new Date(timestamp);
    return date.toLocaleDateString();
  }
}

/*** Activity tree data provider ***/
export class ActivityProvider
  implements vscode.TreeDataProvider<ActivityTreeItem>, vscode.Disposable
{
  private readonly disposables: vscode.Disposable[] = [];
  private readonly onDidChangeTreeDataEmitter = new vscode.EventEmitter<
    ActivityTreeItem | undefined
  >();
  private activities: ActivityEvent[] = [];
  private readonly maxActivities = 50;

  readonly onDidChangeTreeData = this.onDidChangeTreeDataEmitter.event;

  constructor(wsClient: WebSocketClient, _logger: Logger) {
    /* _logger reserved for future use */
    void _logger;
    this.disposables.push(this.onDidChangeTreeDataEmitter);

    /* Listen for WebSocket messages */
    this.disposables.push(
      wsClient.onMessage((message) => {
        this.handleMessage(message);
      })
    );
  }

  /*** Gets tree item for element ***/
  getTreeItem(element: ActivityTreeItem): vscode.TreeItem {
    return element;
  }

  /*** Gets children for element ***/
  getChildren(element?: ActivityTreeItem): ActivityTreeItem[] {
    /* Only root level has children */
    if (element) {
      return [];
    }

    return this.activities
      .sort((a, b) => b.timestamp - a.timestamp)
      .map((activity) => new ActivityTreeItem(activity));
  }

  /*** Handles incoming WebSocket messages ***/
  private handleMessage(message: { type: string; payload: unknown }): void {
    let activity: ActivityEvent | null = null;

    switch (message.type) {
      case 'FRIEND_STATUS':
        activity = this.createFriendStatusActivity(message.payload);
        break;
      case 'POKE':
        activity = this.createPokeActivity(message.payload);
        break;
      case 'ACHIEVEMENT':
        activity = this.createAchievementActivity(message.payload);
        break;
      case 'CONFLICT_ALERT':
        activity = this.createConflictActivity(message.payload);
        break;
    }

    if (activity) {
      this.addActivity(activity);
    }
  }

  /*** Creates activity for friend status change ***/
  private createFriendStatusActivity(payload: unknown): ActivityEvent | null {
    if (typeof payload !== 'object' || payload === null) {
      return null;
    }

    /* Safer casing and checking */
    const p = payload as Record<string, unknown>;
    if (typeof p.userId !== 'string' || typeof p.status !== 'string') {
      return null;
    }

    const userId = p.userId;
    const status = p.status;
    const username = typeof p.username === 'string' ? p.username : userId;

    /* Only show online/offline transitions */
    if (status !== 'online' && status !== 'offline') {
      return null;
    }

    const isOnline = status === 'online';

    const event: ActivityEvent = {
      id: `status-${userId}-${String(Date.now())}`,
      type: isOnline ? 'friend_online' : 'friend_offline',
      title: `${username} is now ${isOnline ? 'online' : 'offline'}`,
      description: isOnline ? 'Started coding' : 'Went offline',
      timestamp: Date.now(),
      userId: userId,
    };

    if (typeof p.username === 'string') {
      event.username = p.username;
    }
    return event;
  }

  /*** Creates activity for poke ***/
  private createPokeActivity(payload: unknown): ActivityEvent | null {
    if (typeof payload !== 'object' || payload === null) {
      return null;
    }

    const p = payload as Record<string, unknown>;

    if (typeof p.fromUserId !== 'string') {
      return null;
    }

    const fromUserId = p.fromUserId;
    const fromUsername = typeof p.fromUsername === 'string' ? p.fromUsername : undefined;
    const message = typeof p.message === 'string' ? p.message : undefined;

    const from = fromUsername ?? fromUserId;

    const event: ActivityEvent = {
      id: `poke-${fromUserId}-${String(Date.now())}`,
      type: 'poke',
      title: `${from} poked you! 👋`,
      description: message ?? 'No message',
      timestamp: Date.now(),
      userId: fromUserId,
    };

    if (fromUsername) {
      event.username = fromUsername;
    }
    return event;
  }

  /*** Creates activity for achievement ***/
  private createAchievementActivity(payload: unknown): ActivityEvent | null {
    if (typeof payload !== 'object' || payload === null) {
      return null;
    }

    const achievement = payload as { title: string; description?: string };

    return {
      id: `achievement-${String(Date.now())}`,
      type: 'achievement',
      title: `🏆 ${achievement.title}`,
      description: achievement.description ?? 'Achievement unlocked!',
      timestamp: Date.now(),
    };
  }

  /*** Creates activity for conflict alert ***/
  private createConflictActivity(payload: unknown): ActivityEvent | null {
    if (typeof payload !== 'object' || payload === null) {
      return null;
    }

    const conflict = payload as { fileHash: string; editors: string[] };

    return {
      id: `conflict-${conflict.fileHash}-${String(Date.now())}`,
      type: 'conflict',
      title: `⚠️ File conflict detected`,
      description: `${String(conflict.editors.length)} people editing the same file`,
      timestamp: Date.now(),
    };
  }

  /*** Adds an activity to the list ***/
  private addActivity(activity: ActivityEvent): void {
    this.activities.unshift(activity);

    /* Keep only the most recent activities */
    if (this.activities.length > this.maxActivities) {
      this.activities = this.activities.slice(0, this.maxActivities);
    }

    this.onDidChangeTreeDataEmitter.fire(undefined);
  }

  /*** Clears all activities ***/
  clear(): void {
    this.activities = [];
    this.onDidChangeTreeDataEmitter.fire(undefined);
  }

  /*** Refreshes the tree view ***/
  refresh(): void {
    this.onDidChangeTreeDataEmitter.fire(undefined);
  }

  dispose(): void {
    for (const disposable of this.disposables) {
      disposable.dispose();
    }
  }
}
