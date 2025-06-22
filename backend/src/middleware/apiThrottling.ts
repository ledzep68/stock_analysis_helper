/**
 * 外部API呼び出し制限ミドルウェア
 * DoS攻撃防止と外部API利用制限遵守
 */

interface ApiCall {
  timestamp: number;
  endpoint: string;
}

class ApiThrottling {
  private yahooFinanceCalls: ApiCall[] = [];
  private alphaVantageCalls: ApiCall[] = [];
  
  // Yahoo Finance API制限: 2000リクエスト/日、5リクエスト/秒
  private readonly YAHOO_DAILY_LIMIT = 2000;
  private readonly YAHOO_SECOND_LIMIT = 5;
  
  // Alpha Vantage API制限: 25リクエスト/日（無料プラン）
  private readonly ALPHA_VANTAGE_DAILY_LIMIT = 25;
  private readonly ALPHA_VANTAGE_MINUTE_LIMIT = 5;

  /**
   * Yahoo Finance API呼び出しの制限チェック
   */
  async checkYahooFinanceLimit(): Promise<{ allowed: boolean; reason?: string }> {
    const now = Date.now();
    const oneDayAgo = now - (24 * 60 * 60 * 1000);
    const oneSecondAgo = now - 1000;

    // 古い記録を削除
    this.yahooFinanceCalls = this.yahooFinanceCalls.filter(call => call.timestamp > oneDayAgo);

    // 日次制限チェック
    if (this.yahooFinanceCalls.length >= this.YAHOO_DAILY_LIMIT) {
      return { 
        allowed: false, 
        reason: 'Yahoo Finance daily limit exceeded' 
      };
    }

    // 秒次制限チェック
    const recentCalls = this.yahooFinanceCalls.filter(call => call.timestamp > oneSecondAgo);
    if (recentCalls.length >= this.YAHOO_SECOND_LIMIT) {
      return { 
        allowed: false, 
        reason: 'Yahoo Finance rate limit exceeded' 
      };
    }

    return { allowed: true };
  }

  /**
   * Alpha Vantage API呼び出しの制限チェック
   */
  async checkAlphaVantageLimit(): Promise<{ allowed: boolean; reason?: string }> {
    const now = Date.now();
    const oneDayAgo = now - (24 * 60 * 60 * 1000);
    const oneMinuteAgo = now - (60 * 1000);

    // 古い記録を削除
    this.alphaVantageCalls = this.alphaVantageCalls.filter(call => call.timestamp > oneDayAgo);

    // 日次制限チェック
    if (this.alphaVantageCalls.length >= this.ALPHA_VANTAGE_DAILY_LIMIT) {
      return { 
        allowed: false, 
        reason: 'Alpha Vantage daily limit exceeded' 
      };
    }

    // 分次制限チェック
    const recentCalls = this.alphaVantageCalls.filter(call => call.timestamp > oneMinuteAgo);
    if (recentCalls.length >= this.ALPHA_VANTAGE_MINUTE_LIMIT) {
      return { 
        allowed: false, 
        reason: 'Alpha Vantage minute limit exceeded' 
      };
    }

    return { allowed: true };
  }

  /**
   * Yahoo Finance API呼び出しを記録
   */
  recordYahooFinanceCall(endpoint: string): void {
    this.yahooFinanceCalls.push({
      timestamp: Date.now(),
      endpoint
    });
  }

  /**
   * Alpha Vantage API呼び出しを記録
   */
  recordAlphaVantageCall(endpoint: string): void {
    this.alphaVantageCalls.push({
      timestamp: Date.now(),
      endpoint
    });
  }

  /**
   * 統計情報の取得
   */
  getStats() {
    const now = Date.now();
    const oneDayAgo = now - (24 * 60 * 60 * 1000);
    const oneHourAgo = now - (60 * 60 * 1000);

    return {
      yahoo: {
        last24h: this.yahooFinanceCalls.filter(call => call.timestamp > oneDayAgo).length,
        lastHour: this.yahooFinanceCalls.filter(call => call.timestamp > oneHourAgo).length,
        dailyLimit: this.YAHOO_DAILY_LIMIT,
        remaining: Math.max(0, this.YAHOO_DAILY_LIMIT - this.yahooFinanceCalls.filter(call => call.timestamp > oneDayAgo).length)
      },
      alphaVantage: {
        last24h: this.alphaVantageCalls.filter(call => call.timestamp > oneDayAgo).length,
        lastHour: this.alphaVantageCalls.filter(call => call.timestamp > oneHourAgo).length,
        dailyLimit: this.ALPHA_VANTAGE_DAILY_LIMIT,
        remaining: Math.max(0, this.ALPHA_VANTAGE_DAILY_LIMIT - this.alphaVantageCalls.filter(call => call.timestamp > oneDayAgo).length)
      }
    };
  }
}

// シングルトンインスタンス
export const apiThrottling = new ApiThrottling();

/**
 * Yahoo Finance API制限チェックミドルウェア
 */
export const yahooFinanceThrottleMiddleware = async (req: any, res: any, next: any) => {
  const check = await apiThrottling.checkYahooFinanceLimit();
  
  if (!check.allowed) {
    console.warn(`Yahoo Finance API limit exceeded: ${check.reason}`);
    return res.status(429).json({
      success: false,
      error: 'External API rate limit exceeded. Please try again later.',
      timestamp: new Date().toISOString()
    });
  }
  
  next();
};

/**
 * Alpha Vantage API制限チェックミドルウェア
 */
export const alphaVantageThrottleMiddleware = async (req: any, res: any, next: any) => {
  const check = await apiThrottling.checkAlphaVantageLimit();
  
  if (!check.allowed) {
    console.warn(`Alpha Vantage API limit exceeded: ${check.reason}`);
    return res.status(429).json({
      success: false,
      error: 'External API rate limit exceeded. Please try again later.',
      timestamp: new Date().toISOString()
    });
  }
  
  next();
};