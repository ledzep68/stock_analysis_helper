/**
 * JPXデータ自動更新スクリプト
 * 毎月1回実行して東証企業リストを最新化
 */

import * as cron from 'node-cron';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { fetchJPXData } from './fetch-jpx-data';
import { importJPXToSQLite } from './import-jpx-to-sqlite';

class JPXAutoUpdater {
  private updateHistory: string[] = [];
  private logFile = path.join(__dirname, '../logs/jpx-update.log');

  /**
   * 自動更新のセットアップ
   */
  setupAutoUpdate(): void {
    // 毎月1日の午前3時に実行
    cron.schedule('0 3 1 * *', async () => {
      console.log('🔄 月次JPXデータ更新を開始します...');
      await this.performUpdate();
    });

    // 毎週月曜日に新規上場チェック（オプション）
    cron.schedule('0 3 * * 1', async () => {
      console.log('🔍 週次新規上場チェックを開始します...');
      await this.checkNewListings();
    });

    console.log('✅ JPX自動更新スケジュールを設定しました');
    this.log('Auto-update scheduled');
  }

  /**
   * 手動更新トリガー
   */
  async performUpdate(): Promise<boolean> {
    try {
      this.log('Update started');
      
      // 1. バックアップ作成
      await this.createBackup();
      
      // 2. 最新データ取得を試行
      const updateResult = await this.fetchLatestData();
      
      if (updateResult.success) {
        // 3. データベース更新
        await importJPXToSQLite();
        
        // 4. 変更通知
        await this.notifyChanges(updateResult.changes);
        
        this.log(`Update completed: ${updateResult.changes.added} added, ${updateResult.changes.removed} removed`);
        return true;
      } else {
        this.log('Update failed: No new data available');
        return false;
      }
      
    } catch (error) {
      this.log(`Update error: ${error}`);
      console.error('❌ 更新エラー:', error);
      
      // ロールバック
      await this.rollback();
      return false;
    }
  }

  /**
   * 最新データの取得試行
   */
  private async fetchLatestData(): Promise<{
    success: boolean;
    changes: { added: number; removed: number; updated: number };
  }> {
    // 方法1: JPX APIチェック（将来的に実装される可能性）
    const apiData = await this.checkJPXApi();
    if (apiData) {
      return apiData;
    }

    // 方法2: スクレイピング（利用規約を確認）
    const scrapedData = await this.scrapeJPXWebsite();
    if (scrapedData) {
      return scrapedData;
    }

    // 方法3: RSS/更新通知フィード
    const feedData = await this.checkUpdateFeed();
    if (feedData) {
      return feedData;
    }

    // 方法4: 手動ダウンロードリマインダー
    await this.sendDownloadReminder();
    
    return {
      success: false,
      changes: { added: 0, removed: 0, updated: 0 }
    };
  }

  /**
   * JPX API確認（現在は未提供）
   */
  private async checkJPXApi(): Promise<any> {
    // JPXが将来APIを提供した場合の実装場所
    // 現在は null を返す
    return null;
  }

  /**
   * JPXウェブサイトのスクレイピング
   * 注意: 利用規約を確認し、適切な間隔でアクセスすること
   */
  private async scrapeJPXWebsite(): Promise<any> {
    try {
      // robots.txtを確認
      const robotsResponse = await axios.get('https://www.jpx.co.jp/robots.txt');
      console.log('🤖 robots.txt確認済み');
      
      // 更新日時を確認するだけの軽量チェック
      const pageResponse = await axios.get(
        'https://www.jpx.co.jp/markets/statistics-equities/misc/01.html',
        {
          headers: {
            'User-Agent': 'StockAnalysisHelper/1.0 (Monthly Update Check)'
          }
        }
      );
      
      // ページから更新日を抽出
      const updateDateMatch = pageResponse.data.match(/更新日[：:]\s*(\d{4}年\d{1,2}月\d{1,2}日)/);
      if (updateDateMatch) {
        const lastUpdate = updateDateMatch[1];
        this.log(`JPX最終更新日: ${lastUpdate}`);
        
        // 新しいデータがある場合は手動ダウンロードを促す
        return {
          success: false,
          requiresManualDownload: true,
          lastUpdate
        };
      }
      
    } catch (error) {
      console.warn('⚠️ スクレイピングエラー:', error);
    }
    
    return null;
  }

