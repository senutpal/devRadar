/**
 * Friends Tree View Provider
 *
 * Displays the friends list in the sidebar with real-time status updates
 */

import * as vscode from 'vscode';

import type { Logger } from '../utils/logger';
import type { ActivityPayload, UserDTO, UserStatus, UserStatusType } from '@devradar/shared';

/*** Friend item with status information*/
export interface FriendInfo {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  status: UserStatusType;
  activity:
    | {
        fileName?: string;
        language?: string;
        project?: string;
        sessionDuration?: number;
      }
    | undefined;
  lastUpdated: number;
}

/*** Tree item representing a friend. ***/
class FriendTreeItem extends vscode.TreeItem {
  constructor(public readonly friend: FriendInfo) {
    super(friend.displayName ?? friend.username, vscode.TreeItemCollapsibleState.None);

    this.id = `friend-${friend.id}`;
    this.contextValue = `friend-${friend.status}`;
    this.tooltip = this.buildTooltip();
    this.description = this.buildDescription();
    this.iconPath = this.getStatusIcon();
    /* Custom command for clicking */
    this.command = {
      command: 'devradar.viewProfile',
      title: 'View Profile',
      arguments: [{ userId: friend.id, username: friend.username }],
    };
  }

  /*** Builds the tooltip text ***/
  private buildTooltip(): vscode.MarkdownString {
    const md = new vscode.MarkdownString();
    md.isTrusted = true;

    md.appendMarkdown(`### ${this.friend.displayName ?? this.friend.username}\n\n`);
    md.appendMarkdown(`**@${this.friend.username}**\n\n`);
    md.appendMarkdown(`Status: ${this.getStatusEmoji()} ${this.getStatusText()}\n\n`);

    if (this.friend.activity) {
      const { fileName, language, project, sessionDuration } = this.friend.activity;

      if (fileName) {
        md.appendMarkdown(`📄 **File:** ${fileName}\n\n`);
      }
      if (language) {
        md.appendMarkdown(`💻 **Language:** ${language}\n\n`);
      }
      if (project) {
        md.appendMarkdown(`📁 **Project:** ${project}\n\n`);
      }
      if (sessionDuration !== undefined) {
        md.appendMarkdown(`⏱️ **Session:** ${this.formatDuration(sessionDuration)}\n\n`);
      }
    }

    return md;
  }

  /*** Builds the description (shown next to the label) ***/
  private buildDescription(): string {
    if (this.friend.status === 'offline') {
      return 'Offline';
    }

    const parts: string[] = [];

    if (this.friend.activity) {
      if (this.friend.activity.language) {
        parts.push(this.friend.activity.language);
      }
      if (this.friend.activity.fileName) {
        parts.push(`in ${this.friend.activity.fileName}`);
      }
    }

    if (parts.length === 0) {
      return this.getStatusText();
    }

    return parts.join(' ');
  }

  /*** Gets the status icon ***/
  private getStatusIcon(): vscode.ThemeIcon {
    switch (this.friend.status) {
      case 'online':
        return new vscode.ThemeIcon('circle-filled', new vscode.ThemeColor('testing.iconPassed'));
      case 'idle':
        return new vscode.ThemeIcon(
          'circle-filled',
          new vscode.ThemeColor('list.warningForeground')
        );
      case 'dnd':
        return new vscode.ThemeIcon('circle-filled', new vscode.ThemeColor('testing.iconFailed'));
      case 'offline':
      default:
        return new vscode.ThemeIcon('circle-outline', new vscode.ThemeColor('disabledForeground'));
    }
  }

  /*** Gets the status emoji ***/
  private getStatusEmoji(): string {
    switch (this.friend.status) {
      case 'online':
        return '🟢';
      case 'idle':
        return '🟡';
      case 'dnd':
        return '🔴';
      case 'offline':
      default:
        return '⚫';
    }
  }

  /*** Gets the status text ***/
  private getStatusText(): string {
    switch (this.friend.status) {
      case 'online':
        return 'Online';
      case 'idle':
        return 'Idle';
      case 'dnd':
        return 'Do Not Disturb';
      case 'offline':
      default:
        return 'Offline';
    }
  }

