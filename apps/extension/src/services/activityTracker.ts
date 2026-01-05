/**
 * Activity Tracker Service
 *
 * Tracks user coding activity with intelligent debouncing:
 * - Heartbeat every 30 seconds when actively coding
 * - Immediate update on file switch
 * - Immediate update on debug start/stop
 * - Never sends on individual keystrokes
 * - Respects privacy settings and blacklisted files
 */

import * as vscode from 'vscode';

import type { WebSocketClient } from './wsClient';
import type { ConfigManager } from '../utils/configManager';
import type { Logger } from '../utils/logger';
import type { ActivityPayload, UserStatusType, Intensity } from '@devradar/shared';

/**
 * Tracks and reports user coding activity.
 */
export class ActivityTracker implements vscode.Disposable {
  private readonly disposables: vscode.Disposable[] = [];
  private isTracking = false;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private idleTimeout: NodeJS.Timeout | null = null;
  private lastActivityTime = Date.now();
  private sessionStartTime = Date.now();
  private currentStatus: UserStatusType = 'online';
  private manualStatus: UserStatusType | null = null;
  private lastSentActivity: ActivityPayload | undefined = undefined;

  // Debouncing for file changes
  private pendingUpdate: NodeJS.Timeout | null = null;
  private readonly updateDebounceMs = 1000; // 1 second debounce for rapid changes

  // Keystroke tracking for intensity calculation
  private keystrokeCount = 0;
  private keystrokeWindowStart = Date.now();
  private readonly keystrokeWindowMs = 60_000; // 1 minute window

  constructor(
    private readonly wsClient: WebSocketClient,
    private readonly configManager: ConfigManager,
    private readonly logger: Logger
  ) {}

  /**
   * Starts activity tracking.
   */
  start(): void {
    if (this.isTracking) {
      return;
    }

    this.logger.info('Starting activity tracking');
    this.isTracking = true;
    this.sessionStartTime = Date.now();
    this.lastActivityTime = Date.now();

    // Register VS Code event listeners
    this.registerEventListeners();

    // Start heartbeat
    this.startHeartbeat();

    // Start idle detection
    this.startIdleDetection();

    // Send initial status
    this.sendStatusUpdate();
  }

  /**
   * Stops activity tracking.
   */
  stop(): void {
    if (!this.isTracking) {
      return;
    }

    this.logger.info('Stopping activity tracking');
    this.isTracking = false;

    // Send offline status
    this.wsClient.sendStatusUpdate('offline');

    // Clear intervals
    this.stopHeartbeat();
    this.stopIdleDetection();

    // Clear pending updates
    if (this.pendingUpdate) {
      clearTimeout(this.pendingUpdate);
      this.pendingUpdate = null;
    }
  }

  /**
   * Reconfigures the tracker after settings change.
   */
  reconfigure(): void {
    if (this.isTracking) {
      this.stopHeartbeat();
      this.stopIdleDetection();
      this.startHeartbeat();
      this.startIdleDetection();
    }
  }

  /**
   * Sets a manual status override.
   */
  setManualStatus(status: UserStatusType): void {
    this.manualStatus = status;
    this.sendStatusUpdate();
  }

  /**
   * Clears the manual status override.
   */
  clearManualStatus(): void {
    this.manualStatus = null;
    this.sendStatusUpdate();
  }

  /**
   * Forces an immediate status update.
   */
  sendStatusUpdate(): void {
    if (!this.isTracking) {
      return;
    }

    const activity = this.buildActivityPayload();
    const status = this.manualStatus ?? this.currentStatus;

    // Deduplicate: don't send if nothing changed
    if (this.isDuplicateActivity(activity, status)) {
      return;
    }

    this.lastSentActivity = activity ?? undefined;
    this.wsClient.sendStatusUpdate(status, activity);
    this.logger.debug('Sent status update', { status, activity: activity?.fileName });
  }

