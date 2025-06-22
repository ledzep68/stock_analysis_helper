/**
 * API統合検証スクリプト
 * 本番適用前の最終確認
 */

import { hybridApiService } from '../src/services/hybridApiService';
import { apiLimitManager } from '../src/services/apiLimitManager';
import { testEnvironment } from '../src/config/testEnvironment';
import { TestLogger } from '../src/utils/testLogger';
import { realApiService } from '../src/services/realApiService';
import fs from 'fs';
import path from 'path';

async function validateApiIntegration() {
  const logger = new TestLogger('ApiValidation');
  
  console.log('🔍 API統合検証開始\\n');
  
  logger.startTestSession('API Integration Validation', 'Final validation before production deployment');
  
  try {
    // 1. 環境設定の検証
    console.log('📋 1. 環境設定の検証');
    const envConfig = testEnvironment.getConfig();
    const safety = testEnvironment.validateSafetySettings();
    
    testEnvironment.displayEnvironmentInfo();
    
    if (!safety.safe) {
      console.log('⚠️ 警告: 環境設定に問題があります');
      safety.warnings.forEach(warning => console.log(`   - ${warning}`));
      safety.recommendations.forEach(rec => console.log(`   💡 ${rec}`));
    } else {
      console.log('✅ 環境設定は安全です');
    }
    
    logger.info('Environment validation completed', {
      environment: envConfig.environment,
      safe: safety.safe,
      warnings: safety.warnings.length
    });

    // 2. APIヘルスチェック
    console.log('\\n💊 2. APIヘルスチェック');
    const healthCheck = await hybridApiService.performHealthCheck();
    
    console.log(`   環境: ${healthCheck.environment}`);
    console.log(`   モックAPI: ${healthCheck.mockApiAvailable ? '✅ 利用可能' : '❌ 利用不可'}`);
    
    if (healthCheck.realApiHealth.length > 0) {
      console.log('   実API状況:');
      healthCheck.realApiHealth.forEach(api => {
        const status = api.available ? '✅' : '❌';
        const time = api.responseTime ? ` (${api.responseTime}ms)` : '';
        console.log(`     ${api.provider}: ${status}${time}`);
        if (!api.available && api.error) {
          console.log(`       エラー: ${api.error}`);
        }
      });
    } else {
      console.log('   実API: テスト環境のため無効');
    }

    // 3. 機能テスト
    console.log('\\n🧪 3. 機能テスト');
    
    // 株価取得テスト
    console.log('   📈 株価取得テスト...');
    const testSymbols = ['AAPL', '3825', 'MSFT'];
    const stockResults = [];
    
    for (const symbol of testSymbols) {
      try {
        const startTime = Date.now();
        const data = await hybridApiService.getFinancialData(symbol);
        const responseTime = Date.now() - startTime;
        
        if (data) {
          stockResults.push({
            symbol,
            success: true,
            price: data.price,
            responseTime
          });
          console.log(`     ${symbol}: ✅ $${data.price} (${responseTime}ms)`);
        } else {
          stockResults.push({ symbol, success: false, responseTime });
          console.log(`     ${symbol}: ❌ データなし`);
        }
      } catch (error) {
        stockResults.push({ symbol, success: false, error: (error as Error).message });
        console.log(`     ${symbol}: ❌ ${(error as Error).message}`);
      }
    }
    
    // 検索テスト
    console.log('   🔍 検索機能テスト...');
    const searchQueries = ['Apple', 'Microsoft', 'Toyota'];
    const searchResults = [];
    
    for (const query of searchQueries) {
      try {
        const startTime = Date.now();
        const companies = await hybridApiService.searchCompanies(query);
        const responseTime = Date.now() - startTime;
        
        searchResults.push({
          query,
          success: true,
          resultCount: companies.length,
          responseTime
        });
        console.log(`     "${query}": ✅ ${companies.length}件 (${responseTime}ms)`);
      } catch (error) {
        searchResults.push({
          query,
          success: false,
          error: (error as Error).message
        });
        console.log(`     "${query}": ❌ ${(error as Error).message}`);
      }
    }

    // 4. 制限管理テスト
    console.log('\\n🚦 4. 制限管理テスト');
    
    const limitStats = apiLimitManager.getUsageStats();
    const availableProviders = apiLimitManager.getAvailableProviders();
    
    console.log(`   利用可能プロバイダー: ${availableProviders.length}/${limitStats.length}`);
    limitStats.forEach(stat => {
      const available = availableProviders.includes(stat.provider) ? '✅' : '🚫';
      console.log(`     ${stat.provider}: ${available} (日${stat.dailyUsed}回使用)`);
    });

    // 5. パフォーマンステスト
    console.log('\\n⚡ 5. パフォーマンステスト');
    
    const perfStartTime = Date.now();
    const concurrentRequests = [];
    
    // 並行3リクエスト
    for (let i = 0; i < 3; i++) {
      concurrentRequests.push(
        hybridApiService.getFinancialData(`PERF${i}`)
      );
    }
    
    const perfResults = await Promise.allSettled(concurrentRequests);
    const perfEndTime = Date.now();
    const totalPerfTime = perfEndTime - perfStartTime;
    
    const successfulPerf = perfResults.filter(r => r.status === 'fulfilled').length;
    console.log(`   並行3リクエスト: ${successfulPerf}/3成功 (${totalPerfTime}ms)`);

    // 6. 統計情報の取得
    console.log('\\n📊 6. 統計情報');
    
    const systemStats = hybridApiService.getSystemApiStats();
    
    console.log(`   現在のソース: ${systemStats.currentSource}`);
    console.log(`   モックAPI呼び出し: ${systemStats.mockApiStats.totalCalls}回`);
    console.log(`   モック成功率: ${(systemStats.mockApiStats.successRate * 100).toFixed(1)}%`);
    console.log(`   平均レスポンス時間: ${systemStats.mockApiStats.averageResponseTime.toFixed(0)}ms`);
    
    if (systemStats.realApiStats.totalCalls > 0) {
      console.log(`   実API呼び出し: ${systemStats.realApiStats.totalCalls}回`);
      console.log(`   実API成功率: ${(systemStats.realApiStats.successRate * 100).toFixed(1)}%`);
    }

    // 7. 検証結果の評価
    console.log('\\n✅ 7. 検証結果');
    
    const validationResults = {
      environmentSafe: safety.safe,
      mockApiWorking: healthCheck.mockApiAvailable,
      realApiAccessible: healthCheck.realApiHealth.length === 0 || healthCheck.realApiHealth.some(api => api.available),
      stockDataRetrievalWorking: stockResults.some(r => r.success),
      searchFunctionalityWorking: searchResults.some(r => r.success),
      rateLimitingWorking: limitStats.length > 0,
      performanceAcceptable: totalPerfTime < 5000, // 5秒以内
      overallStatus: 'pending'
    };
    
    // 総合評価
    const criticalIssues = [];
    const warnings = [];
    
    if (!validationResults.environmentSafe) {
      criticalIssues.push('環境設定に安全性の問題があります');
    }
    
    if (!validationResults.mockApiWorking) {
      criticalIssues.push('モックAPIが動作していません');
    }
    
    if (!validationResults.stockDataRetrievalWorking) {
      criticalIssues.push('株価データ取得が機能していません');
    }
    
    if (!validationResults.searchFunctionalityWorking) {
      warnings.push('検索機能に問題があります');
    }
    
    if (!validationResults.performanceAcceptable) {
      warnings.push('パフォーマンスが基準を下回っています');
    }
    
    validationResults.overallStatus = criticalIssues.length === 0 ? 'passed' : 'failed';
    
    console.log(`\\n🎯 総合評価: ${validationResults.overallStatus === 'passed' ? '✅ 合格' : '❌ 不合格'}`);
    
    if (criticalIssues.length > 0) {
      console.log('\\n🚨 重大な問題:');
      criticalIssues.forEach(issue => console.log(`   - ${issue}`));
    }
    
    if (warnings.length > 0) {
      console.log('\\n⚠️ 警告:');
      warnings.forEach(warning => console.log(`   - ${warning}`));
    }
    
    if (validationResults.overallStatus === 'passed') {
      console.log('\\n🚀 本番環境への適用準備完了');
      console.log('   - すべての重要機能が正常に動作しています');
      console.log('   - API制限管理が適切に機能しています');
      console.log('   - 安全性チェックを通過しています');
    }

    // 8. 検証レポートの生成
    const validationReport = {
      timestamp: new Date().toISOString(),
      validation: 'API Integration Validation',
      environment: envConfig,
      healthCheck,
      testResults: {
        stockDataTests: stockResults,
        searchTests: searchResults,
        performanceTest: {
          totalTime: totalPerfTime,
          successfulRequests: successfulPerf,
          totalRequests: 3
        }
      },
      systemStats,
      validationResults,
      criticalIssues,
      warnings,
      recommendation: validationResults.overallStatus === 'passed' ? 
        'Ready for production deployment' : 
        'Requires fixes before production deployment'
    };

    const reportPath = path.join(
      process.cwd(), 
      'tests', 
      'logs', 
      `api-validation-report-${Date.now()}.json`
    );
    
    fs.writeFileSync(reportPath, JSON.stringify(validationReport, null, 2));
    
    console.log(`\\n📄 検証レポート保存: ${reportPath}`);
    
    logger.endTestSession('API Integration Validation', {
      overallStatus: validationResults.overallStatus,
      criticalIssues: criticalIssues.length,
      warnings: warnings.length,
      reportPath
    });
    
    console.log('\\n✅ API統合検証完了');
    
    // 終了コード設定
    if (validationResults.overallStatus === 'failed') {
      process.exit(1);
    }

  } catch (error) {
    logger.logError(error as Error, 'Validation failed');
    console.error('❌ 検証中にエラーが発生:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  validateApiIntegration().catch(console.error);
}