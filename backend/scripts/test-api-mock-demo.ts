/**
 * モックAPIシステムのデモンストレーション
 * 安全なテスト環境での動作確認
 */

import { mockApiService, MockApiConfig } from '../src/services/mockApiService';
import { apiLimitManager } from '../src/services/apiLimitManager';
import { testEnvironment } from '../src/config/testEnvironment';
import { TestLogger } from '../src/utils/testLogger';
import fs from 'fs';
import path from 'path';

async function runMockApiDemo() {
  const logger = new TestLogger('MockApiDemo');
  
  console.log('🎭 モックAPIシステム デモンストレーション\\n');
  
  // 環境情報の表示
  testEnvironment.displayEnvironmentInfo();
  
  logger.startTestSession('Mock API Demonstration', 'Demonstrating safe API testing');
  
  try {
    // 1. 基本的なモックAPI呼び出し
    console.log('📡 1. 基本的なモックAPI呼び出しテスト');
    
    const basicConfig: MockApiConfig = {
      provider: 'yahoo',
      simulateDelay: true,
      delayMs: 200
    };
    
    const startTime = Date.now();
    const stockData = await mockApiService.mockYahooFinanceGetStock('AAPL', basicConfig);
    const responseTime = Date.now() - startTime;
    
    console.log(`   ✅ Yahoo Finance Mock: AAPL = $${stockData.price} (${responseTime}ms)`);
    logger.logApiCall('yahoo', 'getStock', { symbol: 'AAPL' }, stockData, responseTime);
    
    // 2. 制限チェックとアラート
    console.log('\\n🚨 2. API制限アラートテスト');
    
    let alertCount = 0;
    apiLimitManager.on('apiLimitAlert', (alert) => {
      alertCount++;
      console.log(`   🚨 アラート${alertCount}: [${alert.level.toUpperCase()}] ${alert.provider} - ${alert.message}`);
      logger.warn('API Limit Alert', alert);
    });
    
    // 制限に近づくまでAPI呼び出し
    console.log('   制限テスト開始 (Polygon.io: 5回制限)...');
    for (let i = 1; i <= 6; i++) {
      const canMake = apiLimitManager.canMakeRequest('polygon');
      
      if (canMake.allowed) {
        const mockData = await mockApiService.mockYahooFinanceGetStock(`TEST${i}`, { provider: 'polygon' });
        apiLimitManager.recordApiCall('polygon', true);
        console.log(`   📊 ${i}回目: ✅ 成功 ($${mockData.price})`);
      } else {
        console.log(`   📊 ${i}回目: 🚫 制限 - ${canMake.reason} (待機: ${canMake.waitTime}秒)`);
        break;
      }
      
      // 小さな遅延
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    // 3. 失敗シミュレーション
    console.log('\\n💥 3. API失敗シミュレーションテスト');
    
    const failureConfig: MockApiConfig = {
      provider: 'alphavantage',
      simulateFailure: true,
      failureRate: 0.3 // 30%の確率で失敗
    };
    
    let successCount = 0;
    let failureCount = 0;
    
    for (let i = 1; i <= 10; i++) {
      try {
        await mockApiService.mockAlphaVantageGetStock(`STOCK${i}`, failureConfig);
        successCount++;
        console.log(`   ${i}回目: ✅ 成功`);
      } catch (error) {
        failureCount++;
        console.log(`   ${i}回目: ❌ 失敗 - ${(error as Error).message}`);
        logger.logError(error as Error, { attempt: i });
      }
    }
    
    console.log(`   結果: 成功${successCount}回, 失敗${failureCount}回 (成功率: ${(successCount/10*100).toFixed(1)}%)`);
    
    // 4. 検索機能のモック
    console.log('\\n🔍 4. 検索機能モックテスト');
    
    const searchQueries = ['Apple', 'Microsoft', 'Tesla'];
    for (const query of searchQueries) {
      const results = await mockApiService.mockYahooFinanceSearch(query);
      console.log(`   "${query}" 検索: ${results.length}件の結果`);
      
      results.forEach(result => {
        console.log(`     - ${result.symbol}: ${result.name}`);
      });
    }
    
    // 5. パフォーマンス測定
    console.log('\\n⏱️ 5. パフォーマンステスト');
    
    const perfStartTime = Date.now();
    const concurrentCalls = [];
    
    for (let i = 0; i < 5; i++) {
      concurrentCalls.push(
        mockApiService.mockYahooFinanceGetStock(`PERF${i}`, {
          provider: 'yahoo',
          simulateDelay: true,
          delayMs: 100 + Math.random() * 200
        })
      );
    }
    
    const results = await Promise.all(concurrentCalls);
    const totalTime = Date.now() - perfStartTime;
    
    console.log(`   並行5API呼び出し: ${totalTime}ms`);
    logger.logPerformance('Concurrent API Calls', perfStartTime, Date.now(), {
      callCount: 5,
      results: results.length
    });
    
    // 6. 統計情報とログ出力
    console.log('\\n📊 6. 統計情報とテストログ');
    
    const mockStats = mockApiService.getTestStats();
    const apiStats = apiLimitManager.getUsageStats();
    const logStats = logger.getLogStats();
    
    console.log(`\\n📈 テスト結果サマリー:`);
    console.log(`   モックAPI呼び出し: ${mockStats.totalCalls}回`);
    console.log(`   成功率: ${(mockStats.successRate * 100).toFixed(1)}%`);
    console.log(`   平均レスポンス時間: ${mockStats.averageResponseTime.toFixed(0)}ms`);
    console.log(`   プロバイダー別呼び出し:`);
    
    Object.entries(mockStats.callsByProvider).forEach(([provider, count]) => {
      console.log(`     ${provider}: ${count}回`);
    });
    
    console.log(`\\n📋 API制限状況:`);
    apiStats.forEach(stat => {
      console.log(`   ${stat.provider}: 日${stat.dailyUsed}回使用 ${stat.isLimited ? '🚫' : '✅'}`);
    });
    
    console.log(`\\n📝 ログ統計:`);
    console.log(`   総ログエントリ: ${logStats.totalEntries}件`);
    console.log(`   レベル別:`);
    Object.entries(logStats.entriesByLevel).forEach(([level, count]) => {
      console.log(`     ${level}: ${count}件`);
    });
    
    // テストレポートの生成
    const reportData = {
      timestamp: new Date().toISOString(),
      demoSession: 'Mock API Demonstration',
      environment: testEnvironment.getConfig(),
      results: {
        mockApiStats: mockStats,
        apiLimitStats: apiStats,
        logStats: logStats,
        alertsTriggered: alertCount,
        performanceTest: {
          concurrentCalls: 5,
          totalTime: totalTime
        }
      },
      detailedLogs: {
        mockApiCalls: mockApiService.exportTestLog(),
        testLog: logger.readLogFile()
      }
    };
    
    // レポートファイルの保存
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = path.join(process.cwd(), 'tests', 'logs', `mock-api-demo-report-${timestamp}.json`);
    
    fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
    
    console.log(`\\n💾 テストレポート保存完了:`);
    console.log(`   ファイル: ${reportPath}`);
    console.log(`   サイズ: ${Math.round(fs.statSync(reportPath).size / 1024)}KB`);
    
    logger.endTestSession('Mock API Demonstration', {
      totalApiCalls: mockStats.totalCalls,
      alertsTriggered: alertCount,
      reportPath
    });
    
    console.log(`\\n✅ モックAPIデモンストレーション完了`);
    console.log(`🔒 実際のAPI呼び出しは一切行われませんでした`);
    
  } catch (error) {
    logger.logError(error as Error, 'Demo execution failed');
    console.error('❌ デモ実行中にエラーが発生:', error);
  }
}

// デモの実行
if (require.main === module) {
  runMockApiDemo().catch(console.error);
}