/**
 * Mini-Leaderboard Tree View Provider
 *
 * Displays a compact friends leaderboard in the DevRadar sidebar
 * showing top friends by weekly coding time.
 */

import * as vscode from 'vscode';

import type { Logger } from '../utils/logger';
import type { LeaderboardEntry } from '@devradar/shared';

/** Tree item for leaderboard entries. */
class LeaderboardTreeItem extends vscode.TreeItem {
  constructor(entry: LeaderboardEntry, showMedal = true) {
    const medal = showMedal
      ? entry.rank === 1
        ? '🥇 '
        : entry.rank === 2
          ? '🥈 '
          : entry.rank === 3
            ? '🥉 '
            : `#${String(entry.rank)} `
      : '';

    const displayName = entry.displayName ?? entry.username;
    super(`${medal}${displayName}`, vscode.TreeItemCollapsibleState.None);

    this.id = `leaderboard-${entry.userId}`;
    this.description = this.formatScore(entry.score);
    this.tooltip = this.buildTooltip(entry);
    this.iconPath = new vscode.ThemeIcon(entry.isFriend ? 'person' : 'account');
    this.contextValue = 'leaderboard-entry';

    // Click to view profile
    this.command = {
      command: 'devradar.viewProfile',
      title: 'View Profile',
      arguments: [{ userId: entry.userId, username: entry.username }],
    };
  }

  /** Format score (seconds) as human-readable duration. */
  private formatScore(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${String(hours)}h ${String(minutes)}m`;
    }
    return `${String(minutes)}m`;
  }

  /** Build rich tooltip with details. */
  private buildTooltip(entry: LeaderboardEntry): vscode.MarkdownString {
    const md = new vscode.MarkdownString();
    md.isTrusted = true;

    md.appendMarkdown(`### ${entry.displayName ?? entry.username}\n\n`);
    md.appendMarkdown(`**@${entry.username}**\n\n`);
    md.appendMarkdown(`📊 **Rank:** #${String(entry.rank)}\n\n`);
    md.appendMarkdown(`⏱️ **This Week:** ${this.formatScore(entry.score)}\n\n`);

    if (entry.isFriend) {
      md.appendMarkdown(`👥 *Friend*\n\n`);
    }

    return md;
  }
}

/** Header item for the leaderboard section. */
class LeaderboardHeaderItem extends vscode.TreeItem {
  constructor(title: string, count: number) {
    super(title, vscode.TreeItemCollapsibleState.Expanded);

    this.id = 'leaderboard-header';
    this.description = count > 0 ? `${String(count)} entries` : '';
    this.iconPath = new vscode.ThemeIcon('trophy');
    this.contextValue = 'leaderboard-header';
  }
}

/** Info item when no data is available. */
class LeaderboardInfoItem extends vscode.TreeItem {
  constructor(message: string, icon = 'info') {
    super(message, vscode.TreeItemCollapsibleState.None);
    this.iconPath = new vscode.ThemeIcon(icon);
  }
}

/** Tree data provider for the mini-leaderboard view. */
export class LeaderboardProvider
  implements vscode.TreeDataProvider<LeaderboardTreeItem | LeaderboardHeaderItem | LeaderboardInfoItem>, vscode.Disposable
{
  private readonly disposables: vscode.Disposable[] = [];
  private readonly onDidChangeTreeDataEmitter = new vscode.EventEmitter<
    LeaderboardTreeItem | LeaderboardHeaderItem | LeaderboardInfoItem | undefined
  >();

  private leaderboard: LeaderboardEntry[] = [];
  private myRank: number | null = null;
  private isLoading = true;

  readonly onDidChangeTreeData = this.onDidChangeTreeDataEmitter.event;

  constructor(private readonly logger: Logger) {
    this.disposables.push(this.onDidChangeTreeDataEmitter);
  }

  getTreeItem(element: LeaderboardTreeItem | LeaderboardHeaderItem | LeaderboardInfoItem): vscode.TreeItem {
    return element;
  }

  getChildren(
    element?: LeaderboardTreeItem | LeaderboardHeaderItem | LeaderboardInfoItem
  ): (LeaderboardTreeItem | LeaderboardHeaderItem | LeaderboardInfoItem)[] {
    // Loading state
    if (this.isLoading && this.leaderboard.length === 0) {
      return [new LeaderboardInfoItem('Loading leaderboard...', 'loading~spin')];
    }

    // Empty state
    if (this.leaderboard.length === 0) {
      return [
        new LeaderboardInfoItem('No leaderboard data yet', 'info'),
        new LeaderboardInfoItem('Start coding to appear!', 'rocket'),
      ];
    }

    // If element is the header, return leaderboard entries
    if (element instanceof LeaderboardHeaderItem) {
      return this.leaderboard.map((entry) => new LeaderboardTreeItem(entry));
    }

    // Root level: return header and "Your rank" sections
    const items: (LeaderboardTreeItem | LeaderboardHeaderItem | LeaderboardInfoItem)[] = [];

    // Your rank indicator (if you're on the leaderboard)
    if (this.myRank !== null) {
      items.push(new LeaderboardInfoItem(`📍 Your rank: #${String(this.myRank)}`, 'location'));
    }

    // Leaderboard header with entries as children
    items.push(new LeaderboardHeaderItem('🏆 This Week', this.leaderboard.length));

    return items;
  }

  /** Updates the leaderboard data. */
  updateLeaderboard(entries: LeaderboardEntry[], myRank: number | null): void {
    this.leaderboard = entries.slice(0, 10); // Top 10
    this.myRank = myRank;
    this.isLoading = false;
    this.onDidChangeTreeDataEmitter.fire(undefined);
    this.logger.debug('Leaderboard updated', { count: entries.length, myRank });
  }

  /** Set loading state. */
  setLoading(loading: boolean): void {
    this.isLoading = loading;
    if (loading) {
      this.onDidChangeTreeDataEmitter.fire(undefined);
    }
  }

  /** Clear leaderboard data. */
  clear(): void {
    this.leaderboard = [];
    this.myRank = null;
    this.isLoading = false;
    this.onDidChangeTreeDataEmitter.fire(undefined);
  }

  /** Refresh the view. */
  refresh(): void {
    this.onDidChangeTreeDataEmitter.fire(undefined);
  }

  dispose(): void {
    for (const disposable of this.disposables) {
      disposable.dispose();
    }
  }
}
