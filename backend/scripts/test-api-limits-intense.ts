/**
 * 集中的なAPI制限テスト - アラート発生まで
 */

import { apiLimitManager } from '../src/services/apiLimitManager';

async function testIntenseApiLimits() {
  console.log('🔥 集中的API制限テスト開始\n');

  // アラートリスナーを設定
  apiLimitManager.on('apiLimitAlert', (alert) => {
    console.log(`\n🚨🚨🚨 【${alert.level.toUpperCase()}】 API制限アラート発生! 🚨🚨🚨`);
    console.log(`   プロバイダー: ${alert.provider}`);
    console.log(`   メッセージ: ${alert.message}`);
    console.log(`   残り回数: ${alert.remainingCalls}`);
    console.log(`   リセット時刻: ${alert.resetTime.toLocaleString()}`);
    console.log(`   推奨アクション: ${alert.recommendedAction}`);
    console.log(`🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨\n`);
  });

  // Alpha Vantage (日25件)で警告閾値80%まで到達 = 20件
  console.log('🎯 Alpha Vantage 警告閾値80%到達テスト (20/25件)...');
  for (let i = 1; i <= 20; i++) {
    const canMake = apiLimitManager.canMakeRequest('alphavantage');
    if (canMake.allowed) {
      apiLimitManager.recordApiCall('alphavantage', true);
      if (i % 4 === 0 || i >= 18) {
        console.log(`  ${i}件目処理完了...`);
      }
    }
    
    // 小さな遅延
    await new Promise(resolve => setTimeout(resolve, 10));
  }

  console.log('\n🎯 Alpha Vantage 95%クリティカル閾値到達テスト (24/25件)...');
  for (let i = 21; i <= 24; i++) {
    const canMake = apiLimitManager.canMakeRequest('alphavantage');
    if (canMake.allowed) {
      apiLimitManager.recordApiCall('alphavantage', true);
      console.log(`  ${i}件目処理完了...`);
    }
    
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  // Polygon.io (日5件)で完全制限到達
  console.log('\n🎯 Polygon.io 完全制限到達テスト (5/5件)...');
  for (let i = 1; i <= 6; i++) {
    const canMake = apiLimitManager.canMakeRequest('polygon');
    console.log(`  ${i}件目: ${canMake.allowed ? '✅ 許可' : '🚫 拒否'} ${canMake.reason || ''}`);
    
    if (canMake.allowed) {
      apiLimitManager.recordApiCall('polygon', true);
    }
    
    await new Promise(resolve => setTimeout(resolve, 20));
  }

  // 最終状況確認
  console.log('\n📊 最終状況:');
  const stats = apiLimitManager.getUsageStats();
  stats.forEach(stat => {
    const limits: { [key: string]: number } = {
      yahoo: 2000,
      alphavantage: 25,
      iex: 100,
      polygon: 5
    };
    
    const limit = limits[stat.provider] || 100;
    const percent = (stat.dailyUsed / limit * 100).toFixed(1);
    console.log(`  ${stat.provider}: ${stat.dailyUsed}/${limit} (${percent}%)`);
  });

  // アラート履歴
  console.log('\n📋 発生したアラート:');
  const alerts = apiLimitManager.getRecentAlerts(1);
  alerts.forEach((alert, index) => {
    console.log(`  ${index + 1}. [${alert.level.toUpperCase()}] ${alert.provider}: ${alert.message}`);
  });

  console.log('\n✅ 集中テスト完了');
}

testIntenseApiLimits().catch(console.error);