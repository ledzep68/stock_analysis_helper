/**
 * アプリケーション統合APIテスト
 */

const axios = require('axios');

async function testApplicationAPI() {
  console.log('🔍 Testing Application API Integration for リミックスポイント (3825)');
  
  try {
    // アプリケーションのAPIエンドポイントテスト
    const response = await axios.get('http://localhost:5003/api/companies/3825', {
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImVtYWlsIjoidGVzdEB0ZXN0LmNvbSIsImlhdCI6MTcxOTAzMzIwMCwiZXhwIjoxNzE5MDM2ODAwfQ.test' // テスト用トークン
      }
    });

    console.log('✅ Application API Response:');
    console.log(JSON.stringify(response.data, null, 2));
    
    if (response.data.success && response.data.data) {
      const data = response.data.data;
      console.log('\n📊 Application Stock Data:');
      console.log(`Symbol: ${data.symbol}`);
      console.log(`Price: ¥${data.price}`);
      console.log(`Previous Close: ¥${data.previousClose}`);
      console.log(`Change: ¥${data.change} (${data.changePercent}%)`);
      console.log(`Volume: ${data.volume?.toLocaleString()}`);
      
      // 価格が正確かチェック
      if (data.price >= 500 && data.price <= 650) {
        console.log('✅ Price is within expected range (500-650 yen)');
      } else {
        console.log('❌ Price seems incorrect, should be around 583 yen');
      }
    }
    
  } catch (error) {
    console.error('❌ Application API Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

// 実行
testApplicationAPI();