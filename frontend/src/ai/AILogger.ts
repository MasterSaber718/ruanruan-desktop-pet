interface LogEntry {
  timestamp: Date;
  level: 'debug' | 'info' | 'warn' | 'error';
  module: string;
  message: string;
  data?: unknown;
}

export class AILogger {
  private logs: LogEntry[];
  private maxLogs: number;
  private isEnabled: boolean;

  constructor() {
    this.logs = [];
    this.maxLogs = 1000;
    this.isEnabled = true;
  }

  private addLog(level: LogEntry['level'], module: string, message: string, data?: unknown): void {
    if (!this.isEnabled) return;

    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      module,
      message,
      data
    };

    this.logs.push(entry);

    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    this.outputToConsole(entry);
  }

  private outputToConsole(entry: LogEntry): void {
    const timestamp = entry.timestamp.toLocaleTimeString();
    const prefix = `[${timestamp}] [${entry.level.toUpperCase()}] [${entry.module}]`;

    switch (entry.level) {
      case 'debug':
        console.debug(`${prefix} ${entry.message}`, entry.data);
        break;
      case 'info':
        console.info(`${prefix} ${entry.message}`, entry.data);
        break;
      case 'warn':
        console.warn(`${prefix} ${entry.message}`, entry.data);
        break;
      case 'error':
        console.error(`${prefix} ${entry.message}`, entry.data);
        break;
    }
  }

  debug(module: string, message: string, data?: unknown): void {
    this.addLog('debug', module, message, data);
  }

  info(module: string, message: string, data?: unknown): void {
    this.addLog('info', module, message, data);
  }

  warn(module: string, message: string, data?: unknown): void {
    this.addLog('warn', module, message, data);
  }

  error(module: string, message: string, data?: unknown): void {
    this.addLog('error', module, message, data);
  }

  getLogs(level?: LogEntry['level'], module?: string): LogEntry[] {
    let filtered = [...this.logs];

    if (level) {
      filtered = filtered.filter(log => log.level === level);
    }

    if (module) {
      filtered = filtered.filter(log => log.module === module);
    }

    return filtered;
  }

  clearLogs(): void {
    this.logs = [];
  }

  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  getLogStats(): { debug: number; info: number; warn: number; error: number } {
    return {
      debug: this.logs.filter(l => l.level === 'debug').length,
      info: this.logs.filter(l => l.level === 'info').length,
      warn: this.logs.filter(l => l.level === 'warn').length,
      error: this.logs.filter(l => l.level === 'error').length
    };
  }
}

export const aiLogger = new AILogger();
