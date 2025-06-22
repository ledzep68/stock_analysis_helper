/**
 * JPXデータをSQLiteデータベースに一括インポート
 */

import { sqliteDb } from '../src/config/sqlite';
import { fetchJPXData } from './fetch-jpx-data';
import * as fs from 'fs';
import * as path from 'path';

interface CompanyData {
  symbol: string;
  name: string;
  industry: string;
  sector: string;
  market_segment: string;
  exchange: string;
  country: string;
  market_cap: number;
  current_price: number;
  price_change: number;
  change_percentage: number;
  volume: number;
  created_at: string;
  updated_at: string;
}

class JPXDataImporter {
  private batchSize = 100; // 一度に挿入する件数

  async importToDatabase(): Promise<void> {
    console.log('🚀 JPXデータのインポートを開始します...');
    
    try {
      // 1. JPXデータを取得
      console.log('📥 JPXデータを取得中...');
      const companies = await this.getJPXData();
      console.log(`✅ ${companies.length} 社のデータを取得しました`);

      // 2. 既存データをバックアップ
      await this.backupExistingData();

      // 3. トランザクション開始
      console.log('🔄 データベースへの登録を開始します...');
      await sqliteDb.query('BEGIN TRANSACTION');

      try {
        // 4. 重複を避けるため、まず既存の日本企業データを削除
        await this.cleanupJapaneseCompanies();

        // 5. バッチ処理でデータを挿入
        await this.batchInsert(companies);

        // 6. インデックスを再構築
        await this.rebuildIndexes();

        // 7. コミット
        await sqliteDb.query('COMMIT');
        console.log('✅ データベースへの登録が完了しました');

        // 8. 統計情報を表示
        await this.showStatistics();

      } catch (error) {
        // エラー時はロールバック
        await sqliteDb.query('ROLLBACK');
        throw error;
      }

    } catch (error) {
      console.error('❌ インポートエラー:', error);
      throw error;
    }
  }

  /**
   * JPXデータを取得（キャッシュまたは新規取得）
   */
  private async getJPXData(): Promise<CompanyData[]> {
    const cachePath = path.join(__dirname, '../data/jpx_companies_sqlite.json');
    
    // キャッシュが存在する場合は使用
    if (fs.existsSync(cachePath)) {
      const cacheData = fs.readFileSync(cachePath, 'utf-8');
      const companies = JSON.parse(cacheData);
      
      if (companies.length > 100) {
        console.log('📂 キャッシュからデータを読み込みました');
        return companies;
      }
    }

    // 新規取得
    return await fetchJPXData();
  }

  /**
   * 既存データのバックアップ
   */
  private async backupExistingData(): Promise<void> {
    try {
      const result = await sqliteDb.query(`
        SELECT COUNT(*) as count FROM companies WHERE exchange = 'TSE'
      `);
      
      const count = result.rows[0]?.count || 0;
      console.log(`💾 既存の日本企業データ: ${count} 社`);
      
      // バックアップテーブルを作成（存在しない場合）
      await sqliteDb.query(`
        CREATE TABLE IF NOT EXISTS companies_backup AS 
        SELECT * FROM companies WHERE 0
      `);
      
      // 既存データをバックアップ
      if (count > 0) {
        await sqliteDb.query(`
          DELETE FROM companies_backup WHERE exchange = 'TSE'
        `);
        
        await sqliteDb.query(`
          INSERT INTO companies_backup 
          SELECT * FROM companies WHERE exchange = 'TSE'
        `);
        
        console.log('✅ バックアップ完了');
      }
    } catch (error) {
      console.warn('⚠️ バックアップ処理でエラー（続行します）:', error);
    }
  }

  /**
   * 既存の日本企業データを削除
   */
  private async cleanupJapaneseCompanies(): Promise<void> {
    const result = await sqliteDb.query(`
      DELETE FROM companies WHERE exchange = 'TSE'
    `);
    
    console.log(`🗑️ 既存データを削除しました: ${result.rowCount} 件`);
  }

