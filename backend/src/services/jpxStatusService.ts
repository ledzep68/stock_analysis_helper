/**
 * JPXステータスサービス
 * scriptsからsrcに移動してビルド対象に含める
 */

import { sqliteDb } from '../config/sqlite';

export interface JPXStatusResult {
  needsUpdate: boolean;
  warningLevel: 'none' | 'info' | 'warning' | 'critical';
  dataAge: number;
  lastUpdate: Date | null;
  totalCompanies: number;
  recommendations: string[];
}

class JPXStatusService {
  private readonly WARNING_DAYS = 30;
  private readonly CRITICAL_DAYS = 45;

  /**
   * JPXデータのステータスをチェック
   */
  async checkStatus(): Promise<JPXStatusResult> {
    try {
      await sqliteDb.connect();
      
      // 最新の更新日時を取得
      const updateQuery = `
        SELECT 
          MAX(updated_at) as last_update,
          COUNT(*) as total_companies 
        FROM companies 
        WHERE exchange = 'TSE'
      `;
      
      const result = await sqliteDb.query(updateQuery);
      const row = result.rows[0];
      
      const lastUpdate = row.last_update ? new Date(row.last_update) : null;
      const totalCompanies = row.total_companies || 0;
      
      let dataAge = 0;
      let warningLevel: 'none' | 'info' | 'warning' | 'critical' = 'none';
      let needsUpdate = false;
      const recommendations: string[] = [];

      if (lastUpdate) {
        dataAge = Math.floor((Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (dataAge >= this.CRITICAL_DAYS) {
          warningLevel = 'critical';
          needsUpdate = true;
          recommendations.push('緊急更新が必要です');
          recommendations.push('npm run jpx:import を実行してください');
        } else if (dataAge >= this.WARNING_DAYS) {
          warningLevel = 'warning';
          needsUpdate = true;
          recommendations.push('データ更新を推奨します');
          recommendations.push('運用手順書を確認してください');
        } else if (dataAge >= 14) {
          warningLevel = 'info';
          recommendations.push('定期更新の時期が近づいています');
        }
      } else {
        warningLevel = 'critical';
        needsUpdate = true;
        recommendations.push('初期データが存在しません');
        recommendations.push('npm run jpx:setup を実行してください');
      }

      // 企業数チェック
      if (totalCompanies < 100) {
        warningLevel = warningLevel === 'none' ? 'warning' : warningLevel;
        recommendations.push(`企業数が少なすぎます (${totalCompanies}社)`);
      }

      return {
        needsUpdate,
        warningLevel,
        dataAge,
        lastUpdate,
        totalCompanies,
        recommendations
      };

    } catch (error) {
      console.error('JPX status check failed:', error);
      
      return {
        needsUpdate: true,
        warningLevel: 'critical',
        dataAge: 0,
        lastUpdate: null,
        totalCompanies: 0,
        recommendations: ['ステータスチェックに失敗しました', 'データベース接続を確認してください']
      };
    } finally {
      await sqliteDb.close();
    }
  }

  /**
   * 簡易ステータスチェック（キャッシュ用）
   */
  async quickStatusCheck(): Promise<{ needsUpdate: boolean; level: string }> {
    try {
      const status = await this.checkStatus();
      return {
        needsUpdate: status.needsUpdate,
        level: status.warningLevel
      };
    } catch (error) {
      return {
        needsUpdate: true,
        level: 'critical'
      };
    }
  }

  /**
   * アラートメッセージの生成
   */
  generateAlertMessage(status: JPXStatusResult): string {
    switch (status.warningLevel) {
      case 'critical':
        return `企業データに重大な問題があります。${status.recommendations[0]}`;
      case 'warning':
        return `企業データの更新が必要です (${status.dataAge}日経過)。`;
      case 'info':
        return `企業データの更新時期が近づいています (${status.dataAge}日経過)。`;
      default:
        return 'データは最新です。';
    }
  }

  /**
   * 管理者向け詳細レポート
   */
  async generateDetailedReport(): Promise<string> {
    const status = await this.checkStatus();
    
    const report = `
# JPXデータステータスレポート

## 基本情報
- 最終更新: ${status.lastUpdate ? status.lastUpdate.toLocaleString() : '未設定'}
- データ経過日数: ${status.dataAge}日
- 警告レベル: ${status.warningLevel}
- 総企業数: ${status.totalCompanies}社

## ステータス
- 更新必要: ${status.needsUpdate ? 'はい' : 'いいえ'}

## 推奨アクション
${status.recommendations.map(rec => `- ${rec}`).join('\n')}

---
生成日時: ${new Date().toLocaleString()}
    `.trim();

    return report;
  }
}

export const jpxStatusService = new JPXStatusService();