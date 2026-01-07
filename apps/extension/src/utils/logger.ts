/*** Logger Utility
 *
 * Provides structured logging with output channel support ***/

import * as vscode from 'vscode';

/*** Log level enumeration ***/
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

/*** Logger implementation with VS Code output channel ***/
export class Logger implements vscode.Disposable {
  private static outputChannel: vscode.OutputChannel | undefined;
  private readonly prefix: string;
  private static minLevel: LogLevel = LogLevel.INFO;

  /*** Static initialization block ***/
  static {
    if (process.env.NODE_ENV === 'development' || process.env.DEVRADAR_DEBUG) {
      Logger.minLevel = LogLevel.DEBUG;
    }
  }

  constructor(prefix: string) {
    this.prefix = prefix;

    /*** Create shared output channel ***/
    Logger.outputChannel ??= vscode.window.createOutputChannel('DevRadar', { log: true });
  }

  /*** Logs a debug message ***/
  debug(message: string, data?: unknown): void {
    this.log(LogLevel.DEBUG, message, data);
  }

  /*** Logs an info message ***/
  info(message: string, data?: unknown): void {
    this.log(LogLevel.INFO, message, data);
  }

  /*** Logs a warning message ***/
  warn(message: string, data?: unknown): void {
    this.log(LogLevel.WARN, message, data);
  }

  /*** Logs an error message ***/
  error(message: string, error?: unknown): void {
    const errorStack = error instanceof Error ? error.stack : undefined;
    this.log(LogLevel.ERROR, message, errorStack ? `${String(error)}\n${errorStack}` : error);

    /*** Also log to console for debugging ***/
    if (error instanceof Error) {
      console.error(`[${this.prefix}] ${message}:`, error.message, error.stack);
    }
  }

  /*** Internal log implementation ***/
  private log(level: LogLevel, message: string, data?: unknown): void {
    if (level < Logger.minLevel) {
      return;
    }

    const timestamp = new Date().toISOString();
    const levelStr = LogLevel[level];
    const formattedMessage = `[${timestamp}] [${levelStr}] [${this.prefix}] ${message}`;

    let dataStr = '';
    if (data !== undefined) {
      try {
        if (data instanceof Error) {
          dataStr = ` | Error: ${data.message}`;
        } else if (typeof data === 'object' && data !== null) {
          dataStr = ` | ${JSON.stringify(data)}`;
        } else if (
          typeof data === 'string' ||
          typeof data === 'number' ||
          typeof data === 'boolean'
        ) {
          dataStr = ` | ${String(data)}`;
        } else {
          dataStr = ' | [value]';
        }
      } catch {
        dataStr = ' | [Unable to serialize data]';
      }
    }

    Logger.outputChannel?.appendLine(formattedMessage + dataStr);
  }

  /*** Shows the output channel ***/
  show(): void {
    Logger.outputChannel?.show();
  }

  /*** Sets the minimum log level ***/
  static setLevel(level: LogLevel): void {
    Logger.minLevel = level;
  }

  /*** Disposes the shared output channel ***/
  static disposeShared(): void {
    if (Logger.outputChannel) {
      Logger.outputChannel.dispose();
      Logger.outputChannel = undefined;
    }
  }

  dispose(): void {
    /* Output channel is shared, don't dispose it here */
  }
}
