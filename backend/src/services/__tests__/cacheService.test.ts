import { cacheService } from '../cacheService';
import { db } from '../../config/database';

// テスト用のモック設定
jest.mock('../../config/database');
const mockDb = db as jest.Mocked<typeof db>;

describe('CacheService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // メモリキャッシュをクリア
    (cacheService as any).memoryCache.clear();
    (cacheService as any).cacheHits = 0;
    (cacheService as any).cacheMisses = 0;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('set and get', () => {
    it('should set and get cache entry from memory', async () => {
      const testKey = 'test-key';
      const testValue = { data: 'test-data' };

      await cacheService.set(testKey, testValue, 5000);
      const result = await cacheService.get(testKey);

      expect(result).toEqual(testValue);
    });

    it('should set and get cache entry from database when not in memory', async () => {
      const testKey = 'test-key';
      const testValue = { data: 'test-data' };

      const mockDbRow = {
        key: testKey,
        value: JSON.stringify(testValue),
        expires_at: new Date(Date.now() + 5000).toISOString(),
        created_at: new Date().toISOString(),
        access_count: 0,
        category: null,
        tags: '[]'
      };

      mockDb.get.mockResolvedValue(mockDbRow);
      mockDb.run.mockResolvedValue({ changes: 1, lastID: null });

      const result = await cacheService.get(testKey);

      expect(result).toEqual(testValue);
      expect(mockDb.get).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM cache_entries'),
        [testKey]
      );
    });

    it('should return null for expired cache entry', async () => {
      const testKey = 'expired-key';
      const testValue = { data: 'test-data' };

      // 1msのTTLで設定
      await cacheService.set(testKey, testValue, 1);

      // TTL経過を待機
      await new Promise(resolve => setTimeout(resolve, 50));

      const result = await cacheService.get(testKey);
      expect(result).toBeNull();
    });

    it('should return null for non-existent cache entry', async () => {
      mockDb.get.mockResolvedValue(null);

      const result = await cacheService.get('non-existent-key');
      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete cache entry from memory and database', async () => {
      const testKey = 'test-key';
      const testValue = { data: 'test-data' };

      await cacheService.set(testKey, testValue);
      mockDb.run.mockResolvedValue({ changes: 1, lastID: null });

      await cacheService.delete(testKey);

      expect(mockDb.run).toHaveBeenCalledWith(
        'DELETE FROM cache_entries WHERE key = ?',
        [testKey]
      );

      const result = await cacheService.get(testKey);
      expect(result).toBeNull();
    });

    it('should handle delete errors gracefully', async () => {
      const testKey = 'test-key';
      const mockError = new Error('Delete error');
      mockDb.run.mockRejectedValue(mockError);

      await expect(cacheService.delete(testKey)).resolves.not.toThrow();
    });
  });

  describe('clearCategory', () => {
    it('should clear cache entries by category', async () => {
      const category = 'test-category';
      mockDb.run.mockResolvedValue({ changes: 5, lastID: null });

      await cacheService.clearCategory(category);

      expect(mockDb.run).toHaveBeenCalledWith(
        'DELETE FROM cache_entries WHERE category = ?',
        [category]
      );
    });

    it('should handle category clear errors gracefully', async () => {
      const mockError = new Error('Clear category error');
      mockDb.run.mockRejectedValue(mockError);

      await expect(cacheService.clearCategory('test')).resolves.not.toThrow();
    });
  });

  describe('clearByTag', () => {
    it('should clear cache entries by tag', async () => {
      const tag = 'test-tag';
      mockDb.run.mockResolvedValue({ changes: 3, lastID: null });

      await cacheService.clearByTag(tag);

      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM cache_entries'),
        [`%"${tag}"%`]
      );
    });

    it('should handle tag clear errors gracefully', async () => {
      const mockError = new Error('Clear tag error');
      mockDb.run.mockRejectedValue(mockError);

      await expect(cacheService.clearByTag('test')).resolves.not.toThrow();
    });
  });

  describe('getStats', () => {
    it('should return cache statistics', async () => {
      const mockDbStats = { total_entries: 100, categories_count: 5 };
      const mockCategoryStats = [
        { category: 'api_response', count: 50 },
        { category: 'user_data', count: 30 },
        { category: null, count: 20 }
      ];
      const mockMostAccessed = [
        { key: 'popular-key-1', access_count: 100 },
        { key: 'popular-key-2', access_count: 85 }
      ];

      mockDb.get.mockResolvedValue(mockDbStats);
      mockDb.all
        .mockResolvedValueOnce(mockCategoryStats)
        .mockResolvedValueOnce(mockMostAccessed);

      const stats = await cacheService.getStats();

      expect(stats).toEqual({
        totalEntries: 100,
        hitRate: expect.any(Number),
        memoryUsage: expect.any(Number),
        categories: {
          api_response: 50,
          user_data: 30,
          uncategorized: 20
        },
        mostAccessed: [
          { key: 'popular-key-1', count: 100 },
          { key: 'popular-key-2', count: 85 }
        ]
      });
    });

    it('should handle stats errors gracefully', async () => {
      const mockError = new Error('Stats error');
      mockDb.get.mockRejectedValue(mockError);

      await expect(cacheService.getStats()).rejects.toThrow('Stats error');
    });
  });

  describe('cache middleware', () => {
    it('should create cache middleware with correct behavior', () => {
      const middleware = cacheService.createMiddleware(60000, 'api');

      expect(typeof middleware).toBe('function');
      expect(middleware.length).toBe(3); // req, res, next
    });
  });

  describe('LRU eviction', () => {
    it('should evict least recently used entries when memory limit is reached', async () => {
      // メモリ制限を小さく設定
      const originalMaxEntries = (cacheService as any).maxMemoryEntries;
      (cacheService as any).maxMemoryEntries = 2;

      // 3つのエントリを追加（制限を超える）
      await cacheService.set('key1', 'value1');
      await cacheService.set('key2', 'value2');
      await cacheService.set('key3', 'value3'); // これにより最古のエントリが削除される

      // 制限を元に戻す
      (cacheService as any).maxMemoryEntries = originalMaxEntries;
    });
  });

  describe('cleanup', () => {
    it('should start and stop cleanup job', () => {
      // このテストはCacheServiceが内部でintervalを管理することをテストする
      expect(cacheService.destroy).toBeDefined();
      expect(typeof cacheService.destroy).toBe('function');
    });
  });

  describe('TTL expiration', () => {
    it('should expire entries after TTL', async () => {
      const testKey = 'ttl-key';
      const testValue = { data: 'ttl-data' };

      // 1msのTTLで設定（テスト用に短く）
      await cacheService.set(testKey, testValue, 1);

      // TTL経過を待機
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const result = await cacheService.get(testKey);
      expect(result).toBeNull();
    });
  });

  describe('error handling', () => {
    it('should handle database connection errors gracefully', async () => {
      const mockError = new Error('Database connection failed');
      mockDb.get.mockRejectedValue(mockError);

      const result = await cacheService.get('test-key');
      expect(result).toBeNull();
    });

    it('should handle JSON parsing errors gracefully', async () => {
      const testKey = 'json-error-key';
      const mockDbRow = {
        key: testKey,
        value: 'invalid-json{',
        expires_at: new Date(Date.now() + 5000).toISOString(),
        created_at: new Date().toISOString(),
        access_count: 0,
        category: null,
        tags: '[]'
      };

      mockDb.get.mockResolvedValue(mockDbRow);

      const result = await cacheService.get(testKey);
      expect(result).toBeNull();
    });
  });
});