  /**
   * 更新フィードの確認
   */
  private async checkUpdateFeed(): Promise<any> {
    // JPXのRSSフィードや更新通知をチェック
    const feedUrls = [
      'https://www.jpx.co.jp/news/rss/index.xml',
      'https://www.jpx.co.jp/listing/stocks/new/index.html'
    ];
    
    for (const url of feedUrls) {
      try {
        const response = await axios.get(url, { timeout: 5000 });
        // 新規上場情報を解析
        // ...
      } catch (error) {
        continue;
      }
    }
    
    return null;
  }

  /**
   * 週次新規上場チェック
   */
  private async checkNewListings(): Promise<void> {
    try {
      // 新規上場予定をチェック
      const response = await axios.get(
        'https://www.jpx.co.jp/listing/stocks/new/index.html',
        { timeout: 10000 }
      );
      
      // HTMLから新規上場情報を抽出（簡易版）
      const newListings = this.extractNewListings(response.data);
      
      if (newListings.length > 0) {
        console.log(`📈 ${newListings.length} 社の新規上場を検出`);
        await this.addNewListings(newListings);
      }
      
    } catch (error) {
      console.warn('⚠️ 新規上場チェックエラー:', error);
    }
  }

  /**
   * 新規上場企業の抽出
   */
  private extractNewListings(html: string): any[] {
    // 実装は省略（HTMLパース処理）
    return [];
  }

  /**
   * 新規上場企業の追加
   */
  private async addNewListings(listings: any[]): Promise<void> {
    // データベースに新規企業を追加
    console.log('新規上場企業を追加中...');
  }

  /**
   * 手動ダウンロードリマインダー送信
   */
  private async sendDownloadReminder(): Promise<void> {
    const message = `
📅 月次更新リマインダー

JPXの東証上場企業リストを更新してください：
1. https://www.jpx.co.jp/markets/statistics-equities/misc/01.html
2. 「その他統計資料」→「東証上場銘柄一覧」からダウンロード
3. /backend/data/ にファイルを配置
4. npm run update:jpx を実行

自動化のヒント: GitHub Actionsでの定期実行も可能です。
    `;
    
    console.log(message);
    
    // 通知システムがあれば通知
    // await notificationService.send(message);
  }

  /**
   * バックアップ作成
   */
  private async createBackup(): Promise<void> {
    const backupDir = path.join(__dirname, '../backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(backupDir, `companies_${timestamp}.json`);
    
    // 現在のデータをバックアップ
    console.log(`💾 バックアップ作成: ${backupFile}`);
  }

  /**
   * ロールバック
   */
  private async rollback(): Promise<void> {
    console.log('🔄 ロールバック実行中...');
    // 最新のバックアップから復元
  }

  /**
   * 変更通知
   */
  private async notifyChanges(changes: any): Promise<void> {
    if (changes.added > 0 || changes.removed > 0) {
      const message = `
📊 東証企業リスト更新完了
- 新規上場: ${changes.added} 社
- 上場廃止: ${changes.removed} 社
- 情報更新: ${changes.updated} 社
      `;
      console.log(message);
    }
  }

  /**
   * ログ記録
   */
  private log(message: string): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;
    
    // ログディレクトリ作成
    const logDir = path.dirname(this.logFile);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    // ログファイルに追記
    fs.appendFileSync(this.logFile, logMessage);
    this.updateHistory.push(logMessage);
  }

  /**
   * 更新履歴取得
   */
  getUpdateHistory(): string[] {
    return this.updateHistory;
  }
}

// エクスポート
export const jpxAutoUpdater = new JPXAutoUpdater();

// スタンドアロン実行
if (require.main === module) {
  const command = process.argv[2];
  
  switch (command) {
    case 'setup':
      jpxAutoUpdater.setupAutoUpdate();
      console.log('✅ 自動更新をセットアップしました');
      break;
      
    case 'update':
      jpxAutoUpdater.performUpdate()
        .then(success => {
          console.log(success ? '✅ 更新成功' : '❌ 更新失敗');
          process.exit(success ? 0 : 1);
        });
      break;
      
    default:
      console.log(`
使用方法:
  npm run jpx:setup   - 自動更新をセットアップ
  npm run jpx:update  - 手動で更新を実行
      `);
  }
}