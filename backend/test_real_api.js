/**
 * 実APIテスト - リミックスポイント（3825.T）の実際の株価取得
 */

const axios = require('axios');

async function testRealYahooFinanceAPI() {
  console.log('🔍 Testing Yahoo Finance API for リミックスポイント (3825.T)');
  
  try {
    const symbol = '3825.T';
    const response = await axios.get(
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`,
      {
        timeout: 10000,
        headers: {
          'User-Agent': 'Stock Analysis Helper/1.0',
          'Accept': 'application/json'
        }
      }
    );

    console.log('✅ Raw API Response:');
    console.log(JSON.stringify(response.data, null, 2));
    
    // データパース
    const result = response.data?.chart?.result?.[0];
    const meta = result?.meta;
    
    if (meta) {
      console.log('\n📊 Parsed Stock Data:');
      console.log(`Symbol: ${meta.symbol}`);
      console.log(`Current Price: ¥${meta.regularMarketPrice || meta.previousClose}`);
      console.log(`Previous Close: ¥${meta.previousClose}`);
      console.log(`Currency: ${meta.currency}`);
      console.log(`Exchange: ${meta.exchangeName}`);
      console.log(`Market State: ${meta.marketState}`);
      console.log(`Volume: ${meta.regularMarketVolume?.toLocaleString()}`);
      
      if (meta.regularMarketPrice && meta.previousClose) {
        const change = meta.regularMarketPrice - meta.previousClose;
        const changePercent = (change / meta.previousClose) * 100;
        console.log(`Change: ¥${change.toFixed(2)} (${changePercent.toFixed(2)}%)`);
      }
    }
    
  } catch (error) {
    console.error('❌ Yahoo Finance API Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

// 実行
testRealYahooFinanceAPI();