/**
 * 認証付きテクニカル分析APIのテスト
 */

const axios = require('axios');

async function loginAndTest() {
  console.log('🔐 Logging in to get valid token');
  
  try {
    // まずログインして有効なトークンを取得
    const loginResponse = await axios.post('http://localhost:5003/api/auth/login', {
      email: 'admin@example.com',
      password: 'admin123'
    });

    if (!loginResponse.data.success) {
      console.error('❌ Login failed:', loginResponse.data.error);
      return;
    }

    const token = loginResponse.data.data.token;
    console.log('✅ Login successful, token obtained');

    // テクニカル分析APIをテスト
    console.log('🔍 Testing Technical Analysis API for リミックスポイント (3825)');
    
    const response = await axios.get('http://localhost:5003/api/technical/3825/indicators', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('✅ Technical Analysis API Response:');
    console.log(JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('❌ API Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

async function checkStockPricesTable() {
  console.log('🔍 Checking stock_prices table for symbol 3825');
  
  const sqlite3 = require('sqlite3').verbose();
  const path = require('path');
  
  const dbPath = path.join(process.cwd(), 'data', 'stock_analysis.db');
  const db = new sqlite3.Database(dbPath);
  
  return new Promise((resolve, reject) => {
    // 3825のデータを確認
    db.all(`
      SELECT 
        symbol,
        date,
        close_price,
        high_price,
        low_price,
        volume
      FROM stock_prices 
      WHERE symbol = '3825'
      ORDER BY date DESC
      LIMIT 5
    `, (err, rows) => {
      if (err) {
        console.error('❌ Database query error:', err);
        reject(err);
      } else {
        console.log('📊 Recent price data for symbol 3825:');
        if (rows.length === 0) {
          console.log('  ❌ No price data found for symbol 3825');
          console.log('  This is likely the cause of the technical analysis error');
        } else {
          rows.forEach(row => {
            console.log(`  ${row.date}: Close=¥${row.close_price}, High=¥${row.high_price}, Low=¥${row.low_price}, Vol=${row.volume}`);
          });
        }
        resolve(rows);
      }
      db.close();
    });
  });
}

async function main() {
  await checkStockPricesTable();
  console.log('');
  await loginAndTest();
}

main();