  /**
   * Registers VS Code event listeners.
   */
  private registerEventListeners(): void {
    // Active editor change - immediate update
    this.disposables.push(
      vscode.window.onDidChangeActiveTextEditor(() => {
        this.recordActivity();
        this.scheduleUpdate(true); // Immediate
      })
    );

    // Text document change - record activity but debounce update
    this.disposables.push(
      vscode.workspace.onDidChangeTextDocument((e) => {
        if (e.document === vscode.window.activeTextEditor?.document) {
          this.recordActivity();
          this.recordKeystroke();
          this.scheduleUpdate(false); // Debounced
        }
      })
    );

    // Selection change - record activity only
    this.disposables.push(
      vscode.window.onDidChangeTextEditorSelection(() => {
        this.recordActivity();
      })
    );

    // Visible editors change
    this.disposables.push(
      vscode.window.onDidChangeVisibleTextEditors(() => {
        this.recordActivity();
      })
    );

    // Debug session start
    this.disposables.push(
      vscode.debug.onDidStartDebugSession(() => {
        this.recordActivity();
        this.scheduleUpdate(true); // Immediate
      })
    );

    // Debug session end
    this.disposables.push(
      vscode.debug.onDidTerminateDebugSession(() => {
        this.recordActivity();
        this.scheduleUpdate(true); // Immediate
      })
    );

    // Window focus change
    this.disposables.push(
      vscode.window.onDidChangeWindowState((e) => {
        if (!e.focused) {
          // Window lost focus, might go idle soon
          this.checkIdle();
        } else {
          // Window gained focus
          this.recordActivity();
          this.scheduleUpdate(true);
        }
      })
    );
  }

  /**
   * Records that activity occurred.
   */
  private recordActivity(): void {
    this.lastActivityTime = Date.now();

    // If we were idle, transition back to online
    if (this.currentStatus === 'idle') {
      this.currentStatus = 'online';
      this.scheduleUpdate(true);
    }
  }

  /**
   * Records a keystroke for intensity calculation.
   */
  private recordKeystroke(): void {
    const now = Date.now();

    // Reset window if expired
    if (now - this.keystrokeWindowStart > this.keystrokeWindowMs) {
      this.keystrokeCount = 0;
      this.keystrokeWindowStart = now;
    }

    this.keystrokeCount++;
  }

  /**
   * Schedules a status update with optional debouncing.
   */
  private scheduleUpdate(immediate: boolean): void {
    if (this.pendingUpdate) {
      clearTimeout(this.pendingUpdate);
    }

    if (immediate) {
      this.sendStatusUpdate();
    } else {
      this.pendingUpdate = setTimeout(() => {
        this.pendingUpdate = null;
        this.sendStatusUpdate();
      }, this.updateDebounceMs);
    }
  }

  /**
   * Starts the heartbeat interval.
   */
  private startHeartbeat(): void {
    const interval = this.configManager.get('heartbeatInterval');

    this.heartbeatInterval = setInterval(() => {
      if (this.currentStatus === 'online') {
        this.sendStatusUpdate();
      }
    }, interval);
  }

  /**
   * Stops the heartbeat interval.
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Starts idle detection.
   */
  private startIdleDetection(): void {
    const checkInterval = 30_000; // Check every 30 seconds

    this.idleTimeout = setInterval(() => {
      this.checkIdle();
    }, checkInterval);
  }

  /**
   * Stops idle detection.
   */
  private stopIdleDetection(): void {
    if (this.idleTimeout) {
      clearInterval(this.idleTimeout);
      this.idleTimeout = null;
    }
  }

  /**
   * Checks if user is idle and updates status.
   */
  private checkIdle(): void {
    const idleThreshold = this.configManager.get('idleTimeout');
    const timeSinceActivity = Date.now() - this.lastActivityTime;

    if (timeSinceActivity > idleThreshold && this.currentStatus === 'online') {
      this.currentStatus = 'idle';
      this.sendStatusUpdate();
      this.logger.debug('User went idle');
    }
  }

  /**
   * Builds the activity payload from current editor state.
   */
  private buildActivityPayload(): ActivityPayload | undefined {
    // Check privacy mode
    if (this.configManager.get('privacyMode')) {
      return {
        sessionDuration: this.getSessionDuration(),
      };
    }

    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return {
        sessionDuration: this.getSessionDuration(),
      };
    }

