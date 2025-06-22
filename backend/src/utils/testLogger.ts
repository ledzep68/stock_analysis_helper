/**
 * テスト専用ロガー
 * テストログファイルへの記録とコンソール出力
 */

import fs from 'fs';
import path from 'path';

export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  service: string;
  message: string;
  data?: any;
  testSession?: string;
}

export class TestLogger {
  private serviceName: string;
  private logFilePath: string;
  private testSession: string;

  constructor(serviceName: string) {
    this.serviceName = serviceName;
    this.testSession = `test-${Date.now()}`;
    
    // ログディレクトリの作成
    const logDir = path.join(process.cwd(), 'tests', 'logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    // ログファイルパスの設定
    const timestamp = new Date().toISOString().slice(0, 10);
    this.logFilePath = path.join(logDir, `${serviceName}-${timestamp}.log`);
  }

  private writeLog(level: LogEntry['level'], message: string, data?: any): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      service: this.serviceName,
      message,
      data,
      testSession: this.testSession
    };

    // コンソール出力
    const logLevel = level.toUpperCase();
    const prefix = `[${entry.timestamp}] [${logLevel}] [${this.serviceName}]`;
    
    switch (level) {
      case 'error':
        console.error(`🔴 ${prefix} ${message}`, data || '');
        break;
      case 'warn':
        console.warn(`🟡 ${prefix} ${message}`, data || '');
        break;
      case 'info':
        console.log(`🔵 ${prefix} ${message}`, data || '');
        break;
      case 'debug':
        console.debug(`🔘 ${prefix} ${message}`, data || '');
        break;
    }

    // ファイル出力
    try {
      const logLine = JSON.stringify(entry) + '\\n';
      fs.appendFileSync(this.logFilePath, logLine);
    } catch (error) {
      console.error('Failed to write test log:', error);
    }
  }

  public info(message: string, data?: any): void {
    this.writeLog('info', message, data);
  }

  public warn(message: string, data?: any): void {
    this.writeLog('warn', message, data);
  }

  public error(message: string, data?: any): void {
    this.writeLog('error', message, data);
  }

  public debug(message: string, data?: any): void {
    this.writeLog('debug', message, data);
  }

  /**
   * テストセッション開始のマーク
   */
  public startTestSession(testName: string, description?: string): void {
    this.info(`Test session started: ${testName}`, {
      description,
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString()
    });
  }

  /**
   * テストセッション終了のマーク
   */
  public endTestSession(testName: string, results?: any): void {
    this.info(`Test session ended: ${testName}`, {
      results,
      duration: Date.now() - parseInt(this.testSession.split('-')[1]),
      timestamp: new Date().toISOString()
    });
  }

  /**
   * API呼び出しの記録
   */
  public logApiCall(provider: string, method: string, params: any, result: any, responseTime: number): void {
    this.info(`API Call: ${provider}.${method}`, {
      provider,
      method,
      params,
      result: typeof result === 'object' ? JSON.stringify(result).slice(0, 200) + '...' : result,
      responseTime,
      success: !!result
    });
  }

  /**
   * エラーの詳細記録
   */
  public logError(error: Error, context?: any): void {
    this.error(`Error occurred: ${error.message}`, {
      stack: error.stack,
      context,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * パフォーマンス記録
   */
  public logPerformance(operation: string, startTime: number, endTime: number, data?: any): void {
    const duration = endTime - startTime;
    this.info(`Performance: ${operation}`, {
      duration,
      startTime: new Date(startTime).toISOString(),
      endTime: new Date(endTime).toISOString(),
      data
    });
  }

  /**
   * ログファイルの読み取り
   */
  public readLogFile(): LogEntry[] {
    try {
      if (!fs.existsSync(this.logFilePath)) {
        return [];
      }
      
      const content = fs.readFileSync(this.logFilePath, 'utf8');
      return content
        .split('\\n')
        .filter(line => line.trim())
        .map(line => JSON.parse(line));
    } catch (error) {
      console.error('Failed to read log file:', error);
      return [];
    }
  }

  /**
   * ログ統計の取得
   */
  public getLogStats(): {
    totalEntries: number;
    entriesByLevel: { [level: string]: number };
    testSessions: string[];
    timeRange: { start: string; end: string };
  } {
    const entries = this.readLogFile();
    
    const entriesByLevel: { [level: string]: number } = {};
    const testSessions = new Set<string>();
    
    entries.forEach(entry => {
      entriesByLevel[entry.level] = (entriesByLevel[entry.level] || 0) + 1;
      if (entry.testSession) {
        testSessions.add(entry.testSession);
      }
    });

    return {
      totalEntries: entries.length,
      entriesByLevel,
      testSessions: Array.from(testSessions),
      timeRange: entries.length > 0 ? {
        start: entries[0].timestamp,
        end: entries[entries.length - 1].timestamp
      } : { start: '', end: '' }
    };
  }

  /**
   * ログファイルのクリーンアップ（古いログの削除）
   */
  public static cleanupOldLogs(daysToKeep: number = 7): void {
    const logDir = path.join(process.cwd(), 'tests', 'logs');
    
    if (!fs.existsSync(logDir)) {
      return;
    }

    const files = fs.readdirSync(logDir);
    const cutoffTime = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);

    files.forEach(file => {
      const filePath = path.join(logDir, file);
      const stats = fs.statSync(filePath);
      
      if (stats.mtime.getTime() < cutoffTime) {
        fs.unlinkSync(filePath);
        console.log(`🗑️ Cleaned up old test log: ${file}`);
      }
    });
  }
}