import { db } from '../config/database';
import { APP_CONSTANTS } from '../utils/constants';

export interface CacheEntry<T = any> {
  key: string;
  value: T;
  expiresAt: Date;
  createdAt: Date;
  accessCount: number;
  lastAccessed: Date;
  category?: string;
  tags?: string[];
}

export interface CacheStats {
  totalEntries: number;
  hitRate: number;
  memoryUsage: number;
  categories: Record<string, number>;
  mostAccessed: Array<{ key: string; count: number }>;
}

class CacheService {
  private memoryCache = new Map<string, CacheEntry>();
  private cacheHits = 0;
  private cacheMisses = 0;
  private maxMemoryEntries = APP_CONSTANTS.CACHE.MAX_MEMORY_ENTRIES;
  private defaultTTL = APP_CONSTANTS.CACHE.DEFAULT_TTL;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startCleanupJob();
  }

  /**
   * キャッシュデータ取得
   */
  async get<T>(key: string, category?: string): Promise<T | null> {
    // メモリキャッシュから取得
    const memoryEntry = this.memoryCache.get(key);
    if (memoryEntry && memoryEntry.expiresAt > new Date()) {
      memoryEntry.accessCount++;
      memoryEntry.lastAccessed = new Date();
      this.cacheHits++;
      console.log(`🎯 Cache HIT (memory): ${key}`);
      return memoryEntry.value as T;
    }

    // データベースキャッシュから取得
    try {
      const row = await db.get(`
        SELECT * FROM cache_entries 
        WHERE key = ? AND expires_at > datetime('now')
      `, [key]);

      if (row) {
        const entry: CacheEntry<T> = {
          key: row.key,
          value: JSON.parse(row.value),
          expiresAt: new Date(row.expires_at),
          createdAt: new Date(row.created_at),
          accessCount: row.access_count + 1,
          lastAccessed: new Date(),
          category: row.category,
          tags: row.tags ? JSON.parse(row.tags) : []
        };

        // メモリキャッシュに昇格
        this.setMemoryCache(entry);

        // アクセス回数更新
        await db.run(`
          UPDATE cache_entries 
          SET access_count = access_count + 1, last_accessed = datetime('now')
          WHERE key = ?
        `, [key]);

        this.cacheHits++;
        console.log(`🎯 Cache HIT (database): ${key}`);
        return entry.value;
      }
    } catch (error) {
      console.error('Cache database error:', error);
    }

    this.cacheMisses++;
    console.log(`❌ Cache MISS: ${key}`);
    return null;
  }

  /**
   * キャッシュデータ設定
   */
  async set<T>(
    key: string, 
    value: T, 
    ttlMs: number = this.defaultTTL,
    options: {
      category?: string;
      tags?: string[];
      forceMemory?: boolean;
    } = {}
  ): Promise<void> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlMs);

    const entry: CacheEntry<T> = {
      key,
      value,
      expiresAt,
      createdAt: now,
      accessCount: 0,
      lastAccessed: now,
      category: options.category,
      tags: options.tags || []
    };

    // メモリキャッシュに設定
    this.setMemoryCache(entry);

    // データベースキャッシュに設定
    try {
      await db.run(`
        INSERT OR REPLACE INTO cache_entries (
          key, value, expires_at, created_at, access_count, 
          last_accessed, category, tags
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        key,
        JSON.stringify(value),
        expiresAt.toISOString(),
        now.toISOString(),
        0,
        now.toISOString(),
        options.category || null,
        JSON.stringify(options.tags || [])
      ]);

      console.log(`💾 Cache SET: ${key} (TTL: ${ttlMs}ms)`);
    } catch (error) {
      console.error('Cache database set error:', error);
    }
  }

  /**
   * キャッシュデータ削除
   */
  async delete(key: string): Promise<void> {
    this.memoryCache.delete(key);
    
    try {
      await db.run('DELETE FROM cache_entries WHERE key = ?', [key]);
      console.log(`🗑️ Cache DELETE: ${key}`);
    } catch (error) {
      console.error('Cache database delete error:', error);
    }
  }

  /**
   * カテゴリ別キャッシュクリア
   */
  async clearCategory(category: string): Promise<void> {
    // メモリキャッシュからカテゴリ削除
    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.category === category) {
        this.memoryCache.delete(key);
      }
    }

    // データベースからカテゴリ削除
    try {
      const result = await db.run(
        'DELETE FROM cache_entries WHERE category = ?', 
        [category]
      );
      console.log(`🗑️ Cache CLEAR category: ${category} (${result.changes} entries)`);
    } catch (error) {
      console.error('Cache database clear category error:', error);
    }
  }

  /**
   * タグ別キャッシュクリア
   */
  async clearByTag(tag: string): Promise<void> {
    // メモリキャッシュからタグ削除
    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.tags?.includes(tag)) {
        this.memoryCache.delete(key);
      }
    }

    // データベースからタグ削除
    try {
      const result = await db.run(`
        DELETE FROM cache_entries 
        WHERE tags LIKE ?
      `, [`%"${tag}"%`]);
      console.log(`🗑️ Cache CLEAR tag: ${tag} (${result.changes} entries)`);
    } catch (error) {
      console.error('Cache database clear tag error:', error);
    }
  }

  /**
   * キャッシュ統計取得
   */
  async getStats(): Promise<CacheStats> {
    const memoryEntries = this.memoryCache.size;
    const totalRequests = this.cacheHits + this.cacheMisses;
    const hitRate = totalRequests > 0 ? this.cacheHits / totalRequests : 0;

    // データベース統計
    const dbStats = await db.get(`
      SELECT 
        COUNT(*) as total_entries,
        COUNT(DISTINCT category) as categories_count
      FROM cache_entries
    `);

    const categoryStats = await db.all(`
      SELECT category, COUNT(*) as count 
      FROM cache_entries 
      GROUP BY category
    `);

    const mostAccessed = await db.all(`
      SELECT key, access_count 
      FROM cache_entries 
      ORDER BY access_count DESC 
      LIMIT 10
    `);

    const categories: Record<string, number> = {};
    categoryStats.forEach(stat => {
      categories[stat.category || 'uncategorized'] = stat.count;
    });

    return {
      totalEntries: dbStats.total_entries,
      hitRate: Math.round(hitRate * 100) / 100,
      memoryUsage: memoryEntries,
      categories,
      mostAccessed: mostAccessed.map(item => ({
        key: item.key,
        count: item.access_count
      }))
    };
  }

  /**
   * メモリキャッシュ設定
   */
  private setMemoryCache<T>(entry: CacheEntry<T>): void {
    // メモリ制限チェック
    if (this.memoryCache.size >= this.maxMemoryEntries) {
      this.evictLeastRecentlyUsed();
    }

    this.memoryCache.set(entry.key, entry);
  }

  /**
   * LRU削除
   */
  private evictLeastRecentlyUsed(): void {
    let oldestKey = '';
    let oldestTime = Date.now();

    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.lastAccessed.getTime() < oldestTime) {
        oldestTime = entry.lastAccessed.getTime();
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.memoryCache.delete(oldestKey);
      console.log(`🗑️ Evicted LRU cache entry: ${oldestKey}`);
    }
  }

  /**
   * クリーンアップジョブ開始
   */
  private startCleanupJob(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, APP_CONSTANTS.CACHE.CLEANUP_INTERVAL);
  }

  /**
   * 期限切れキャッシュクリーンアップ
   */
  private async cleanup(): Promise<void> {
    const now = new Date();

    // メモリキャッシュクリーンアップ
    let memoryCleanedCount = 0;
    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.expiresAt <= now) {
        this.memoryCache.delete(key);
        memoryCleanedCount++;
      }
    }

    // データベースキャッシュクリーンアップ
    try {
      const result = await db.run(
        'DELETE FROM cache_entries WHERE expires_at <= datetime("now")'
      );

      if (memoryCleanedCount > 0 || result.changes > 0) {
        console.log(`🧹 Cache cleanup: ${memoryCleanedCount} memory + ${result.changes} database entries`);
      }
    } catch (error) {
      console.error('Cache cleanup error:', error);
    }
  }

  /**
   * キャッシュミドルウェア作成
   */
  createMiddleware(defaultTTL: number = this.defaultTTL, category?: string) {
    return (req: any, res: any, next: any) => {
      const originalSend = res.send;
      const cacheKey = `api:${req.method}:${req.originalUrl}`;

      // キャッシュ取得試行
      this.get(cacheKey, category).then(cachedData => {
        if (cachedData) {
          return res.json(cachedData);
        }

        // レスポンスをインターセプト
        res.send = function(data: any) {
          try {
            const jsonData = typeof data === 'string' ? JSON.parse(data) : data;
            // 成功レスポンスのみキャッシュ
            if (res.statusCode === 200) {
              cacheService.set(cacheKey, jsonData, defaultTTL, { category });
            }
          } catch (error) {
            console.error('Cache middleware error:', error);
          }
          return originalSend.call(this, data);
        };

        next();
      }).catch(error => {
        console.error('Cache middleware get error:', error);
        next();
      });
    };
  }

  /**
   * サービス停止
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.memoryCache.clear();
  }
}

export const cacheService = new CacheService();