    const document = editor.document;
    const fileName = this.getFileName(document);
    const language = this.getLanguage(document);
    const project = this.getProjectName();
    const workspace = this.getWorkspaceName();

    // Check if file/workspace is blacklisted
    if (fileName && this.configManager.isFileBlacklisted(fileName)) {
      const result: ActivityPayload = {
        sessionDuration: this.getSessionDuration(),
      };
      if (language !== undefined) result.language = language;
      if (project !== undefined) result.project = project;
      if (workspace !== undefined) result.workspace = workspace;
      return result;
    }

    if (workspace && this.configManager.isWorkspaceBlacklisted(workspace)) {
      return {
        sessionDuration: this.getSessionDuration(),
      };
    }

    const activityResult: ActivityPayload = {
      sessionDuration: this.getSessionDuration(),
    };
    if (this.configManager.get('showFileName') && fileName !== undefined) {
      activityResult.fileName = fileName;
    }
    if (this.configManager.get('showLanguage') && language !== undefined) {
      activityResult.language = language;
    }
    if (this.configManager.get('showProject') && project !== undefined) {
      activityResult.project = project;
    }
    if (workspace !== undefined) {
      activityResult.workspace = workspace;
    }
    activityResult.intensity = this.calculateIntensity();
    return activityResult;
  }

  /**
   * Gets the file name, respecting privacy settings.
   */
  private getFileName(document: vscode.TextDocument): string | undefined {
    if (document.isUntitled) {
      return 'Untitled';
    }

    const uri = document.uri;
    if (uri.scheme !== 'file') {
      return undefined;
    }

    const path = uri.fsPath;
    const parts = path.split(/[\\/]/);
    return parts[parts.length - 1];
  }

  /**
   * Gets the programming language.
   */
  private getLanguage(document: vscode.TextDocument): string | undefined {
    return document.languageId;
  }

  /**
   * Gets the project name from workspace folder.
   */
  private getProjectName(): string | undefined {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      return undefined;
    }

    // Get the workspace folder containing the current file
    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor) {
      const folder = vscode.workspace.getWorkspaceFolder(activeEditor.document.uri);
      if (folder) {
        return folder.name;
      }
    }

    // Fall back to first workspace folder
    return workspaceFolders[0]?.name;
  }

  /**
   * Gets the workspace name.
   */
  private getWorkspaceName(): string | undefined {
    return vscode.workspace.name;
  }

  /**
   * Gets the session duration in seconds.
   */
  private getSessionDuration(): number {
    return Math.floor((Date.now() - this.sessionStartTime) / 1000);
  }

  /**
   * Calculates coding intensity based on keystroke velocity.
   * Returns a value between 0 and 100 as a branded Intensity type.
   */
  private calculateIntensity(): Intensity {
    const now = Date.now();
    const windowDuration = now - this.keystrokeWindowStart;

    if (windowDuration < 1000) {
      return 0 as Intensity;
    }

    // Calculate keystrokes per minute
    const kpm = (this.keystrokeCount / windowDuration) * 60_000;

    // Map to 0-100 scale (assuming 300 KPM is max intensity)
    const intensity = Math.min(100, Math.floor((kpm / 300) * 100));

    return intensity as Intensity;
  }

  /**
   * Checks if the activity is a duplicate of the last sent.
   */
  private isDuplicateActivity(
    activity: ActivityPayload | undefined,
    status: UserStatusType
  ): boolean {
    if (this.lastSentActivity === undefined || !activity) {
      return false;
    }

    if (this.currentStatus !== status) {
      return false;
    }

    return (
      this.lastSentActivity.fileName === activity.fileName &&
      this.lastSentActivity.language === activity.language &&
      this.lastSentActivity.project === activity.project &&
      this.lastSentActivity.workspace === activity.workspace
    );
  }

  dispose(): void {
    this.stop();

    for (const disposable of this.disposables) {
      disposable.dispose();
    }
  }
}
