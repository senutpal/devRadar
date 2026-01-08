/**
 * Friend Requests Tree View Provider
 *
 * Displays pending friend requests with accept/reject/cancel actions.
 */

import * as vscode from 'vscode';

import type { FriendRequestService } from '../services/friendRequestService';
import type { Logger } from '../utils/logger';
import type { FriendRequestDTO } from '@devradar/shared';

/** Tree item representing a friend request. */
class FriendRequestTreeItem extends vscode.TreeItem {
  constructor(
    public readonly request: FriendRequestDTO,
    public readonly direction: 'incoming' | 'outgoing'
  ) {
    const user = direction === 'incoming' ? request.fromUser : request.toUser;
    const label = user.displayName ?? user.username;
    super(label, vscode.TreeItemCollapsibleState.None);

    this.id = `friend-request-${request.id}`;
    this.description = `@${user.username}`;
    this.tooltip = this.buildTooltip(user);
    this.contextValue = `friendRequest-${direction}`;

    /* Set icon based on direction */
    if (direction === 'incoming') {
      this.iconPath = new vscode.ThemeIcon('arrow-down', new vscode.ThemeColor('charts.blue'));
    } else {
      this.iconPath = new vscode.ThemeIcon('arrow-up', new vscode.ThemeColor('charts.yellow'));
    }
  }

  private buildTooltip(user: {
    username: string;
    displayName: string | null;
  }): vscode.MarkdownString {
    const md = new vscode.MarkdownString();
    md.isTrusted = true;
    md.appendMarkdown(`### ${user.displayName ?? user.username}\n\n`);
    md.appendMarkdown(`**@${user.username}**\n\n`);
    md.appendMarkdown(
      this.direction === 'incoming'
        ? 'Sent you a friend request\n\n'
        : 'Pending - waiting for response\n\n'
    );
    md.appendMarkdown(`*Sent: ${new Date(this.request.createdAt).toLocaleDateString()}*`);
    return md;
  }
}

/** Section header for organizing requests by direction. */
class SectionTreeItem extends vscode.TreeItem {
  constructor(
    public readonly section: 'incoming' | 'outgoing',
    public readonly count: number
  ) {
    const label = section === 'incoming' ? '📥 Incoming Requests' : '📤 Outgoing Requests';
    super(
      label,
      count > 0
        ? vscode.TreeItemCollapsibleState.Expanded
        : vscode.TreeItemCollapsibleState.Collapsed
    );

    this.id = `section-${section}`;
    this.description = String(count);
    this.contextValue = 'section';
  }
}

type FriendRequestsTreeItem = FriendRequestTreeItem | SectionTreeItem;

/** Tree data provider for friend requests. */
export class FriendRequestsProvider
  implements vscode.TreeDataProvider<FriendRequestsTreeItem>, vscode.Disposable
{
  private readonly disposables: vscode.Disposable[] = [];
  private readonly onDidChangeTreeDataEmitter = new vscode.EventEmitter<
    FriendRequestsTreeItem | undefined
  >();
  private incomingRequests: FriendRequestDTO[] = [];
  private outgoingRequests: FriendRequestDTO[] = [];
  private isLoading = false;

  readonly onDidChangeTreeData = this.onDidChangeTreeDataEmitter.event;

  constructor(
    private readonly friendRequestService: FriendRequestService,
    private readonly logger: Logger
  ) {
    this.disposables.push(this.onDidChangeTreeDataEmitter);

    /* Listen for changes and refresh */
    this.disposables.push(
      this.friendRequestService.onRequestsChanged(() => {
        void this.refresh();
      })
    );
  }

  getTreeItem(element: FriendRequestsTreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: FriendRequestsTreeItem): FriendRequestsTreeItem[] {
    if (!element) {
      /* Root level: return sections */
      return [
        new SectionTreeItem('incoming', this.incomingRequests.length),
        new SectionTreeItem('outgoing', this.outgoingRequests.length),
      ];
    }

    if (element instanceof SectionTreeItem) {
      /* Return requests for this section */
      if (element.section === 'incoming') {
        return this.incomingRequests.map(
          (request) => new FriendRequestTreeItem(request, 'incoming')
        );
      } else {
        return this.outgoingRequests.map(
          (request) => new FriendRequestTreeItem(request, 'outgoing')
        );
      }
    }

    return [];
  }

  async refresh(): Promise<void> {
    if (this.isLoading) {
      return;
    }

    this.isLoading = true;

    try {
      const [incomingResponse, outgoingResponse] = await Promise.all([
        this.friendRequestService.getIncomingRequests(),
        this.friendRequestService.getOutgoingRequests(),
      ]);

      this.incomingRequests = incomingResponse.data;
      this.outgoingRequests = outgoingResponse.data;

      this.logger.debug('Friend requests refreshed', {
        incoming: this.incomingRequests.length,
        outgoing: this.outgoingRequests.length,
      });
    } catch (error) {
      this.logger.error('Failed to refresh friend requests', error);
      /* Don't clear existing data on error */
    } finally {
      this.isLoading = false;
      this.onDidChangeTreeDataEmitter.fire(undefined);
    }
  }

  clear(): void {
    this.incomingRequests = [];
    this.outgoingRequests = [];
    this.onDidChangeTreeDataEmitter.fire(undefined);
  }

  getPendingCount(): number {
    return this.incomingRequests.length;
  }

  dispose(): void {
    for (const disposable of this.disposables) {
      disposable.dispose();
    }
  }
}
