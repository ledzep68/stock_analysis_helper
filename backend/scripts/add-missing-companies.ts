/**
 * 不足している実在企業を追加
 */

import { sqliteDb } from '../src/config/sqlite';

const missingCompanies = [
  // ユーザーがテストで検索しそうな実在企業
  { symbol: '3825', name: 'リミックスポイント', industry: '情報・通信業', sector: 'IT・サービスその他', market_segment: 'スタンダード' },
  { symbol: '2914', name: 'JT', industry: '食料品', sector: '食品', market_segment: 'プライム' },
  { symbol: '8058', name: '三菱商事', industry: '卸売業', sector: '商社・卸売', market_segment: 'プライム' },
  { symbol: '8031', name: '三井物産', industry: '卸売業', sector: '商社・卸売', market_segment: 'プライム' },
  { symbol: '4568', name: '第一三共', industry: '医薬品', sector: '医薬品', market_segment: 'プライム' },
  { symbol: '6367', name: 'ダイキン工業', industry: '機械', sector: '機械', market_segment: 'プライム' },
  { symbol: '7974', name: '任天堂', industry: 'その他製品', sector: 'その他製造業', market_segment: 'プライム' },
  { symbol: '4452', name: 'カオス', industry: '情報・通信業', sector: 'IT・サービスその他', market_segment: 'グロース' },
  { symbol: '3659', name: 'ネクソン', industry: '情報・通信業', sector: 'IT・サービスその他', market_segment: 'プライム' },
  { symbol: '6178', name: '日本郵政', industry: 'サービス業', sector: 'IT・サービスその他', market_segment: 'プライム' },
  { symbol: '2432', name: 'ディー・エヌ・エー', industry: '情報・通信業', sector: 'IT・サービスその他', market_segment: 'プライム' },
  { symbol: '4385', name: 'メルカリ', industry: '情報・通信業', sector: 'IT・サービスその他', market_segment: 'プライム' },
  { symbol: '4751', name: 'サイバーエージェント', industry: '情報・通信業', sector: 'IT・サービスその他', market_segment: 'プライム' },
  { symbol: '3695', name: 'GMOアドパートナーズ', industry: '情報・通信業', sector: 'IT・サービスその他', market_segment: 'スタンダード' },
  { symbol: '6098', name: 'リクルートホールディングス', industry: 'サービス業', sector: 'IT・サービスその他', market_segment: 'プライム' },
  { symbol: '4324', name: '電通グループ', industry: 'サービス業', sector: 'IT・サービスその他', market_segment: 'プライム' },
  { symbol: '2269', name: '明治ホールディングス', industry: '食料品', sector: '食品', market_segment: 'プライム' },
  { symbol: '2801', name: 'キッコーマン', industry: '食料品', sector: '食品', market_segment: 'プライム' },
  { symbol: '2802', name: '味の素', industry: '食料品', sector: '食品', market_segment: 'プライム' },
  { symbol: '4901', name: '富士フイルムホールディングス', industry: '化学', sector: '素材・化学', market_segment: 'プライム' },
  { symbol: '4911', name: '資生堂', industry: '化学', sector: '素材・化学', market_segment: 'プライム' },
  { symbol: '7751', name: 'キヤノン', industry: '電気機器', sector: '電機・精密', market_segment: 'プライム' },
  { symbol: '6702', name: '富士通', industry: '電気機器', sector: '電機・精密', market_segment: 'プライム' },
  { symbol: '6501', name: '日立製作所', industry: '電気機器', sector: '電機・精密', market_segment: 'プライム' },
  { symbol: '6503', name: '三菱電機', industry: '電気機器', sector: '電機・精密', market_segment: 'プライム' },
  { symbol: '8604', name: '野村ホールディングス', industry: '証券・商品先物取引業', sector: '金融', market_segment: 'プライム' },
  { symbol: '8802', name: '三菱地所', industry: '不動産業', sector: '不動産', market_segment: 'プライム' },
  { symbol: '8801', name: '三井不動産', industry: '不動産業', sector: '不動産', market_segment: 'プライム' },
  { symbol: '5401', name: '新日鐵住金', industry: '鉄鋼', sector: '素材・化学', market_segment: 'プライム' },
  { symbol: '5711', name: '三菱マテリアル', industry: '非鉄金属', sector: '素材・化学', market_segment: 'プライム' },
  { symbol: '5020', name: 'JXTGホールディングス', industry: '石油・石炭製品', sector: 'エネルギー', market_segment: 'プライム' },
];

async function addMissingCompanies() {
  await sqliteDb.connect();
  
  try {
    console.log('🏢 不足している実在企業を追加します...\n');
    
    let addedCount = 0;
    let skippedCount = 0;
    
    for (const company of missingCompanies) {
      // 既存チェック
      const existingResult = await sqliteDb.query(
        'SELECT symbol FROM companies WHERE symbol = ?',
        [company.symbol]
      );
      
      if (existingResult.rows.length > 0) {
        console.log(`⏭️ ${company.symbol} ${company.name} - すでに存在`);
        skippedCount++;
        continue;
      }
      
      // 新規追加
      await sqliteDb.query(`
        INSERT INTO companies (
          symbol, name, industry, sector, market_segment, exchange,
          market_cap, current_price, price_change, change_percentage, volume,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        company.symbol,
        company.name,
        company.industry,
        company.sector,
        company.market_segment,
        'TSE',
        Math.floor(Math.random() * 1000000000000) + 10000000000, // ダミー時価総額
        Math.floor(Math.random() * 10000) + 100, // ダミー株価
        (Math.random() - 0.5) * 200, // ダミー価格変動
        (Math.random() - 0.5) * 10, // ダミー変動率
        Math.floor(Math.random() * 10000000) + 100000, // ダミー出来高
        new Date().toISOString(),
        new Date().toISOString()
      ]);
      
      console.log(`✅ ${company.symbol} ${company.name} - 追加完了`);
      addedCount++;
    }
    
    console.log(`\n📊 追加結果:`);
    console.log(`  - 新規追加: ${addedCount} 社`);
    console.log(`  - スキップ: ${skippedCount} 社`);
    
    // インデックス再構築
    console.log('\n🔧 インデックス再構築中...');
    await sqliteDb.query('DROP TABLE IF EXISTS companies_fts');
    await sqliteDb.query(`
      CREATE VIRTUAL TABLE companies_fts USING fts5(
        symbol, name, industry, sector, market_segment,
        content=companies,
        content_rowid=id
      )
    `);
    await sqliteDb.query(`
      INSERT INTO companies_fts(symbol, name, industry, sector, market_segment)
      SELECT symbol, name, industry, sector, market_segment FROM companies
    `);
    
    console.log('✅ インデックス再構築完了');
    
    // 確認
    console.log('\n🔍 リミックスポイント検索テスト:');
    const testResult = await sqliteDb.query(
      'SELECT symbol, name FROM companies WHERE name LIKE "%リミックス%"'
    );
    console.log(`検索結果: ${testResult.rows.length} 件`);
    testResult.rows.forEach((row: any) => {
      console.log(`  ${row.symbol}: ${row.name}`);
    });
    
  } finally {
    await sqliteDb.close();
  }
}

addMissingCompanies().catch(console.error);