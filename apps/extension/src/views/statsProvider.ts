/**
 * Stats Tree View Provider
 *
 * Displays user's current streak, session time, and weekly stats
 * in the DevRadar sidebar.
 */

import * as vscode from 'vscode';

import type { Logger } from '../utils/logger';
import type { StreakInfo, WeeklyStatsDTO, AchievementDTO } from '@devradar/shared';

/** Stats data structure matching API response. */
export interface StatsData {
  streak: StreakInfo;
  todaySession: number;
  weeklyStats: WeeklyStatsDTO | null;
  recentAchievements: AchievementDTO[];
}

/** Tree item for stats display. */
class StatsTreeItem extends vscode.TreeItem {
  constructor(
    label: string,
    description: string,
    icon: string,
    collapsibleState = vscode.TreeItemCollapsibleState.None
  ) {
    super(label, collapsibleState);
    this.description = description;
    this.iconPath = new vscode.ThemeIcon(icon);
  }
}

/** Tree data provider for the stats sidebar view. */
export class StatsProvider implements vscode.TreeDataProvider<StatsTreeItem>, vscode.Disposable {
  private readonly disposables: vscode.Disposable[] = [];
  private readonly onDidChangeTreeDataEmitter = new vscode.EventEmitter<
    StatsTreeItem | undefined
  >();
  private stats: StatsData | null = null;
  private isLoading = true;

  readonly onDidChangeTreeData = this.onDidChangeTreeDataEmitter.event;

  constructor(private readonly logger: Logger) {
    this.disposables.push(this.onDidChangeTreeDataEmitter);
  }

  getTreeItem(element: StatsTreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(): StatsTreeItem[] {
    if (this.isLoading && !this.stats) {
      return [new StatsTreeItem('Loading...', '', 'loading~spin')];
    }

    if (!this.stats) {
      return [new StatsTreeItem('No stats available', 'Start coding to track stats', 'info')];
    }

    const items: StatsTreeItem[] = [];

    // === Streak Display ===
    const { currentStreak, isActiveToday, streakStatus, longestStreak } = this.stats.streak;
    const streakEmoji = currentStreak >= 30 ? '🏆' : currentStreak >= 7 ? '🔥' : '⚡';
    const statusIcon = isActiveToday
      ? 'check'
      : streakStatus === 'at_risk'
        ? 'warning'
        : 'circle-outline';

    const streakDescription = isActiveToday
      ? '✓ Active today!'
      : streakStatus === 'at_risk'
        ? '⚠ Code today to continue'
        : 'Start coding!';

    items.push(
      new StatsTreeItem(
        `${streakEmoji} ${String(currentStreak)} Day Streak`,
        streakDescription,
        statusIcon
      )
    );

    // Show longest streak if different
    if (longestStreak > currentStreak && longestStreak > 0) {
      items.push(new StatsTreeItem(`Best: ${String(longestStreak)} days`, '', 'star-empty'));
    }

    // === Today's Session ===
    const todayHours = Math.floor(this.stats.todaySession / 3600);
    const todayMinutes = Math.floor((this.stats.todaySession % 3600) / 60);
    const todayDisplay =
      todayHours > 0
        ? `${String(todayHours)}h ${String(todayMinutes)}m`
        : `${String(todayMinutes)}m`;

    items.push(new StatsTreeItem(`Today: ${todayDisplay}`, 'Coding time', 'clock'));

    // === Weekly Stats ===
    if (this.stats.weeklyStats) {
      const weekHours = Math.floor(this.stats.weeklyStats.totalSeconds / 3600);
      const weekMinutes = Math.floor((this.stats.weeklyStats.totalSeconds % 3600) / 60);
      const weekDisplay =
        weekHours > 0 ? `${String(weekHours)}h ${String(weekMinutes)}m` : `${String(weekMinutes)}m`;

      const rankDisplay = this.stats.weeklyStats.rank
        ? `#${String(this.stats.weeklyStats.rank)}`
        : '';

      items.push(new StatsTreeItem(`This Week: ${weekDisplay}`, rankDisplay, 'graph'));

      // Top language if available
      if (this.stats.weeklyStats.topLanguage) {
        items.push(
          new StatsTreeItem(`Top: ${this.stats.weeklyStats.topLanguage}`, '', 'symbol-keyword')
        );
      }
    }

    // === Recent Achievement ===
    if (this.stats.recentAchievements.length > 0) {
      const [latestAchievement] = this.stats.recentAchievements;
      if (latestAchievement) {
        items.push(new StatsTreeItem(latestAchievement.title, 'Latest achievement', 'trophy'));
      }
    }

    return items;
  }

  /** Updates the stats data and triggers a tree refresh. */
  updateStats(stats: StatsData): void {
    this.stats = stats;
    this.isLoading = false;
    this.onDidChangeTreeDataEmitter.fire(undefined);
    this.logger.debug('Stats updated', { streak: stats.streak.currentStreak });
  }

  /** Set loading state. */
  setLoading(loading: boolean): void {
    this.isLoading = loading;
    if (loading) {
      this.onDidChangeTreeDataEmitter.fire(undefined);
    }
  }

  /** Clear stats (e.g., on logout). */
  clear(): void {
    this.stats = null;
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