  /*** Formats duration in seconds to human-readable string ***/
  private formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${String(hours)}h ${String(minutes)}m`;
    }
    return `${String(minutes)}m`;
  }
}

/*** Group header for organizing friends by status ***/
class GroupTreeItem extends vscode.TreeItem {
  constructor(
    public readonly statusGroup: UserStatusType | 'all',
    public readonly count: number
  ) {
    const label = GroupTreeItem.getGroupLabel(statusGroup);
    super(label, vscode.TreeItemCollapsibleState.Expanded);

    this.id = `group-${statusGroup}`;
    this.description = String(count);
    this.contextValue = 'group';
  }

  private static getGroupLabel(status: UserStatusType | 'all'): string {
    switch (status) {
      case 'online':
        return '🟢 Online';
      case 'idle':
        return '🟡 Idle';
      case 'dnd':
        return '🔴 Do Not Disturb';
      case 'offline':
        return '⚫ Offline';
      case 'all':
        return 'All Friends';
    }
  }
}

/*** Friends tree data provider ***/
export class FriendsProvider
  implements vscode.TreeDataProvider<FriendTreeItem | GroupTreeItem>, vscode.Disposable
{
  private readonly disposables: vscode.Disposable[] = [];
  private readonly onDidChangeTreeDataEmitter = new vscode.EventEmitter<
    FriendTreeItem | GroupTreeItem | undefined
  >();
  private friends = new Map<string, FriendInfo>();

  readonly onDidChangeTreeData = this.onDidChangeTreeDataEmitter.event;

  constructor(private readonly logger: Logger) {
    this.disposables.push(this.onDidChangeTreeDataEmitter);
  }

  /*** Returns a tree item for the given element ***/
  getTreeItem(element: FriendTreeItem | GroupTreeItem): vscode.TreeItem {
    return element;
  }

  /*** Returns children for the given element or root elements if no element is provided ***/
  getChildren(element?: FriendTreeItem | GroupTreeItem): (FriendTreeItem | GroupTreeItem)[] {
    if (element instanceof GroupTreeItem) {
      /* Return friends filtered by the group's status */
      const statusGroup = element.statusGroup;
      const friendsList = Array.from(this.friends.values());

      if (statusGroup === 'all') {
        return friendsList.map((friend) => new FriendTreeItem(friend));
      }

      return friendsList
        .filter((friend) => friend.status === statusGroup)
        .map((friend) => new FriendTreeItem(friend));
    }
    /* Root level: return groups with counts */
    const friendsList = Array.from(this.friends.values());
    const groups: GroupTreeItem[] = [];

    const onlineCount = friendsList.filter((f) => f.status === 'online').length;
    const idleCount = friendsList.filter((f) => f.status === 'idle').length;
    const dndCount = friendsList.filter((f) => f.status === 'dnd').length;
    const offlineCount = friendsList.filter((f) => f.status === 'offline').length;

    if (onlineCount > 0) groups.push(new GroupTreeItem('online', onlineCount));
    if (idleCount > 0) groups.push(new GroupTreeItem('idle', idleCount));
    if (dndCount > 0) groups.push(new GroupTreeItem('dnd', dndCount));
    if (offlineCount > 0) groups.push(new GroupTreeItem('offline', offlineCount));

    return groups;
  }

  /*** Refreshes the friends tree view ***/
  refresh(): void {
    this.onDidChangeTreeDataEmitter.fire(undefined);
  }

  /*** Builds activity info from ActivityPayload ***/
  private buildActivityInfo(activity: ActivityPayload): FriendInfo['activity'] {
    const result: FriendInfo['activity'] = {
      sessionDuration: activity.sessionDuration,
    };
    if (activity.fileName !== undefined) {
      result.fileName = activity.fileName;
    }
    if (activity.language !== undefined) {
      result.language = activity.language;
    }
    if (activity.project !== undefined) {
      result.project = activity.project;
    }
    return result;
  }

  /*** Handles friend status update from WebSocket ***/
  handleFriendStatus(payload: unknown): void {
    if (typeof payload !== 'object' || payload === null) {
      return;
    }
    /* Validate payload shape */
    const p = payload as Record<string, unknown>;
    if (
      typeof p.userId !== 'string' ||
      typeof p.status !== 'string' ||
      typeof p.updatedAt !== 'number'
    ) {
      this.logger.warn('Invalid friend status payload', payload);
      return;
    }

    const status = payload as UserStatus;
    const existingFriend = this.friends.get(status.userId);

    if (existingFriend) {
      /* Update existing friend */
      const newActivity = status.activity ? this.buildActivityInfo(status.activity) : undefined;
      const updated: FriendInfo = {
        ...existingFriend,
        status: status.status,
        activity: newActivity,
        lastUpdated: status.updatedAt,
      };

      this.friends.set(status.userId, updated);
      this.onDidChangeTreeDataEmitter.fire(undefined);
      this.logger.debug('Updated friend status', { userId: status.userId, status: status.status });
    } else {
      this.logger.debug('Received status for unknown friend, ignoring', { userId: status.userId });
    }
  }

  /*** Gets list of currently online friends ***/
  getOnlineFriends(): FriendInfo[] {
    return Array.from(this.friends.values()).filter(
      (f) => f.status === 'online' || f.status === 'idle'
    );
  }

  /*** Adds a friend to the list (called when receiving initial state) ***/
  addFriend(user: UserDTO, status: UserStatus): void {
    const friend: FriendInfo = {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      status: status.status,
      activity: status.activity ? this.buildActivityInfo(status.activity) : undefined,
      lastUpdated: status.updatedAt,
    };

    this.friends.set(user.id, friend);
    this.onDidChangeTreeDataEmitter.fire(undefined);
  }

  /*** Clears all friends (called on logout) ***/
  clear(): void {
    this.friends.clear();
    this.onDidChangeTreeDataEmitter.fire(undefined);
  }

  dispose(): void {
    for (const disposable of this.disposables) {
      disposable.dispose();
    }
  }
}
