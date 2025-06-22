/**
 * JPXデータ状態確認とアラート機能
 */

import { sqliteDb } from '../src/config/sqlite';
import * as fs from 'fs';
import * as path from 'path';

interface DataStatus {
  lastUpdate: Date | null;
  totalCompanies: number;
  tseCompanies: number;
  dataAge: number; // days
  needsUpdate: boolean;
  warningLevel: 'none' | 'info' | 'warning' | 'critical';
}

class JPXStatusChecker {
  private readonly WARNING_DAYS = 30;
  private readonly CRITICAL_DAYS = 45;
  private readonly logFile = path.join(__dirname, '../logs/jpx-status.log');

  async checkStatus(): Promise<DataStatus> {
    await sqliteDb.connect();
    
    try {
      // 最終更新日を取得
      const updateResult = await sqliteDb.query(`
        SELECT MAX(updated_at) as last_update 
        FROM companies 
        WHERE exchange = 'TSE'
      `);
      
      // 企業数を取得
      const countResult = await sqliteDb.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN exchange = 'TSE' THEN 1 END) as tse_count
        FROM companies
      `);
      
      const lastUpdateStr = updateResult.rows[0]?.last_update;
      const lastUpdate = lastUpdateStr ? new Date(lastUpdateStr) : null;
      const dataAge = lastUpdate ? 
        Math.floor((Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24)) : 999;
      
      const stats = countResult.rows[0];
      
      const status: DataStatus = {
        lastUpdate,
        totalCompanies: stats.total || 0,
        tseCompanies: stats.tse_count || 0,
        dataAge,
        needsUpdate: dataAge > this.WARNING_DAYS,
        warningLevel: this.getWarningLevel(dataAge)
      };
      
      // ログ記録
      this.logStatus(status);
      
      // アラート表示
      this.displayAlert(status);
      
      return status;
      
    } finally {
      await sqliteDb.close();
    }
  }

  private getWarningLevel(dataAge: number): DataStatus['warningLevel'] {
    if (dataAge > this.CRITICAL_DAYS) return 'critical';
    if (dataAge > this.WARNING_DAYS) return 'warning';
    if (dataAge > 25) return 'info';
    return 'none';
  }

  private displayAlert(status: DataStatus): void {
    console.log('\n' + '='.repeat(60));
    console.log('📊 JPX企業データ ステータス確認');
    console.log('='.repeat(60));
    
    // 基本情報
    console.log(`📅 最終更新: ${status.lastUpdate ? 
      status.lastUpdate.toLocaleDateString('ja-JP') : '未設定'}`);
    console.log(`🏢 登録企業数: ${status.totalCompanies.toLocaleString()} 社`);
    console.log(`🏛️ 東証企業数: ${status.tseCompanies.toLocaleString()} 社`);
    console.log(`⏰ データ経過日数: ${status.dataAge} 日`);
    
    // アラート表示
    switch (status.warningLevel) {
      case 'critical':
        console.log('\n🚨 【緊急】データが古すぎます！');
        console.log('   今すぐ更新を実行してください。');
        console.log('   実行コマンド: npm run jpx:import');
        break;
        
      case 'warning':
        console.log('\n⚠️  【警告】データ更新が必要です');
        console.log('   可能な限り早めに更新してください。');
        console.log('   更新手順: 運用手順書を参照');
        break;
        
      case 'info':
        console.log('\n💡 【情報】まもなく更新時期です');
        console.log('   来週までに更新予定を立ててください。');
        break;
        
      case 'none':
        console.log('\n✅ データは最新です');
        break;
    }
    
    // 次回更新予定
    if (status.lastUpdate) {
      const nextUpdate = new Date(status.lastUpdate);
      nextUpdate.setMonth(nextUpdate.getMonth() + 1);
      console.log(`📆 次回更新予定: ${nextUpdate.toLocaleDateString('ja-JP')}`);
    }
    
    console.log('\n' + '='.repeat(60));
    
    // 更新手順のリマインダー
    if (status.needsUpdate) {
      this.showUpdateInstructions();
    }
  }

  private showUpdateInstructions(): void {
    console.log('\n📋 更新手順:');
    console.log('1. JPXサイトからデータをダウンロード');
    console.log('   https://www.jpx.co.jp/markets/statistics-equities/misc/01.html');
    console.log('2. backend/data/ フォルダに配置');
    console.log('3. 更新実行: npm run jpx:import');
    console.log('4. 確認: npm run jpx:verify');
    console.log('\n詳細は docs/operation_manual.md を参照してください。');
  }

  private logStatus(status: DataStatus): void {
    const logDir = path.dirname(this.logFile);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    const logEntry = {
      timestamp: new Date().toISOString(),
      status,
      alert: status.warningLevel !== 'none'
    };
    
    fs.appendFileSync(
      this.logFile,
      JSON.stringify(logEntry) + '\n'
    );
  }

  // WebUI用のJSON出力
  async getStatusJson(): Promise<string> {
    const status = await this.checkStatus();
    return JSON.stringify(status, null, 2);
  }

  // スクリプト実行時の自動チェック
  async autoCheck(): Promise<void> {
    const status = await this.checkStatus();
    
    // 重要なアラートの場合は終了コードで通知
    if (status.warningLevel === 'critical') {
      process.exit(2); // 緊急
    } else if (status.warningLevel === 'warning') {
      process.exit(1); // 警告
    }
    
    process.exit(0); // 正常
  }
}

// エクスポート
export const jpxStatusChecker = new JPXStatusChecker();

// スクリプト実行時
if (require.main === module) {
  const command = process.argv[2];
  
  switch (command) {
    case 'json':
      jpxStatusChecker.getStatusJson()
        .then(json => console.log(json))
        .catch(console.error);
      break;
      
    case 'auto':
      jpxStatusChecker.autoCheck()
        .catch(console.error);
      break;
      
    default:
      jpxStatusChecker.checkStatus()
        .catch(console.error);
  }
}