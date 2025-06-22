/**
 * JPXデータ検証機能
 */

import { sqliteDb } from '../src/config/sqlite';

class JPXDataVerifier {
  async verifyData(): Promise<boolean> {
    await sqliteDb.connect();
    
    try {
      console.log('🔍 JPXデータの整合性を検証中...\n');
      
      let hasErrors = false;
      
      // 1. 基本統計
      hasErrors = !await this.checkBasicStats() || hasErrors;
      
      // 2. 重複チェック
      hasErrors = !await this.checkDuplicates() || hasErrors;
      
      // 3. 必須フィールドチェック
      hasErrors = !await this.checkRequiredFields() || hasErrors;
      
      // 4. データ品質チェック
      hasErrors = !await this.checkDataQuality() || hasErrors;
      
      // 5. インデックス確認
      hasErrors = !await this.checkIndexes() || hasErrors;
      
      console.log('\n' + '='.repeat(50));
      
      if (hasErrors) {
        console.log('❌ データに問題が見つかりました');
        console.log('修復が必要です: npm run jpx:clean');
        return false;
      } else {
        console.log('✅ データ検証完了 - 問題なし');
        return true;
      }
      
    } finally {
      await sqliteDb.close();
    }
  }

  private async checkBasicStats(): Promise<boolean> {
    console.log('📊 基本統計確認...');
    
    const result = await sqliteDb.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN exchange = 'TSE' THEN 1 END) as tse_count,
        COUNT(CASE WHEN symbol IS NOT NULL AND symbol != '' THEN 1 END) as valid_symbols,
        COUNT(CASE WHEN name IS NOT NULL AND name != '' THEN 1 END) as valid_names
      FROM companies
    `);
    
    const stats = result.rows[0];
    
    console.log(`  - 総企業数: ${stats.total.toLocaleString()} 社`);
    console.log(`  - 東証企業数: ${stats.tse_count.toLocaleString()} 社`);
    console.log(`  - 有効な銘柄コード: ${stats.valid_symbols.toLocaleString()} 件`);
    console.log(`  - 有効な企業名: ${stats.valid_names.toLocaleString()} 件`);
    
    // 期待値チェック
    const issues = [];
    if (stats.tse_count < 100) {
      issues.push(`東証企業数が少なすぎます (${stats.tse_count}社)`);
    }
    if (stats.tse_count > 5000) {
      issues.push(`東証企業数が多すぎます (${stats.tse_count}社)`);
    }
    
    if (issues.length > 0) {
      console.log('  ⚠️ 警告:');
      issues.forEach(issue => console.log(`    - ${issue}`));
      return false;
    }
    
    console.log('  ✅ 基本統計OK\n');
    return true;
  }

  private async checkDuplicates(): Promise<boolean> {
    console.log('🔍 重複データ確認...');
    
    const result = await sqliteDb.query(`
      SELECT symbol, COUNT(*) as count
      FROM companies
      WHERE exchange = 'TSE'
      GROUP BY symbol
      HAVING count > 1
      ORDER BY count DESC
      LIMIT 10
    `);
    
    if (result.rows.length > 0) {
      console.log('  ❌ 重複データが見つかりました:');
      result.rows.forEach((row: any) => {
        console.log(`    - ${row.symbol}: ${row.count} 件`);
      });
      return false;
    }
    
    console.log('  ✅ 重複データなし\n');
    return true;
  }

  private async checkRequiredFields(): Promise<boolean> {
    console.log('📋 必須フィールド確認...');
    
    const checks = [
      { field: 'symbol', name: '銘柄コード' },
      { field: 'name', name: '企業名' },
      { field: 'exchange', name: '取引所' }
    ];
    
    let hasIssues = false;
    
    for (const check of checks) {
      const result = await sqliteDb.query(`
        SELECT COUNT(*) as count
        FROM companies
        WHERE exchange = 'TSE'
          AND (${check.field} IS NULL OR ${check.field} = '')
      `);
      
      const count = result.rows[0].count;
      if (count > 0) {
        console.log(`  ❌ ${check.name}が未設定: ${count} 件`);
        hasIssues = true;
      } else {
        console.log(`  ✅ ${check.name}: OK`);
      }
    }
    
    if (!hasIssues) {
      console.log('  ✅ 必須フィールドOK\n');
    }
    
    return !hasIssues;
  }

  private async checkDataQuality(): Promise<boolean> {
    console.log('🎯 データ品質確認...');
    
    // 銘柄コード形式チェック（4桁数字）
    const symbolResult = await sqliteDb.query(`
      SELECT COUNT(*) as count
      FROM companies
      WHERE exchange = 'TSE'
        AND (LENGTH(symbol) != 4 OR symbol NOT GLOB '[0-9][0-9][0-9][0-9]')
    `);
    
    const invalidSymbols = symbolResult.rows[0].count;
    if (invalidSymbols > 0) {
      console.log(`  ⚠️ 無効な銘柄コード形式: ${invalidSymbols} 件`);
    } else {
      console.log('  ✅ 銘柄コード形式: OK');
    }
    
    // 市場区分チェック
    const marketResult = await sqliteDb.query(`
      SELECT market_segment, COUNT(*) as count
      FROM companies
      WHERE exchange = 'TSE'
      GROUP BY market_segment
      ORDER BY count DESC
    `);
    
    console.log('  📈 市場区分分布:');
    marketResult.rows.forEach((row: any) => {
      console.log(`    - ${row.market_segment || 'null'}: ${row.count} 社`);
    });
    
    // 業種分布チェック
    const industryResult = await sqliteDb.query(`
      SELECT COUNT(DISTINCT industry) as unique_industries
      FROM companies
      WHERE exchange = 'TSE'
    `);
    
    const uniqueIndustries = industryResult.rows[0].unique_industries;
    console.log(`  🏭 業種数: ${uniqueIndustries} 種類`);
    
    if (uniqueIndustries < 20 || uniqueIndustries > 50) {
      console.log('  ⚠️ 業種数が期待範囲外です');
    } else {
      console.log('  ✅ 業種分布: OK');
    }
    
    console.log('  ✅ データ品質確認完了\n');
    return true;
  }

  private async checkIndexes(): Promise<boolean> {
    console.log('🔧 インデックス確認...');
    
    try {
      const indexResult = await sqliteDb.query(`
        SELECT name 
        FROM sqlite_master 
        WHERE type = 'index' 
          AND tbl_name = 'companies'
          AND name NOT LIKE 'sqlite_%'
      `);
      
      const indexes = indexResult.rows.map((row: any) => row.name);
      
      const expectedIndexes = [
        'idx_companies_symbol',
        'idx_companies_name',
        'idx_companies_exchange'
      ];
      
      const missingIndexes = expectedIndexes.filter(
        idx => !indexes.includes(idx)
      );
      
      if (missingIndexes.length > 0) {
        console.log('  ⚠️ 不足しているインデックス:');
        missingIndexes.forEach(idx => console.log(`    - ${idx}`));
        console.log('  修復: npm run db:optimize');
      } else {
        console.log('  ✅ 必要なインデックスが存在');
      }
      
      // FTSテーブル確認
      const ftsResult = await sqliteDb.query(`
        SELECT name 
        FROM sqlite_master 
        WHERE type = 'table' 
          AND name = 'companies_fts'
      `);
      
      if (ftsResult.rows.length === 0) {
        console.log('  ⚠️ 全文検索テーブルが不足');
        console.log('  修復: npm run db:optimize');
      } else {
        console.log('  ✅ 全文検索テーブル存在');
      }
      
    } catch (error) {
      console.log('  ⚠️ インデックス確認でエラー:', error);
      return false;
    }
    
    console.log('  ✅ インデックス確認完了\n');
    return true;
  }

  async quickCheck(): Promise<{ status: string; companies: number; lastUpdate: string }> {
    await sqliteDb.connect();
    
    try {
      const result = await sqliteDb.query(`
        SELECT 
          COUNT(*) as companies,
          MAX(updated_at) as last_update
        FROM companies
        WHERE exchange = 'TSE'
      `);
      
      const data = result.rows[0];
      return {
        status: data.companies > 1000 ? 'OK' : 'WARNING',
        companies: data.companies || 0,
        lastUpdate: data.last_update || 'Unknown'
      };
      
    } finally {
      await sqliteDb.close();
    }
  }
}

// エクスポート
export const jpxDataVerifier = new JPXDataVerifier();

// スクリプト実行時
if (require.main === module) {
  const command = process.argv[2];
  
  switch (command) {
    case 'quick':
      jpxDataVerifier.quickCheck()
        .then(result => {
          console.log(JSON.stringify(result, null, 2));
          process.exit(result.status === 'OK' ? 0 : 1);
        })
        .catch(error => {
          console.error('❌ クイックチェック失敗:', error);
          process.exit(1);
        });
      break;
      
    default:
      jpxDataVerifier.verifyData()
        .then(success => {
          process.exit(success ? 0 : 1);
        })
        .catch(error => {
          console.error('❌ 検証エラー:', error);
          process.exit(1);
        });
  }
}