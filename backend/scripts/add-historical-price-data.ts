/**
 * 履歴価格データの追加スクリプト
 * テクニカル分析に必要な価格データを生成
 */

import { sqliteDb } from '../src/config/sqlite';

interface PriceData {
  symbol: string;
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// 現実的な株価データを生成する関数
function generateRealisticPriceData(symbol: string, basePrice: number, days: number): PriceData[] {
  const data: PriceData[] = [];
  const today = new Date();
  
  let currentPrice = basePrice;
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    // リアルな価格変動を生成（±3%の範囲でランダム変動）
    const volatility = 0.03;
    const randomChange = (Math.random() - 0.5) * volatility;
    currentPrice = currentPrice * (1 + randomChange);
    
    // OHLC価格を生成
    const open = currentPrice * (1 + (Math.random() - 0.5) * 0.02);
    const close = currentPrice * (1 + (Math.random() - 0.5) * 0.02);
    const high = Math.max(open, close) * (1 + Math.random() * 0.03);
    const low = Math.min(open, close) * (1 - Math.random() * 0.03);
    
    // 出来高を生成（基準値の50%-150%）
    const baseVolume = getBaseVolume(symbol);
    const volume = Math.floor(baseVolume * (0.5 + Math.random()));
    
    data.push({
      symbol,
      date: date.toISOString().split('T')[0],
      open: Math.round(open * 100) / 100,
      high: Math.round(high * 100) / 100,
      low: Math.round(low * 100) / 100,
      close: Math.round(close * 100) / 100,
      volume
    });
    
    currentPrice = close;
  }
  
  return data;
}

function getBaseVolume(symbol: string): number {
  // 銘柄に応じた基準出来高
  const volumeMap: { [key: string]: number } = {
    '3825': 5000000,  // リミックスポイント
    '7203': 8000000,  // トヨタ
    '6758': 6000000,  // ソニー
    '9984': 15000000, // ソフトバンクG
    'AAPL': 45000000,
    'MSFT': 25000000,
    'GOOGL': 28000000,
    'TSLA': 85000000
  };
  
  return volumeMap[symbol] || 5000000;
}

function getBasePrice(symbol: string): number {
  // 銘柄に応じた基準価格
  const priceMap: { [key: string]: number } = {
    '3825': 583,    // リミックスポイント（実際の価格）
    '7203': 2850,   // トヨタ
    '6758': 12450,  // ソニー
    '9984': 5890,   // ソフトバンクG
    'AAPL': 175.50,
    'MSFT': 378.85,
    'GOOGL': 138.21,
    'TSLA': 248.50
  };
  
  return priceMap[symbol] || 1000;
}

async function addHistoricalPriceData(): Promise<void> {
  try {
    await sqliteDb.connect();
    
    const symbols = ['3825', '7203', '6758', '9984', 'AAPL', 'MSFT', 'GOOGL', 'TSLA'];
    const days = 250; // 約1年分のデータ
    
    console.log('📊 Adding historical price data for technical analysis...');
    
    for (const symbol of symbols) {
      console.log(`  Processing ${symbol}...`);
      
      const basePrice = getBasePrice(symbol);
      const priceData = generateRealisticPriceData(symbol, basePrice, days);
      
      // 既存データを削除
      await sqliteDb.query('DELETE FROM stock_prices WHERE symbol = ?', [symbol]);
      
      // 新しいデータを挿入
      for (const data of priceData) {
        await sqliteDb.query(
          `INSERT INTO stock_prices (symbol, date, open_price, high_price, low_price, close_price, volume, adjusted_close)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [data.symbol, data.date, data.open, data.high, data.low, data.close, data.volume, data.close]
        );
      }
      
      console.log(`    ✅ Added ${priceData.length} records for ${symbol}`);
    }
    
    console.log('✅ Historical price data added successfully');
    
    // データ確認
    const result = await sqliteDb.query(`
      SELECT 
        symbol,
        COUNT(*) as record_count,
        MIN(date) as earliest_date,
        MAX(date) as latest_date,
        AVG(close_price) as avg_price
      FROM stock_prices 
      GROUP BY symbol
      ORDER BY symbol
    `);
    
    console.log('\n📈 Price data summary:');
    result.rows.forEach((row: any) => {
      console.log(`  ${row.symbol}: ${row.record_count} records (${row.earliest_date} to ${row.latest_date}), Avg: ¥${row.avg_price.toFixed(2)}`);
    });
    
  } catch (error) {
    console.error('❌ Error adding historical price data:', error);
  } finally {
    await sqliteDb.close();
  }
}

// スクリプト実行
if (require.main === module) {
  addHistoricalPriceData();
}