/*** Configuration Manager
 *
 * Provides type-safe access to extension configuration with caching ***/

import { minimatch } from 'minimatch';
import * as vscode from 'vscode';

/*** Extension configuration schema ***/
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

/*** Default configuration values ***/
const DEFAULT_CONFIG: DevRadarConfig = {
  /* Production */
  serverUrl: 'https://wispy-netti-devradar-c95bfbd3.koyeb.app',
  wsUrl: 'wss://wispy-netti-devradar-c95bfbd3.koyeb.app/ws',

  /* Development */
  // serverUrl: 'http://localhost:3000',
  // wsUrl: 'ws://localhost:3000/ws',
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

/*** Manages extension configuration with caching and type safety ***/
export class ConfigManager implements vscode.Disposable {
  private cache: DevRadarConfig;
  private readonly disposables: vscode.Disposable[] = [];
  private readonly onConfigChangeEmitter = new vscode.EventEmitter<DevRadarConfig>();

  /*** Event that fires when configuration changes ***/
  readonly onConfigChange = this.onConfigChangeEmitter.event;

  constructor() {
    this.cache = this.loadConfig();

    this.disposables.push(this.onConfigChangeEmitter);
  }

  /*** Gets a specific configuration value ***/
  get<K extends keyof DevRadarConfig>(key: K): DevRadarConfig[K] {
    return this.cache[key];
  }

  /*** Gets all configuration values ***/
  getAll(): Readonly<DevRadarConfig> {
    return { ...this.cache };
  }

  /*** Updates a configuration value ***/
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

  /*** Reloads configuration from VS Code settings ***/
  reload(): void {
    this.cache = this.loadConfig();
    this.onConfigChangeEmitter.fire(this.cache);
  }

  /*** Loads configuration from VS Code settings with defaults ***/
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

  /*** Checks if a file matches any blacklisted pattern ***/
  isFileBlacklisted(fileName: string): boolean {
    const patterns = this.cache.blacklistedFiles;
    return patterns.some((pattern) => this.matchGlob(fileName, pattern));
  }

  /*** Checks if a workspace is blacklisted ***/
  isWorkspaceBlacklisted(workspaceName: string): boolean {
    return this.cache.blacklistedWorkspaces.includes(workspaceName);
  }

  /*** Simple glob pattern matching using minimatch ***/
  private matchGlob(text: string, pattern: string): boolean {
    return minimatch(text, pattern, { dot: true });
  }

  dispose(): void {
    for (const disposable of this.disposables) {
      disposable.dispose();
    }
  }
}
