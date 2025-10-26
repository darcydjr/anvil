import * as fs from 'fs-extra';
import * as path from 'path';

export interface LogEntry {
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
  executionId: string;
  message: string;
  data?: any;
}

class Logger {
  private logDir: string;
  private logFile: string;
  private executionId: string;
  private logLevel: LogEntry['level'];

  constructor() {
    this.logDir = path.join(process.cwd(), 'logs');
    this.logFile = path.join(this.logDir, `anvil-${this.getDateString()}.log`);
    this.executionId = this.generateExecutionId();
    this.logLevel = 'INFO'; // Default level
    this.ensureLogDirectory();
    this.logServerStart();
  }

  setLogLevel(level: LogEntry['level']): void {
    this.logLevel = level;
    this.info('Log level changed', { newLevel: level });
  }

  private generateExecutionId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `${timestamp}-${random}`.toUpperCase();
  }

  private logServerStart(): void {
    this.info('=== SERVER STARTING ===', {
      executionId: this.executionId,
      pid: process.pid,
      nodeVersion: process.version,
      platform: process.platform,
      cwd: process.cwd()
    });
  }

  getExecutionId(): string {
    return this.executionId;
  }

  private ensureLogDirectory(): void {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  private getDateString(): string {
    const now = new Date();
    return now.toISOString().split('T')[0]; // YYYY-MM-DD format
  }

  private getTimestamp(): string {
    return new Date().toISOString();
  }

  private shouldLog(level: LogEntry['level']): boolean {
    const levels = ['ERROR', 'WARN', 'INFO', 'DEBUG'];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex <= currentLevelIndex;
  }

  private writeLog(level: LogEntry['level'], message: string, data?: any): void {
    // Check if we should log this level
    if (!this.shouldLog(level)) {
      return;
    }

    const logEntry: LogEntry = {
      timestamp: this.getTimestamp(),
      level,
      executionId: this.executionId,
      message,
      ...(data && { data })
    };

    const logLine = `[${logEntry.timestamp}] [${logEntry.executionId}] ${logEntry.level}: ${logEntry.message}${
      logEntry.data ? ' | Data: ' + JSON.stringify(logEntry.data) : ''
    }\n`;

    // Write to console with colors
    const timeStr = `[${logEntry.timestamp}]`;
    const execStr = `[${logEntry.executionId}]`;
    const levelStr = this.getColoredLevel(logEntry.level);
    const dataStr = logEntry.data ? ` | Data: ${JSON.stringify(logEntry.data)}` : '';

    console.log(`\x1b[90m${timeStr}\x1b[0m \x1b[36m${execStr}\x1b[0m ${levelStr}: ${logEntry.message}${dataStr}`);

    // Write to file
    try {
      fs.appendFileSync(this.logFile, logLine);
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  private getColoredLevel(level: LogEntry['level']): string {
    switch (level) {
      case 'INFO':  return '\x1b[32mINFO\x1b[0m';  // Green
      case 'WARN':  return '\x1b[33mWARN\x1b[0m';  // Yellow
      case 'ERROR': return '\x1b[31mERROR\x1b[0m'; // Red
      case 'DEBUG': return '\x1b[35mDEBUG\x1b[0m'; // Magenta
      default:      return level;
    }
  }

  info(message: string, data?: any): void {
    this.writeLog('INFO', message, data);
  }

  warn(message: string, data?: any): void {
    this.writeLog('WARN', message, data);
  }

  error(message: string, data?: any): void {
    this.writeLog('ERROR', message, data);
  }

  debug(message: string, data?: any): void {
    this.writeLog('DEBUG', message, data);
  }

  // Method to get recent log entries for API
  getRecentLogs(lines: number = 100): LogEntry[] {
    try {
      if (!fs.existsSync(this.logFile)) {
        return [];
      }

      const content = fs.readFileSync(this.logFile, 'utf-8');
      const logLines = content.trim().split('\n').slice(-lines);

      return logLines.map(line => {
        try {
          const match = line.match(/\[([^\]]+)\] \[([^\]]+)\] (\w+): (.+?)(?:\s\|\sData:\s(.+))?$/);
          if (match) {
            const [, timestamp, executionId, level, message, dataStr] = match;
            const entry: LogEntry = {
              timestamp,
              executionId,
              level: level as LogEntry['level'],
              message
            };
            if (dataStr) {
              try {
                entry.data = JSON.parse(dataStr);
              } catch {
                entry.data = dataStr;
              }
            }
            return entry;
          }
          return null;
        } catch {
          return null;
        }
      }).filter(Boolean) as LogEntry[];
    } catch (error) {
      console.error('Failed to read log file:', error);
      return [];
    }
  }

  // Method to clear old log files (keep last 7 days)
  cleanupOldLogs(): void {
    try {
      const files = fs.readdirSync(this.logDir);
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      files.forEach(file => {
        if (file.startsWith('anvil-') && file.endsWith('.log')) {
          const filePath = path.join(this.logDir, file);
          const stats = fs.statSync(filePath);
          if (stats.mtime < sevenDaysAgo) {
            fs.unlinkSync(filePath);
            this.info(`Cleaned up old log file: ${file}`);
          }
        }
      });
    } catch (error) {
      this.error('Failed to cleanup old logs', { error: error.message });
    }
  }
}

// Export singleton instance
export const logger = new Logger();