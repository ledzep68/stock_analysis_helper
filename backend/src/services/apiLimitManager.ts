/**
 * API使用制限管理とアラートシステム
 */

import { EventEmitter } from 'events';

export interface ApiLimitConfig {
  provider: string;
  dailyLimit: number;
  hourlyLimit: number;
  minuteLimit: number;
  warningThreshold: number; // パーセント（例：80%で警告）
}

export interface ApiUsageStats {
  provider: string;
  dailyUsed: number;
  hourlyUsed: number;
  minuteUsed: number;
  lastReset: {
    daily: Date;
    hourly: Date;
    minute: Date;
  };
  isLimited: boolean;
  limitReason?: string;
}

export interface ApiLimitAlert {
  level: 'warning' | 'critical' | 'blocked';
  provider: string;
  message: string;
  remainingCalls: number;
  resetTime: Date;
  recommendedAction: string;
}

class ApiLimitManager extends EventEmitter {
  private usageStats: Map<string, ApiUsageStats> = new Map();
  private configs: Map<string, ApiLimitConfig> = new Map();
  private alerts: ApiLimitAlert[] = [];

  constructor() {
    super();
    this.initializeProviders();
    this.startCleanupTimer();
  }

  private initializeProviders() {
    // Yahoo Finance (無料版)
    this.configs.set('yahoo', {
      provider: 'yahoo',
      dailyLimit: 2000,
      hourlyLimit: 100,
      minuteLimit: 5,
      warningThreshold: 80
    });

    // Alpha Vantage (無料版)
    this.configs.set('alphavantage', {
      provider: 'alphavantage',
      dailyLimit: 25,
      hourlyLimit: 25,
      minuteLimit: 5,
      warningThreshold: 80
    });

    // IEX Cloud (無料版)
    this.configs.set('iex', {
      provider: 'iex',
      dailyLimit: 100,
      hourlyLimit: 100,
      minuteLimit: 10,
      warningThreshold: 80
    });

    // Polygon.io (無料版)
    this.configs.set('polygon', {
      provider: 'polygon',
      dailyLimit: 5,
      hourlyLimit: 5,
      minuteLimit: 5,
      warningThreshold: 80
    });

    // 各プロバイダーの使用統計を初期化
    for (const provider of this.configs.keys()) {
      this.resetUsageStats(provider);
    }
  }

  private resetUsageStats(provider: string) {
    const now = new Date();
    this.usageStats.set(provider, {
      provider,
      dailyUsed: 0,
      hourlyUsed: 0,
      minuteUsed: 0,
      lastReset: {
        daily: now,
        hourly: now,
        minute: now
      },
      isLimited: false
    });
  }

  /**
   * API呼び出し前の制限チェック
   */
  public canMakeRequest(provider: string): { allowed: boolean; reason?: string; waitTime?: number } {
    const config = this.configs.get(provider);
    const stats = this.usageStats.get(provider);

    if (!config || !stats) {
      return { allowed: false, reason: 'Unknown provider' };
    }

    this.updateResetCounters(provider);

    // 分単位制限チェック
    if (stats.minuteUsed >= config.minuteLimit) {
      const waitTime = 60 - new Date().getSeconds();
      return { 
        allowed: false, 
        reason: `Minute limit exceeded (${stats.minuteUsed}/${config.minuteLimit})`,
        waitTime
      };
    }

    // 時間単位制限チェック
    if (stats.hourlyUsed >= config.hourlyLimit) {
      const waitTime = (60 - new Date().getMinutes()) * 60;
      return { 
        allowed: false, 
        reason: `Hourly limit exceeded (${stats.hourlyUsed}/${config.hourlyLimit})`,
        waitTime
      };
    }

    // 日単位制限チェック
    if (stats.dailyUsed >= config.dailyLimit) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      const waitTime = tomorrow.getTime() - Date.now();
      
      return { 
        allowed: false, 
        reason: `Daily limit exceeded (${stats.dailyUsed}/${config.dailyLimit})`,
        waitTime: Math.floor(waitTime / 1000)
      };
    }

