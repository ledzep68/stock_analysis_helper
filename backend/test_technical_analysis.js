/**
 * テクニカル分析APIのテスト
 */

const axios = require('axios');

async function testTechnicalAnalysisAPI() {
  console.log('🔍 Testing Technical Analysis API for リミックスポイント (3825)');
  
  try {
    // アプリケーションのテクニカル分析APIエンドポイントテスト
    const response = await axios.get('http://localhost:5003/api/technical/3825/indicators', {
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImVtYWlsIjoidGVzdEB0ZXN0LmNvbSIsImlhdCI6MTcxOTAzMzIwMCwiZXhwIjoxNzE5MDM2ODAwfQ.test' // テスト用トークン
      }
    });

    console.log('✅ Technical Analysis API Response:');
    console.log(JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('❌ Technical Analysis API Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

async function testDatabasePriceData() {
  console.log('🔍 Testing SQLite database for price data');
  
  const sqlite3 = require('sqlite3').verbose();
  const path = require('path');
  
  const dbPath = path.join(process.cwd(), 'data', 'stock_analysis.db');
  const db = new sqlite3.Database(dbPath);
  
  return new Promise((resolve, reject) => {
    db.all(`
      SELECT 
        symbol,
        COUNT(*) as record_count,
        MIN(date) as earliest_date,
        MAX(date) as latest_date
      FROM stock_prices 
      WHERE symbol IN ('3825', '7203', 'AAPL')
      GROUP BY symbol
    `, (err, rows) => {
      if (err) {
        console.error('❌ Database query error:', err);
        reject(err);
      } else {
        console.log('📊 Price data in database:');
        rows.forEach(row => {
          console.log(`  ${row.symbol}: ${row.record_count} records (${row.earliest_date} to ${row.latest_date})`);
        });
        resolve(rows);
      }
      db.close();
    });
  });
}

async function main() {
  await testDatabasePriceData();
  console.log('');
  await testTechnicalAnalysisAPI();
}

main();