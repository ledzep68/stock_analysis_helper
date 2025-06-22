/**
 * API制限テストスクリプト
 * 制限到達時のアラート動作を確認
 */

import { apiLimitManager } from '../src/services/apiLimitManager';

async function testApiLimits() {
  console.log('🧪 API制限テスト開始\n');

  // アラートリスナーを設定
  apiLimitManager.on('apiLimitAlert', (alert) => {
    console.log(`\n🚨 【${alert.level.toUpperCase()}】 API制限アラート発生!`);
    console.log(`   プロバイダー: ${alert.provider}`);
    console.log(`   メッセージ: ${alert.message}`);
    console.log(`   残り回数: ${alert.remainingCalls}`);
    console.log(`   リセット時刻: ${alert.resetTime.toLocaleString()}`);
    console.log(`   推奨アクション: ${alert.recommendedAction}\n`);
  });

  // 1. 通常の使用状況をシミュレート
  console.log('📊 現在の制限状況:');
  const initialStats = apiLimitManager.getUsageStats();
  initialStats.forEach(stat => {
    console.log(`  ${stat.provider}: 日${stat.dailyUsed}回, 時${stat.hourlyUsed}回`);
  });

  // 2. Yahoo Financeでの制限テスト（分単位制限: 5回）
  console.log('\n🔄 Yahoo Finance 分単位制限テスト (5回まで)...');
  for (let i = 1; i <= 7; i++) {
    const canMake = apiLimitManager.canMakeRequest('yahoo');
    console.log(`  ${i}回目: ${canMake.allowed ? '✅ 許可' : '🚫 拒否'} ${canMake.reason || ''}`);
    
    if (canMake.allowed) {
      apiLimitManager.recordApiCall('yahoo', true);
    } else {
      console.log(`    待機時間: ${canMake.waitTime}秒`);
      break;
    }
  }

  // 3. Alpha Vantageでの制限テスト（日単位制限: 25回）
  console.log('\n🔄 Alpha Vantage 制限到達テスト...');
  
  // 20回までAPI呼び出しをシミュレート（警告閾値80%到達）
  for (let i = 1; i <= 22; i++) {
    const canMake = apiLimitManager.canMakeRequest('alphavantage');
    if (canMake.allowed) {
      apiLimitManager.recordApiCall('alphavantage', true);
      if (i % 5 === 0) {
        console.log(`  ${i}回目完了`);
      }
    }
  }

  // 4. 現在の状況確認
  console.log('\n📊 制限テスト後の状況:');
  const finalStats = apiLimitManager.getUsageStats();
  finalStats.forEach(stat => {
    const configs: { [key: string]: { daily: number; hourly: number; minute: number } } = {
      yahoo: { daily: 2000, hourly: 100, minute: 5 },
      alphavantage: { daily: 25, hourly: 25, minute: 5 },
      iex: { daily: 100, hourly: 100, minute: 10 },
      polygon: { daily: 5, hourly: 5, minute: 5 }
    };
    
    const config = configs[stat.provider];
    if (config) {
      const dailyPercent = (stat.dailyUsed / config.daily * 100).toFixed(1);
      console.log(`  ${stat.provider}: 日${stat.dailyUsed}/${config.daily} (${dailyPercent}%)`);
    }
  });

  // 5. 利用可能プロバイダーの確認
  console.log('\n🌐 利用可能プロバイダー:');
  const available = apiLimitManager.getAvailableProviders();
  if (available.length > 0) {
    console.log(`  ${available.join(', ')}`);
  } else {
    console.log('  ❌ 利用可能なプロバイダーなし');
  }

  // 6. アラート履歴の確認
  console.log('\n📋 最近のアラート履歴:');
  const alerts = apiLimitManager.getRecentAlerts(1);
  if (alerts.length > 0) {
    alerts.forEach((alert, index) => {
      console.log(`  ${index + 1}. [${alert.level}] ${alert.provider}: ${alert.message}`);
    });
  } else {
    console.log('  アラートなし');
  }

  console.log('\n✅ API制限テスト完了');
}

// アラート発生の詳細ログを有効化
process.env.NODE_ENV = 'development';

testApiLimits().catch(console.error);