/**
 * Configuration Manager
 *
 * Provides type-safe access to extension configuration with caching.
 */

import * as vscode from 'vscode';

/**
 * Extension configuration schema.
 */
export interface DevRadarConfig {
  serverUrl: string;
  wsUrl: string;
  privacyMode: boolean;
  showFileName: boolean;
  showProject: boolean;
  showLanguage: boolean;
  blacklistedFiles: string[];
  blacklistedWorkspaces: string[];
  idleTimeout: number;
  heartbeatInterval: number;
  enableNotifications: boolean;
  showStatusBarItem: boolean;
}

/**
 * Default configuration values.
 */
const DEFAULT_CONFIG: DevRadarConfig = {
  serverUrl: 'http://localhost:3000',
  wsUrl: 'ws://localhost:3000/ws',
  privacyMode: false,
  showFileName: true,
  showProject: true,
  showLanguage: true,
  blacklistedFiles: [
    '.env',
    '.env.*',
    '*.pem',
    '*.key',
    '*.secret',
    '**/secrets/**',
    '**/credentials/**',
  ],
  blacklistedWorkspaces: [],
  idleTimeout: 300_000, // 5 minutes
  heartbeatInterval: 30_000, // 30 seconds
  enableNotifications: true,
  showStatusBarItem: true,
};

/**
 * Manages extension configuration with caching and type safety.
 */
export class ConfigManager implements vscode.Disposable {
  private cache: DevRadarConfig;
  private readonly disposables: vscode.Disposable[] = [];
  private readonly onConfigChangeEmitter = new vscode.EventEmitter<DevRadarConfig>();

  /**
   * Event that fires when configuration changes.
   */
  readonly onConfigChange = this.onConfigChangeEmitter.event;

  constructor() {
    this.cache = this.loadConfig();

    this.disposables.push(this.onConfigChangeEmitter);
  }

  /**
   * Gets a specific configuration value.
   */
  get<K extends keyof DevRadarConfig>(key: K): DevRadarConfig[K] {
    return this.cache[key];
  }

  /**
   * Gets all configuration values.
   */
  getAll(): Readonly<DevRadarConfig> {
    return { ...this.cache };
  }

  /**
   * Updates a configuration value.
   */
  async update<K extends keyof DevRadarConfig>(
    key: K,
    value: DevRadarConfig[K],
    target: vscode.ConfigurationTarget = vscode.ConfigurationTarget.Global
  ): Promise<void> {
    const config = vscode.workspace.getConfiguration('devradar');
    await config.update(key, value, target);
    this.cache[key] = value;
    this.onConfigChangeEmitter.fire(this.cache);
  }

  /**
   * Reloads configuration from VS Code settings.
   */
  reload(): void {
    this.cache = this.loadConfig();
    this.onConfigChangeEmitter.fire(this.cache);
  }

  /**
   * Loads configuration from VS Code settings with defaults.
   */
  private loadConfig(): DevRadarConfig {
    const config = vscode.workspace.getConfiguration('devradar');

    return {
      serverUrl: config.get<string>('serverUrl') ?? DEFAULT_CONFIG.serverUrl,
      wsUrl: config.get<string>('wsUrl') ?? DEFAULT_CONFIG.wsUrl,
      privacyMode: config.get<boolean>('privacyMode') ?? DEFAULT_CONFIG.privacyMode,
      showFileName: config.get<boolean>('showFileName') ?? DEFAULT_CONFIG.showFileName,
      showProject: config.get<boolean>('showProject') ?? DEFAULT_CONFIG.showProject,
      showLanguage: config.get<boolean>('showLanguage') ?? DEFAULT_CONFIG.showLanguage,
      blacklistedFiles: config.get<string[]>('blacklistedFiles') ?? DEFAULT_CONFIG.blacklistedFiles,
      blacklistedWorkspaces:
        config.get<string[]>('blacklistedWorkspaces') ?? DEFAULT_CONFIG.blacklistedWorkspaces,
      idleTimeout: config.get<number>('idleTimeout') ?? DEFAULT_CONFIG.idleTimeout,
      heartbeatInterval:
        config.get<number>('heartbeatInterval') ?? DEFAULT_CONFIG.heartbeatInterval,
      enableNotifications:
        config.get<boolean>('enableNotifications') ?? DEFAULT_CONFIG.enableNotifications,
      showStatusBarItem:
        config.get<boolean>('showStatusBarItem') ?? DEFAULT_CONFIG.showStatusBarItem,
    };
  }

  /**
   * Checks if a file matches any blacklisted pattern.
   */
  isFileBlacklisted(fileName: string): boolean {
    const patterns = this.cache.blacklistedFiles;
    return patterns.some((pattern) => this.matchGlob(fileName, pattern));
  }

  /**
   * Checks if a workspace is blacklisted.
   */
  isWorkspaceBlacklisted(workspaceName: string): boolean {
    return this.cache.blacklistedWorkspaces.includes(workspaceName);
  }

  /**
   * Simple glob pattern matching.
   * Supports * and ** wildcards.
   */
  private matchGlob(text: string, pattern: string): boolean {
    // Convert glob to regex
    const regexPattern = pattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&') // Escape special chars
      .replace(/\*\*/g, '.*') // ** matches anything
      .replace(/\*/g, '[^/\\\\]*'); // * matches anything except path separators

    const regex = new RegExp(`^${regexPattern}$`, 'i');
    return regex.test(text);
  }

  dispose(): void {
    for (const disposable of this.disposables) {
      disposable.dispose();
    }
  }
}
