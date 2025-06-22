/**
 * API制限機能の包括的テスト
 * モックAPIとテストログを使用した安全なテスト
 */

import { mockApiService, MockApiConfig } from '../src/services/mockApiService';
import { apiLimitManager } from '../src/services/apiLimitManager';
import { testEnvironment } from '../src/config/testEnvironment';
import { TestLogger } from '../src/utils/testLogger';
import fs from 'fs';
import path from 'path';

describe('API Limit Management Tests', () => {
  let testLogger: TestLogger;
  let testLogPath: string;

  beforeAll(() => {
    // テスト環境の初期化
    testEnvironment.displayEnvironmentInfo();
    testLogger = new TestLogger('ApiLimitTest');
    testLogger.startTestSession('API Limit Management', 'Testing rate limits and alerts');
    
    // ログファイルパスの設定
    const timestamp = new Date().toISOString().slice(0, 10);
    testLogPath = path.join(process.cwd(), 'tests', 'logs', `ApiLimitTest-${timestamp}.log`);
  });

  beforeEach(() => {
    // 各テスト前にリセット
    mockApiService.resetTestEnvironment();
    
    // API制限マネージャーのリセット（テスト用）
    if (testEnvironment.shouldResetRateLimitsOnTestStart()) {
      testLogger.info('Resetting API limits for test');
    }
  });

  afterAll(() => {
    testLogger.endTestSession('API Limit Management', {
      totalTests: 6,
      environment: testEnvironment.getConfig().environment
    });
    
    // テストログの出力
    exportTestResults();
  });

  test('Should successfully make API calls within limits', async () => {
    testLogger.info('Test: API calls within limits');
    
    const config: MockApiConfig = {
      provider: 'yahoo',
      simulateDelay: true,
      delayMs: 100
    };

    const startTime = Date.now();
    
    // 制限内でのAPI呼び出し（5回まで）
    for (let i = 1; i <= 3; i++) {
      const canMake = apiLimitManager.canMakeRequest('yahoo');
      expect(canMake.allowed).toBe(true);
      
      if (canMake.allowed) {
        const result = await mockApiService.mockYahooFinanceGetStock('AAPL', config);
        apiLimitManager.recordApiCall('yahoo', true);
        
        expect(result).toHaveProperty('symbol', 'AAPL');
        expect(result.price).toBeGreaterThan(0);
        
        testLogger.info(`API call ${i} successful`, {
          symbol: 'AAPL',
          price: result.price,
          responseTime: Date.now() - startTime
        });
      }
    }

    const stats = mockApiService.getTestStats();
    expect(stats.totalCalls).toBe(3);
    expect(stats.successRate).toBe(1);
    
    testLogger.info('Test completed: API calls within limits', {
      totalCalls: stats.totalCalls,
      successRate: stats.successRate
    });
  });

  test('Should trigger warning alert at 80% usage', async () => {
    testLogger.info('Test: Warning alert at 80% usage');
    
    let alertTriggered = false;
    let alertData: any = null;

    // アラートリスナーの設定
    apiLimitManager.once('apiLimitAlert', (alert) => {
      alertTriggered = true;
      alertData = alert;
      testLogger.warn('Alert triggered', {
        level: alert.level,
        provider: alert.provider,
        message: alert.message
      });
    });

    // Polygon.ioで4回呼び出し（5回制限の80%）
    for (let i = 1; i <= 4; i++) {
      const canMake = apiLimitManager.canMakeRequest('polygon');
      if (canMake.allowed) {
        apiLimitManager.recordApiCall('polygon', true);
      }
    }

    // アラートが発生することを確認
    expect(alertTriggered).toBe(true);
    expect(alertData?.level).toBe('warning');
    expect(alertData?.provider).toBe('polygon');
    
    testLogger.info('Test completed: Warning alert triggered correctly');
  });

  test('Should trigger critical alert at 95% usage', async () => {
    testLogger.info('Test: Critical alert at 95% usage');
    
    let criticalAlertTriggered = false;
    let alertData: any = null;

    apiLimitManager.once('apiLimitAlert', (alert) => {
      if (alert.level === 'critical') {
        criticalAlertTriggered = true;
        alertData = alert;
        testLogger.error('Critical alert triggered', {
          provider: alert.provider,
          message: alert.message,
          remainingCalls: alert.remainingCalls
        });
      }
    });

    // Alpha Vantageで24回呼び出し（25回制限の96%）
    for (let i = 1; i <= 24; i++) {
      const canMake = apiLimitManager.canMakeRequest('alphavantage');
      if (canMake.allowed) {
        apiLimitManager.recordApiCall('alphavantage', true);
      }
    }

    expect(criticalAlertTriggered).toBe(true);
    expect(alertData?.level).toBe('critical');
    expect(alertData?.remainingCalls).toBeLessThanOrEqual(1);
    
    testLogger.info('Test completed: Critical alert triggered correctly');
  });

  test('Should block API calls when limit is reached', async () => {
    testLogger.info('Test: API blocking when limit reached');
    
    // IEXで分単位制限（10回）まで呼び出し
    let blockedCount = 0;
    
    for (let i = 1; i <= 12; i++) {
      const canMake = apiLimitManager.canMakeRequest('iex');
      
      if (canMake.allowed) {
        apiLimitManager.recordApiCall('iex', true);
        testLogger.debug(`API call ${i} allowed`);
      } else {
        blockedCount++;
        testLogger.warn(`API call ${i} blocked`, {
          reason: canMake.reason,
          waitTime: canMake.waitTime
        });
      }
    }

    expect(blockedCount).toBeGreaterThan(0);
    testLogger.info('Test completed: API blocking working correctly', {
      blockedCalls: blockedCount
    });
  });

  test('Should handle API failures gracefully', async () => {
    testLogger.info('Test: API failure handling');
    
    const config: MockApiConfig = {
      provider: 'yahoo',
      simulateFailure: true,
      failureRate: 0.5 // 50%の確率で失敗
    };

    let successCount = 0;
    let failureCount = 0;

    for (let i = 1; i <= 10; i++) {
      try {
        await mockApiService.mockYahooFinanceGetStock('MSFT', config);
        successCount++;
        apiLimitManager.recordApiCall('yahoo', true);
      } catch (error) {
        failureCount++;
        apiLimitManager.recordApiCall('yahoo', false);
        testLogger.warn(`API call ${i} failed`, {
          error: (error as Error).message
        });
      }
    }

    expect(failureCount).toBeGreaterThan(0);
    expect(successCount + failureCount).toBe(10);
    
    testLogger.info('Test completed: API failure handling', {
      successCount,
      failureCount,
      successRate: successCount / 10
    });
  });

  test('Should provide accurate usage statistics', async () => {
    testLogger.info('Test: Usage statistics accuracy');
    
    // 複数プロバイダーでAPI呼び出し
    const callCounts = {
      yahoo: 3,
      alphavantage: 5,
      iex: 2
    };

    for (const [provider, count] of Object.entries(callCounts)) {
      for (let i = 0; i < count; i++) {
        apiLimitManager.recordApiCall(provider, true);
      }
    }

    const stats = apiLimitManager.getUsageStats();
    const availableProviders = apiLimitManager.getAvailableProviders();

    // 統計の検証
    const yahooStats = stats.find(s => s.provider === 'yahoo');
    const alphavantageStats = stats.find(s => s.provider === 'alphavantage');
    const iexStats = stats.find(s => s.provider === 'iex');

    expect(yahooStats?.dailyUsed).toBe(3);
    expect(alphavantageStats?.dailyUsed).toBe(5);
    expect(iexStats?.dailyUsed).toBe(2);
    
    expect(availableProviders).toContain('yahoo');
    expect(availableProviders).toContain('alphavantage');
    expect(availableProviders).toContain('iex');

    testLogger.info('Test completed: Usage statistics', {
      totalProviders: stats.length,
      availableProviders: availableProviders.length,
      usageByProvider: Object.fromEntries(
        stats.map(s => [s.provider, s.dailyUsed])
      )
    });
  });

  // テスト結果のエクスポート
  function exportTestResults(): void {
    testLogger.info('Exporting test results');
    
    const mockStats = mockApiService.getTestStats();
    const apiStats = apiLimitManager.getUsageStats();
    const logStats = testLogger.getLogStats();
    
    const testReport = {
      timestamp: new Date().toISOString(),
      environment: testEnvironment.getConfig(),
      testResults: {
        mockApiStats: mockStats,
        apiLimitStats: apiStats,
        logStats: logStats
      },
      mockApiLog: mockApiService.exportTestLog()
    };

    // テストレポートをファイルに保存
    const reportPath = path.join(process.cwd(), 'tests', 'logs', `test-report-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(testReport, null, 2));
    
    testLogger.info('Test report exported', {
      reportPath,
      totalMockCalls: mockStats.totalCalls,
      logEntries: logStats.totalEntries
    });
    
    console.log(`\\n📊 Test Results Summary:`);
    console.log(`   Mock API Calls: ${mockStats.totalCalls}`);
    console.log(`   Success Rate: ${(mockStats.successRate * 100).toFixed(1)}%`);
    console.log(`   Average Response Time: ${mockStats.averageResponseTime.toFixed(0)}ms`);
    console.log(`   Log Entries: ${logStats.totalEntries}`);
    console.log(`   Test Report: ${reportPath}`);
    console.log(`   Test Log: ${testLogPath}`);
  }
});