  /**
   * バッチ処理でデータを挿入
   */
  private async batchInsert(companies: CompanyData[]): Promise<void> {
    const totalBatches = Math.ceil(companies.length / this.batchSize);
    console.log(`📦 ${totalBatches} バッチで処理します`);

    for (let i = 0; i < companies.length; i += this.batchSize) {
      const batch = companies.slice(i, i + this.batchSize);
      const batchNumber = Math.floor(i / this.batchSize) + 1;
      
      // バッチごとにINSERT文を構築
      const values = batch.map(() => 
        '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).join(', ');
      
      const query = `
        INSERT INTO companies (
          symbol, name, industry, sector, market_segment, exchange,
          market_cap, current_price, price_change, change_percentage, volume,
          created_at, updated_at
        ) VALUES ${values}
      `;
      
      // パラメータを展開
      const params: any[] = [];
      batch.forEach(company => {
        params.push(
          company.symbol,
          company.name,
          company.industry,
          company.sector,
          company.market_segment,
          company.exchange,
          company.market_cap,
          company.current_price,
          company.price_change,
          company.change_percentage,
          company.volume,
          company.created_at,
          company.updated_at
        );
      });
      
      await sqliteDb.query(query, params);
      
      // 進捗表示
      if (batchNumber % 10 === 0 || batchNumber === totalBatches) {
        const progress = Math.round((i + batch.length) / companies.length * 100);
        console.log(`⏳ 進捗: ${progress}% (${i + batch.length}/${companies.length} 社)`);
      }
    }
  }

  /**
   * インデックスの再構築
   */
  private async rebuildIndexes(): Promise<void> {
    console.log('🔧 インデックスを最適化中...');
    
    try {
      // 既存インデックスを削除
      await sqliteDb.query('DROP INDEX IF EXISTS idx_companies_symbol');
      await sqliteDb.query('DROP INDEX IF EXISTS idx_companies_name');
      await sqliteDb.query('DROP INDEX IF EXISTS idx_companies_exchange');
      await sqliteDb.query('DROP INDEX IF EXISTS idx_companies_market_segment');
      
      // インデックスを再作成
      await sqliteDb.query('CREATE INDEX idx_companies_symbol ON companies(symbol)');
      await sqliteDb.query('CREATE INDEX idx_companies_name ON companies(name)');
      await sqliteDb.query('CREATE INDEX idx_companies_exchange ON companies(exchange)');
      await sqliteDb.query('CREATE INDEX idx_companies_market_segment ON companies(market_segment)');
      
      // 全文検索用の仮想テーブル（FTS5）を作成
      await this.createFullTextSearch();
      
      console.log('✅ インデックス最適化完了');
    } catch (error) {
      console.warn('⚠️ インデックス最適化でエラー（続行します）:', error);
    }
  }

  /**
   * 全文検索用のFTS5テーブルを作成
   */
  private async createFullTextSearch(): Promise<void> {
    try {
      // FTS5テーブルを削除・再作成
      await sqliteDb.query('DROP TABLE IF EXISTS companies_fts');
      
      await sqliteDb.query(`
        CREATE VIRTUAL TABLE companies_fts USING fts5(
          symbol, name, industry, sector, market_segment,
          content=companies,
          content_rowid=id
        )
      `);
      
      // データを同期
      await sqliteDb.query(`
        INSERT INTO companies_fts(symbol, name, industry, sector, market_segment)
        SELECT symbol, name, industry, sector, market_segment FROM companies
      `);
      
      console.log('✅ 全文検索インデックス作成完了');
    } catch (error) {
      console.warn('⚠️ FTS5テーブル作成エラー（続行します）:', error);
    }
  }

  /**
   * 統計情報を表示
   */
  private async showStatistics(): Promise<void> {
    console.log('\n📊 インポート統計:');
    
    // 全体の統計
    const totalResult = await sqliteDb.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN exchange = 'TSE' THEN 1 END) as tse_count
      FROM companies
    `);
    
    const stats = totalResult.rows[0];
    console.log(`  - 総企業数: ${stats.total} 社`);
    console.log(`  - 東証企業数: ${stats.tse_count} 社`);
    
    // 市場区分別
    const marketResult = await sqliteDb.query(`
      SELECT market_segment, COUNT(*) as count
      FROM companies
      WHERE exchange = 'TSE'
      GROUP BY market_segment
      ORDER BY count DESC
    `);
    
    console.log('\n  市場区分別:');
    marketResult.rows.forEach((row: any) => {
      console.log(`    - ${row.market_segment}: ${row.count} 社`);
    });
    
    // 業種別TOP10
    const industryResult = await sqliteDb.query(`
      SELECT industry, COUNT(*) as count
      FROM companies
      WHERE exchange = 'TSE'
      GROUP BY industry
      ORDER BY count DESC
      LIMIT 10
    `);
    
    console.log('\n  業種別TOP10:');
    industryResult.rows.forEach((row: any, index: number) => {
      console.log(`    ${index + 1}. ${row.industry}: ${row.count} 社`);
    });
  }

  /**
   * データ検証
   */
  async validateData(): Promise<void> {
    console.log('\n🔍 データ検証中...');
    
    // 重複チェック
    const duplicateResult = await sqliteDb.query(`
      SELECT symbol, COUNT(*) as count
      FROM companies
      WHERE exchange = 'TSE'
      GROUP BY symbol
      HAVING count > 1
    `);
    
    if (duplicateResult.rows.length > 0) {
      console.warn('⚠️ 重複データが見つかりました:');
      duplicateResult.rows.forEach((row: any) => {
        console.warn(`  - ${row.symbol}: ${row.count} 件`);
      });
    } else {
      console.log('✅ 重複データなし');
    }
    
    // 必須フィールドチェック
    const invalidResult = await sqliteDb.query(`
      SELECT COUNT(*) as count
      FROM companies
      WHERE exchange = 'TSE'
        AND (symbol IS NULL OR symbol = ''
          OR name IS NULL OR name = '')
    `);
    
    const invalidCount = invalidResult.rows[0]?.count || 0;
    if (invalidCount > 0) {
      console.warn(`⚠️ 無効なデータ: ${invalidCount} 件`);
    } else {
      console.log('✅ データ整合性OK');
    }
  }
}

// 実行
export async function importJPXToSQLite() {
  // データベースに接続
  await sqliteDb.connect();
  
  try {
    const importer = new JPXDataImporter();
    await importer.importToDatabase();
    await importer.validateData();
  } finally {
    // 接続を閉じる
    await sqliteDb.close();
  }
}

// 直接実行時
if (require.main === module) {
  importJPXToSQLite()
    .then(() => {
      console.log('\n✅ 全ての処理が完了しました');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ エラーで終了しました:', error);
      process.exit(1);
    });
}