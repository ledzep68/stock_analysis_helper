/**
 * JPXデータバックアップ機能
 */

import { sqliteDb } from '../src/config/sqlite';
import * as fs from 'fs';
import * as path from 'path';

class JPXBackupManager {
  private readonly backupDir = path.join(__dirname, '../backups');
  private readonly maxBackups = 12; // 12ヶ月分保持

  async createBackup(): Promise<string> {
    await sqliteDb.connect();
    
    try {
      // バックアップディレクトリ作成
      if (!fs.existsSync(this.backupDir)) {
        fs.mkdirSync(this.backupDir, { recursive: true });
      }

      // タイムスタンプ付きファイル名
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFile = path.join(this.backupDir, `jpx_companies_${timestamp}.json`);
      
      console.log('💾 JPXデータのバックアップを開始します...');
      
      // 全企業データを取得
      const result = await sqliteDb.query(`
        SELECT 
          symbol, name, industry, sector, market_segment, exchange,
          market_cap, current_price, price_change, change_percentage, volume,
          created_at, updated_at
        FROM companies 
        WHERE exchange = 'TSE'
        ORDER BY symbol
      `);
      
      const companies = result.rows;
      
      // メタデータ付きでバックアップ
      const backupData = {
        metadata: {
          created_at: new Date().toISOString(),
          total_companies: companies.length,
          source: 'JPX',
          backup_version: '1.0'
        },
        companies
      };
      
      // ファイル保存
      fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));
      
      console.log(`✅ バックアップ完了: ${companies.length} 社`);
      console.log(`📁 保存先: ${backupFile}`);
      
      // 古いバックアップのクリーンアップ
      await this.cleanupOldBackups();
      
      return backupFile;
      
    } finally {
      await sqliteDb.close();
    }
  }

  async listBackups(): Promise<string[]> {
    if (!fs.existsSync(this.backupDir)) {
      return [];
    }
    
    const files = fs.readdirSync(this.backupDir)
      .filter(file => file.startsWith('jpx_companies_') && file.endsWith('.json'))
      .sort()
      .reverse(); // 新しい順

    console.log('\n📋 利用可能なバックアップ:');
    files.forEach((file, index) => {
      const filePath = path.join(this.backupDir, file);
      const stats = fs.statSync(filePath);
      const date = new Date(stats.mtime).toLocaleDateString('ja-JP');
      const size = Math.round(stats.size / 1024);
      
      console.log(`  ${index + 1}. ${file}`);
      console.log(`     作成日: ${date}, サイズ: ${size}KB`);
    });
    
    return files;
  }

  async restoreFromBackup(backupFile?: string): Promise<void> {
    const backups = await this.listBackups();
    
    if (backups.length === 0) {
      console.log('❌ 利用可能なバックアップがありません');
      return;
    }
    
    // 最新のバックアップを使用（ファイル指定がない場合）
    const targetFile = backupFile || backups[0];
    const backupPath = path.join(this.backupDir, targetFile);
    
    if (!fs.existsSync(backupPath)) {
      console.log(`❌ バックアップファイルが見つかりません: ${targetFile}`);
      return;
    }
    
    console.log(`🔄 バックアップから復元中: ${targetFile}`);
    
    await sqliteDb.connect();
    
    try {
      // バックアップデータ読み込み
      const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf-8'));
      const companies = backupData.companies;
      
      // トランザクション開始
      await sqliteDb.query('BEGIN TRANSACTION');
      
      // 既存データ削除
      await sqliteDb.query('DELETE FROM companies WHERE exchange = "TSE"');
      
      // バッチインサート
      const batchSize = 100;
      for (let i = 0; i < companies.length; i += batchSize) {
        const batch = companies.slice(i, i + batchSize);
        
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
        
        const params: any[] = [];
        batch.forEach((company: any) => {
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
      }
      
      // コミット
      await sqliteDb.query('COMMIT');
      
      console.log(`✅ 復元完了: ${companies.length} 社`);
      console.log(`📅 バックアップ作成日: ${backupData.metadata.created_at}`);
      
    } catch (error) {
      await sqliteDb.query('ROLLBACK');
      console.error('❌ 復元エラー:', error);
      throw error;
    } finally {
      await sqliteDb.close();
    }
  }

  private async cleanupOldBackups(): Promise<void> {
    const files = fs.readdirSync(this.backupDir)
      .filter(file => file.startsWith('jpx_companies_') && file.endsWith('.json'))
      .map(file => ({
        name: file,
        path: path.join(this.backupDir, file),
        time: fs.statSync(path.join(this.backupDir, file)).mtime
      }))
      .sort((a, b) => b.time.getTime() - a.time.getTime()); // 新しい順

    // 保持数を超えた古いファイルを削除
    if (files.length > this.maxBackups) {
      const filesToDelete = files.slice(this.maxBackups);
      
      console.log(`🧹 古いバックアップを削除中... (${filesToDelete.length} 件)`);
      
      filesToDelete.forEach(file => {
        fs.unlinkSync(file.path);
        console.log(`   削除: ${file.name}`);
      });
    }
  }

  async getBackupInfo(): Promise<any> {
    const backups = await this.listBackups();
    const info = [];
    
    for (const file of backups) {
      const filePath = path.join(this.backupDir, file);
      const stats = fs.statSync(filePath);
      
      try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        info.push({
          filename: file,
          created: stats.mtime,
          size: stats.size,
          companies: data.metadata?.total_companies || 0,
          metadata: data.metadata
        });
      } catch (error) {
        info.push({
          filename: file,
          created: stats.mtime,
          size: stats.size,
          companies: 0,
          error: 'Invalid backup file'
        });
      }
    }
    
    return info;
  }
}

// エクスポート
export const jpxBackupManager = new JPXBackupManager();

// スクリプト実行時
if (require.main === module) {
  const command = process.argv[2];
  const param = process.argv[3];
  
  switch (command) {
    case 'create':
      jpxBackupManager.createBackup()
        .then(file => {
          console.log('\n✅ バックアップ作成完了');
          process.exit(0);
        })
        .catch(error => {
          console.error('\n❌ バックアップ作成失敗:', error);
          process.exit(1);
        });
      break;
      
    case 'list':
      jpxBackupManager.listBackups()
        .then(() => process.exit(0))
        .catch(error => {
          console.error('❌ バックアップリスト取得失敗:', error);
          process.exit(1);
        });
      break;
      
    case 'restore':
      jpxBackupManager.restoreFromBackup(param)
        .then(() => {
          console.log('\n✅ 復元完了');
          process.exit(0);
        })
        .catch(error => {
          console.error('\n❌ 復元失敗:', error);
          process.exit(1);
        });
      break;
      
    case 'info':
      jpxBackupManager.getBackupInfo()
        .then(info => {
          console.log(JSON.stringify(info, null, 2));
          process.exit(0);
        })
        .catch(error => {
          console.error('❌ バックアップ情報取得失敗:', error);
          process.exit(1);
        });
      break;
      
    default:
      console.log(`
使用方法:
  npm run jpx:backup create     - 新しいバックアップを作成
  npm run jpx:backup list       - バックアップ一覧を表示  
  npm run jpx:backup restore    - 最新のバックアップから復元
  npm run jpx:backup restore <file> - 指定ファイルから復元
  npm run jpx:backup info       - バックアップ詳細情報
      `);
  }
}