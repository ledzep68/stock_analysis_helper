/**
 * ポートフォリオ機能のリファクタリング用ヘルパークラス
 */

export class PortfolioRefactoring {
  /**
   * 共通のポートフォリオバリデーション
   */
  static validatePortfolioData(data: {
    name?: string;
    initialCapital?: number;
    currency?: string;
  }): void {
    if (data.name !== undefined && (!data.name || data.name.trim().length === 0)) {
      throw new Error('Portfolio name cannot be empty');
    }
    
    if (data.initialCapital !== undefined && data.initialCapital <= 0) {
      throw new Error('Initial capital must be positive');
    }
    
    if (data.currency && !['JPY', 'USD', 'EUR', 'GBP'].includes(data.currency)) {
      throw new Error('Unsupported currency');
    }
  }

  /**
   * 取引データのバリデーション
   */
  static validateTransactionData(transaction: {
    transactionType: string;
    quantity: number;
    price: number;
    symbol: string;
  }): void {
    if (!['BUY', 'SELL', 'DIVIDEND'].includes(transaction.transactionType)) {
      throw new Error('Invalid transaction type');
    }
    
    if (transaction.quantity <= 0) {
      throw new Error('Quantity must be positive');
    }
    
    if (transaction.price <= 0) {
      throw new Error('Price must be positive');
    }
    
    if (!transaction.symbol || transaction.symbol.trim().length === 0) {
      throw new Error('Symbol is required');
    }
  }

  /**
   * 一意ID生成（リファクタリング済み）
   */
  static generateUniqueId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 日付フォーマット統一
   */
  static formatDate(date: Date): string {
    return date.toISOString();
  }

  /**
   * パーセンテージ計算
   */
  static calculatePercentage(value: number, total: number): number {
    return total > 0 ? (value / total) * 100 : 0;
  }

  /**
   * 数値の安全な丸め処理
   */
  static safeRound(value: number, decimals: number = 2): number {
    return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
  }

  /**
   * 配列の安全な処理
   */
  static safeArrayMap<T, R>(
    array: T[] | undefined | null, 
    mapper: (item: T, index: number) => R
  ): R[] {
    return array ? array.map(mapper) : [];
  }

  /**
   * オブジェクトの深いクローン（循環参照対応）
   */
  static deepClone<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (obj instanceof Date) {
      return new Date(obj.getTime()) as unknown as T;
    }

    if (obj instanceof Array) {
      return obj.map(item => this.deepClone(item)) as unknown as T;
    }

    const cloned = {} as T;
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = this.deepClone(obj[key]);
      }
    }

    return cloned;
  }

  /**
   * エラーメッセージの標準化
   */
  static createStandardError(
    context: string, 
    message: string, 
    originalError?: any
  ): Error {
    const errorMessage = `[${context}] ${message}`;
    const error = new Error(errorMessage);
    
    if (originalError) {
      error.stack = originalError.stack;
    }
    
    return error;
  }

  /**
   * パフォーマンス計算の共通ロジック
   */
  static calculateReturns(startValue: number, endValue: number): {
    absoluteReturn: number;
    percentReturn: number;
  } {
    const absoluteReturn = endValue - startValue;
    const percentReturn = this.calculatePercentage(absoluteReturn, startValue);
    
    return {
      absoluteReturn: this.safeRound(absoluteReturn),
      percentReturn: this.safeRound(percentReturn)
    };
  }

  /**
   * リスクメトリクスの正規化
   */
  static normalizeRiskMetrics(metrics: {
    var95?: number;
    var99?: number;
    beta?: number;
    alpha?: number;
  }): typeof metrics {
    return {
      var95: metrics.var95 ? this.safeRound(Math.abs(metrics.var95)) : 0,
      var99: metrics.var99 ? this.safeRound(Math.abs(metrics.var99)) : 0,
      beta: metrics.beta ? this.safeRound(metrics.beta, 3) : 1,
      alpha: metrics.alpha ? this.safeRound(metrics.alpha, 4) : 0
    };
  }

  /**
   * データベース操作の共通エラーハンドリング
   */
  static async safeDbOperation<T>(
    operation: () => Promise<T>,
    context: string
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      throw this.createStandardError(context, 'Database operation failed', error);
    }
  }

  /**
   * 非同期操作のバッチ処理
   */
  static async batchProcess<T, R>(
    items: T[],
    processor: (item: T, index: number) => Promise<R>,
    batchSize: number = 10
  ): Promise<R[]> {
    const results: R[] = [];
    
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map((item, index) => processor(item, i + index))
      );
      results.push(...batchResults);
    }
    
    return results;
  }

  /**
   * 統計計算の共通ロジック
   */
  static calculateStatistics(values: number[]): {
    mean: number;
    median: number;
    stdDev: number;
    min: number;
    max: number;
  } {
    if (values.length === 0) {
      return { mean: 0, median: 0, stdDev: 0, min: 0, max: 0 };
    }

    const sorted = [...values].sort((a, b) => a - b);
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const median = sorted.length % 2 === 0
      ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : sorted[Math.floor(sorted.length / 2)];
    
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    return {
      mean: this.safeRound(mean),
      median: this.safeRound(median),
      stdDev: this.safeRound(stdDev),
      min: this.safeRound(Math.min(...values)),
      max: this.safeRound(Math.max(...values))
    };
  }

  /**
   * キャッシュキーの生成
   */
  static generateCacheKey(prefix: string, ...parts: (string | number)[]): string {
    return `${prefix}:${parts.join(':')}`;
  }

  /**
   * レート制限のヘルパー
   */
  static createRateLimiter(maxRequests: number, windowMs: number) {
    const requests = new Map<string, number[]>();

    return (identifier: string): boolean => {
      const now = Date.now();
      const windowStart = now - windowMs;
      
      if (!requests.has(identifier)) {
        requests.set(identifier, []);
      }
      
      const userRequests = requests.get(identifier)!;
      
      // 古いリクエストを削除
      const validRequests = userRequests.filter(time => time > windowStart);
      
      if (validRequests.length >= maxRequests) {
        return false; // レート制限に達している
      }
      
      validRequests.push(now);
      requests.set(identifier, validRequests);
      
      return true; // リクエスト許可
    };
  }

  /**
   * メモリ効率的な大きなデータセットの処理
   */
  static async processLargeDataset<T, R>(
    data: T[],
    processor: (chunk: T[]) => Promise<R[]>,
    chunkSize: number = 1000
  ): Promise<R[]> {
    const results: R[] = [];
    
    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.slice(i, i + chunkSize);
      const chunkResults = await processor(chunk);
      results.push(...chunkResults);
      
      // ガベージコレクションのために少し待機
      if (i % (chunkSize * 10) === 0) {
        await new Promise(resolve => setImmediate(resolve));
      }
    }
    
    return results;
  }
}