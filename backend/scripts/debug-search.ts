/**
 * 検索デバッグスクリプト
 */

import { sqliteDb } from '../src/config/sqlite';

async function debugSearch() {
  await sqliteDb.connect();
  
  try {
    console.log('🔍 データベース内容の確認...\n');
    
    // 1. 総企業数
    const countResult = await sqliteDb.query('SELECT COUNT(*) as count FROM companies WHERE exchange = "TSE"');
    console.log(`総企業数: ${countResult.rows[0].count} 社\n`);
    
    // 2. 企業名一覧（先頭10件）
    const sampleResult = await sqliteDb.query('SELECT symbol, name FROM companies WHERE exchange = "TSE" LIMIT 10');
    console.log('企業名サンプル:');
    sampleResult.rows.forEach((row: any) => {
      console.log(`  ${row.symbol}: ${row.name}`);
    });
    
    // 3. 「リミックス」を含む企業検索
    console.log('\n「リミックス」検索結果:');
    const remixResult = await sqliteDb.query('SELECT symbol, name FROM companies WHERE name LIKE "%リミックス%"');
    console.log(`ヒット数: ${remixResult.rows.length}`);
    remixResult.rows.forEach((row: any) => {
      console.log(`  ${row.symbol}: ${row.name}`);
    });
    
    // 4. 「ポイント」を含む企業検索
    console.log('\n「ポイント」検索結果:');
    const pointResult = await sqliteDb.query('SELECT symbol, name FROM companies WHERE name LIKE "%ポイント%"');
    console.log(`ヒット数: ${pointResult.rows.length}`);
    pointResult.rows.forEach((row: any) => {
      console.log(`  ${row.symbol}: ${row.name}`);
    });
    
    // 5. 特定銘柄コード検索（リミックスポイントは3825）
    console.log('\n3825番の企業:');
    const codeResult = await sqliteDb.query('SELECT symbol, name FROM companies WHERE symbol = "3825"');
    console.log(`ヒット数: ${codeResult.rows.length}`);
    codeResult.rows.forEach((row: any) => {
      console.log(`  ${row.symbol}: ${row.name}`);
    });
    
    // 6. 名前に「テスト」を含む企業（サンプルデータ確認）
    console.log('\n「テスト」企業:');
    const testResult = await sqliteDb.query('SELECT symbol, name FROM companies WHERE name LIKE "%テスト%"');
    console.log(`ヒット数: ${testResult.rows.length}`);
    testResult.rows.forEach((row: any) => {
      console.log(`  ${row.symbol}: ${row.name}`);
    });
    
  } finally {
    await sqliteDb.close();
  }
}

debugSearch().catch(console.error);