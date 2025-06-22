import db from '../src/config/database';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMarketMigration() {
  try {
    console.log('🚀 Starting market segment migration...');

    // マイグレーションログテーブルが存在しない場合は作成
    try {
      await db.run(`
        CREATE TABLE IF NOT EXISTS migration_log (
          version INTEGER PRIMARY KEY,
          description TEXT NOT NULL,
          executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ Migration log table ready');
    } catch (error) {
      console.log('ℹ️ Migration log table already exists or created');
    }

    // 既に実行済みかチェック
    const existingMigration = await db.get('SELECT version FROM migration_log WHERE version = 3');
    if (existingMigration) {
      console.log('⚠️ Migration 003 already executed, skipping...');
      return;
    }

    // 段階的にマイグレーションを実行
    console.log('Adding market_segment column...');
    await db.run('ALTER TABLE companies ADD COLUMN market_segment TEXT');
    
    console.log('Adding exchange column...');
    await db.run('ALTER TABLE companies ADD COLUMN exchange TEXT DEFAULT "TSE"');
    
    console.log('Creating indexes...');
    await db.run('CREATE INDEX IF NOT EXISTS idx_companies_market_segment ON companies(market_segment)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_companies_exchange ON companies(exchange)');
    
    console.log('Updating Japanese companies with market segments...');
    await db.run(`UPDATE companies SET 
      market_segment = 'Prime',
      exchange = 'TSE'
    WHERE symbol IN ('7203', '6758', '8306', '9984')`);
    
    await db.run(`UPDATE companies SET 
      market_segment = 'Standard',
      exchange = 'TSE'
    WHERE symbol = '4519'`);
    
    console.log('Updating US companies...');
    await db.run(`UPDATE companies SET 
      exchange = 'NASDAQ',
      market_segment = 'NASDAQ'
    WHERE symbol IN ('AAPL', 'MSFT', 'GOOGL', 'TSLA')`);
    
    console.log('Recording migration...');
    await db.run(`INSERT INTO migration_log (version, description, executed_at) 
      VALUES (3, 'Added market segment and exchange support for Japanese markets', datetime('now'))`);
    

    // 結果を確認
    const companies = await db.all('SELECT symbol, name, market_segment, exchange FROM companies');
    console.log('\n📊 Updated companies:');
    companies.forEach(company => {
      console.log(`${company.symbol}: ${company.name} [${company.exchange}/${company.market_segment}]`);
    });

    console.log('\n🎉 Market segment migration completed successfully!');

  } catch (error: any) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Execute migration
runMarketMigration()
  .then(() => {
    console.log('Migration script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration script failed:', error);
    process.exit(1);
  });