    return { allowed: true };
  }

  /**
   * API呼び出し後の使用量記録
   */
  public recordApiCall(provider: string, success: boolean = true) {
    const stats = this.usageStats.get(provider);
    const config = this.configs.get(provider);

    if (!stats || !config) return;

    this.updateResetCounters(provider);

    // 成功した呼び出しのみカウント
    if (success) {
      stats.dailyUsed++;
      stats.hourlyUsed++;
      stats.minuteUsed++;
    }

    // 警告チェック
    this.checkAndEmitAlerts(provider);

    console.log(`📊 API Usage [${provider}]: Daily ${stats.dailyUsed}/${config.dailyLimit}, Hourly ${stats.hourlyUsed}/${config.hourlyLimit}`);
  }

  private updateResetCounters(provider: string) {
    const stats = this.usageStats.get(provider);
    if (!stats) return;

    const now = new Date();

    // 分カウンターリセット
    if (now.getMinutes() !== stats.lastReset.minute.getMinutes()) {
      stats.minuteUsed = 0;
      stats.lastReset.minute = now;
    }

    // 時間カウンターリセット
    if (now.getHours() !== stats.lastReset.hourly.getHours()) {
      stats.hourlyUsed = 0;
      stats.lastReset.hourly = now;
    }

    // 日カウンターリセット
    if (now.getDate() !== stats.lastReset.daily.getDate()) {
      stats.dailyUsed = 0;
      stats.lastReset.daily = now;
    }
  }

  private checkAndEmitAlerts(provider: string) {
    const config = this.configs.get(provider);
    const stats = this.usageStats.get(provider);

    if (!config || !stats) return;

    const dailyUsagePercent = (stats.dailyUsed / config.dailyLimit) * 100;
    const hourlyUsagePercent = (stats.hourlyUsed / config.hourlyLimit) * 100;

    // クリティカルアラート（95%以上）
    if (dailyUsagePercent >= 95) {
      this.emitAlert({
        level: 'critical',
        provider,
        message: `Daily API limit almost reached: ${stats.dailyUsed}/${config.dailyLimit} (${dailyUsagePercent.toFixed(1)}%)`,
        remainingCalls: config.dailyLimit - stats.dailyUsed,
        resetTime: this.getNextResetTime('daily'),
        recommendedAction: 'Switch to local data or reduce API calls'
      });
    }
    // 警告アラート（設定された閾値以上）
    else if (dailyUsagePercent >= config.warningThreshold) {
      this.emitAlert({
        level: 'warning',
        provider,
        message: `Daily API usage warning: ${stats.dailyUsed}/${config.dailyLimit} (${dailyUsagePercent.toFixed(1)}%)`,
        remainingCalls: config.dailyLimit - stats.dailyUsed,
        resetTime: this.getNextResetTime('daily'),
        recommendedAction: 'Monitor usage and consider rate limiting'
      });
    }

    // 時間制限アラート
    if (hourlyUsagePercent >= 90) {
      this.emitAlert({
        level: 'warning',
        provider,
        message: `Hourly API usage high: ${stats.hourlyUsed}/${config.hourlyLimit} (${hourlyUsagePercent.toFixed(1)}%)`,
        remainingCalls: config.hourlyLimit - stats.hourlyUsed,
        resetTime: this.getNextResetTime('hourly'),
        recommendedAction: 'Slow down API requests'
      });
    }
  }

  private emitAlert(alert: ApiLimitAlert) {
    this.alerts.push(alert);
    
    // 同じレベルの重複アラートを防ぐ
    const recentSimilar = this.alerts.filter(a => 
      a.provider === alert.provider && 
      a.level === alert.level &&
      Date.now() - new Date(a.resetTime).getTime() < 300000 // 5分以内
    );

    if (recentSimilar.length <= 1) {
      console.warn(`🚨 API Limit Alert [${alert.level.toUpperCase()}]: ${alert.message}`);
      console.warn(`   Recommended: ${alert.recommendedAction}`);
      console.warn(`   Reset time: ${alert.resetTime.toLocaleString()}`);
      
      this.emit('apiLimitAlert', alert);
    }
  }

  private getNextResetTime(period: 'daily' | 'hourly' | 'minute'): Date {
    const now = new Date();
    
    switch (period) {
      case 'daily':
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        return tomorrow;
        
      case 'hourly':
        const nextHour = new Date(now);
        nextHour.setHours(nextHour.getHours() + 1);
        nextHour.setMinutes(0, 0, 0);
        return nextHour;
        
      case 'minute':
        const nextMinute = new Date(now);
        nextMinute.setMinutes(nextMinute.getMinutes() + 1);
        nextMinute.setSeconds(0, 0);
        return nextMinute;
        
      default:
        return now;
    }
  }

  /**
   * 使用可能なプロバイダーを優先度順で取得
   */
  public getAvailableProviders(): string[] {
    const available: { provider: string; priority: number }[] = [];

    for (const [provider, config] of this.configs.entries()) {
      const check = this.canMakeRequest(provider);
      if (check.allowed) {
        // 使用率が低いほど優先度が高い
        const stats = this.usageStats.get(provider)!;
        const usageRate = stats.dailyUsed / config.dailyLimit;
        available.push({ provider, priority: 1 - usageRate });
      }
    }

    return available
      .sort((a, b) => b.priority - a.priority)
      .map(item => item.provider);
  }

  /**
   * 現在の使用統計を取得
   */
  public getUsageStats(): ApiUsageStats[] {
    return Array.from(this.usageStats.values());
  }

  /**
   * 最近のアラートを取得
   */
  public getRecentAlerts(hours: number = 24): ApiLimitAlert[] {
    const cutoff = Date.now() - (hours * 60 * 60 * 1000);
    return this.alerts.filter(alert => 
      new Date(alert.resetTime).getTime() > cutoff
    );
  }

  /**
   * 強制的に制限を有効/無効にする
   */
  public setProviderLimited(provider: string, limited: boolean, reason?: string) {
    const stats = this.usageStats.get(provider);
    if (stats) {
      stats.isLimited = limited;
      stats.limitReason = reason;
      
      if (limited) {
        console.warn(`🚫 Provider ${provider} manually limited: ${reason}`);
      } else {
        console.log(`✅ Provider ${provider} limitation removed`);
      }
    }
  }

  private startCleanupTimer() {
    // 1時間ごとに古いアラートを削除
    setInterval(() => {
      const cutoff = Date.now() - (24 * 60 * 60 * 1000); // 24時間前
      this.alerts = this.alerts.filter(alert => 
        new Date(alert.resetTime).getTime() > cutoff
      );
    }, 60 * 60 * 1000);
  }
}

export const apiLimitManager = new ApiLimitManager();