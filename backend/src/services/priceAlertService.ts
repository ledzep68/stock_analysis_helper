import { db } from '../config/database';
import { realTimePriceService } from './realTimePriceService';
import { NotificationService } from './notificationService';

export interface PriceAlert {
  id: string;
  userId: string;
  symbol: string;
  alertType: 'PRICE_TARGET' | 'PRICE_CHANGE' | 'VOLUME_SPIKE';
  targetValue: number;
  currentValue?: number;
  condition: 'ABOVE' | 'BELOW' | 'CHANGE_PERCENT';
  isActive: boolean;
  lastTriggered?: Date;
  createdAt: Date;
  updatedAt: Date;
  metadata?: {
    companyName?: string;
    timeFrame?: string;
    notificationMethod?: 'WEB_PUSH' | 'EMAIL' | 'IN_APP';
  };
}

export interface PriceAlertTrigger {
  alertId: string;
  symbol: string;
  triggerPrice: number;
  previousPrice: number;
  changePercent: number;
  timestamp: Date;
  alertType: string;
  userId: string;
}

class PriceAlertService {
  private alertChecks: Map<string, NodeJS.Timeout> = new Map();
  private isMonitoring = false;

  /**
   * アラート作成
   */
  async createAlert(userId: string, alertData: Partial<PriceAlert>): Promise<PriceAlert> {
    const now = new Date();

    // Let SQLite generate the ID automatically
    const result = await db.run(`
      INSERT INTO price_alerts (
        user_id, symbol, alert_type, target_value, condition, 
        is_active, created_at, updated_at, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      parseInt(userId), // Convert string to integer for SQLite
      alertData.symbol!,
      alertData.alertType!,
      alertData.targetValue!,
      alertData.condition!,
      1, // isActive = true
      now.toISOString(),
      now.toISOString(),
      JSON.stringify(alertData.metadata || {})
    ]);

    // Get the created alert with the auto-generated ID
    const createdAlert = await db.get(`
      SELECT * FROM price_alerts WHERE id = ?
    `, [result.lastID]);

    const alert = this.mapRowToAlert(createdAlert);

    console.log(`📢 Price alert created: ${alert.symbol} ${alert.condition} ¥${alert.targetValue}`);
    
    // アラート監視開始
    this.startAlertMonitoring();
    
    return alert;
  }

  /**
   * ユーザーのアラート一覧取得
   */
  async getUserAlerts(userId: string): Promise<PriceAlert[]> {
    const rows = await db.all(`
      SELECT * FROM price_alerts 
      WHERE user_id = ? 
      ORDER BY created_at DESC
    `, [parseInt(userId)]);

    return rows.map(row => this.mapRowToAlert(row));
  }

  /**
   * アクティブアラート取得
   */
  async getActiveAlerts(): Promise<PriceAlert[]> {
    const rows = await db.all(`
      SELECT * FROM price_alerts 
      WHERE is_active = 1
    `);

    return rows.map(row => this.mapRowToAlert(row));
  }

  /**
   * アラート更新
   */
  async updateAlert(alertId: string, userId: string, updates: Partial<PriceAlert>): Promise<PriceAlert | null> {
    const alert = await this.getAlertById(alertId);
    if (!alert || alert.userId !== userId) {
      return null;
    }

    const updatedAlert = {
      ...alert,
      ...updates,
      updatedAt: new Date()
    };

    await db.run(`
      UPDATE price_alerts 
      SET target_value = ?, condition = ?, is_active = ?, updated_at = ?, metadata = ?
      WHERE id = ? AND user_id = ?
    `, [
      updatedAlert.targetValue,
      updatedAlert.condition,
      updatedAlert.isActive ? 1 : 0,
      updatedAlert.updatedAt.toISOString(),
      JSON.stringify(updatedAlert.metadata),
      alertId,
      parseInt(userId)
    ]);

    return updatedAlert;
  }

  /**
   * アラート削除
   */
  async deleteAlert(alertId: string, userId: string): Promise<boolean> {
    const result = await db.run(`
      DELETE FROM price_alerts 
      WHERE id = ? AND user_id = ?
    `, [alertId, parseInt(userId)]);

    return result.changes > 0;
  }

  /**
   * アラート監視開始
   */
  startAlertMonitoring(): void {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;
    console.log('🔔 Price alert monitoring started');

    // 30秒ごとにアラートチェック
    setInterval(async () => {
      await this.checkAllAlerts();
    }, 30000);
  }

  /**
   * 全アラートチェック
   */
  private async checkAllAlerts(): Promise<void> {
    try {
      const activeAlerts = await this.getActiveAlerts();
      
      for (const alert of activeAlerts) {
        await this.checkAlert(alert);
      }
    } catch (error) {
      console.error('❌ Error checking alerts:', error);
    }
  }

  /**
   * 個別アラートチェック
   */
  private async checkAlert(alert: PriceAlert): Promise<void> {
    try {
      const priceUpdate = await realTimePriceService.getPriceUpdate(alert.symbol);
      
      if (!priceUpdate) {
        return;
      }

      let shouldTrigger = false;
      let triggerReason = '';

      switch (alert.alertType) {
        case 'PRICE_TARGET':
          shouldTrigger = this.checkPriceTarget(alert, priceUpdate.price);
          triggerReason = `価格が目標値${alert.targetValue}円に${alert.condition === 'ABOVE' ? '到達' : '下落'}しました`;
          break;

        case 'PRICE_CHANGE':
          shouldTrigger = this.checkPriceChange(alert, priceUpdate.changePercent);
          triggerReason = `価格変動が${priceUpdate.changePercent.toFixed(2)}%になりました`;
          break;

        case 'VOLUME_SPIKE':
          shouldTrigger = this.checkVolumeSpike(alert, priceUpdate.volume);
          triggerReason = `出来高が急増しました（${priceUpdate.volume.toLocaleString()}）`;
          break;
      }

      if (shouldTrigger) {
        await this.triggerAlert(alert, priceUpdate, triggerReason);
      }
    } catch (error) {
      console.error(`❌ Error checking alert ${alert.id}:`, error);
    }
  }

  /**
   * 価格目標アラートチェック
   */
  private checkPriceTarget(alert: PriceAlert, currentPrice: number): boolean {
    switch (alert.condition) {
      case 'ABOVE':
        return currentPrice >= alert.targetValue;
      case 'BELOW':
        return currentPrice <= alert.targetValue;
      default:
        return false;
    }
  }

  /**
   * 価格変動アラートチェック
   */
  private checkPriceChange(alert: PriceAlert, changePercent: number): boolean {
    const absChange = Math.abs(changePercent);
    return absChange >= alert.targetValue;
  }

  /**
   * 出来高急増アラートチェック
   */
  private checkVolumeSpike(alert: PriceAlert, currentVolume: number): boolean {
    return currentVolume >= alert.targetValue;
  }

  /**
   * アラート発火
   */
  private async triggerAlert(alert: PriceAlert, priceUpdate: any, reason: string): Promise<void> {
    // 重複発火防止（1時間以内の再発火を防ぐ）
    if (alert.lastTriggered) {
      const hoursSinceLastTrigger = (Date.now() - alert.lastTriggered.getTime()) / (1000 * 60 * 60);
      if (hoursSinceLastTrigger < 1) {
        return;
      }
    }

    const trigger: PriceAlertTrigger = {
      alertId: alert.id,
      symbol: alert.symbol,
      triggerPrice: priceUpdate.price,
      previousPrice: priceUpdate.price - priceUpdate.change,
      changePercent: priceUpdate.changePercent,
      timestamp: new Date(),
      alertType: alert.alertType,
      userId: alert.userId
    };

    // アラート履歴保存
    await this.saveAlertTrigger(trigger);

    // 最終発火時刻更新
    await db.run(`
      UPDATE price_alerts 
      SET last_triggered = ?, current_value = ?
      WHERE id = ?
    `, [
      trigger.timestamp.toISOString(),
      priceUpdate.price,
      alert.id
    ]);

    // 通知送信
    await this.sendNotification(alert, trigger, reason);

    console.log(`🔔 Alert triggered: ${alert.symbol} - ${reason}`);
  }

  /**
   * アラート履歴保存
   */
  private async saveAlertTrigger(trigger: PriceAlertTrigger): Promise<void> {
    await db.run(`
      INSERT INTO price_alert_triggers (
        id, alert_id, symbol, trigger_price, previous_price, 
        change_percent, timestamp, alert_type, user_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      `trigger_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      trigger.alertId,
      trigger.symbol,
      trigger.triggerPrice,
      trigger.previousPrice,
      trigger.changePercent,
      trigger.timestamp.toISOString(),
      trigger.alertType,
      parseInt(trigger.userId)
    ]);
  }

  /**
   * 通知送信
   */
  private async sendNotification(alert: PriceAlert, trigger: PriceAlertTrigger, reason: string): Promise<void> {
    const companyName = alert.metadata?.companyName || alert.symbol;
    
    const notification = {
      title: `価格アラート: ${companyName}`,
      body: `${reason}\n現在価格: ¥${trigger.triggerPrice.toLocaleString()}`,
      data: {
        alertId: alert.id,
        symbol: alert.symbol,
        price: trigger.triggerPrice,
        change: trigger.changePercent,
        type: 'PRICE_ALERT'
      }
    };

    // Web Push通知
    await NotificationService.sendNotificationToUser(parseInt(alert.userId), notification);
  }

  /**
   * アラート取得（ID指定）
   */
  private async getAlertById(alertId: string): Promise<PriceAlert | null> {
    const row = await db.get(`
      SELECT * FROM price_alerts WHERE id = ?
    `, [alertId]);

    return row ? this.mapRowToAlert(row) : null;
  }

  /**
   * DBレコードをアラートオブジェクトに変換
   */
  private mapRowToAlert(row: any): PriceAlert {
    return {
      id: row.id.toString(), // Convert integer ID to string
      userId: row.user_id.toString(), // Convert integer user_id to string
      symbol: row.symbol,
      alertType: row.alert_type,
      targetValue: row.target_value,
      currentValue: row.current_value,
      condition: row.condition,
      isActive: Boolean(row.is_active),
      lastTriggered: row.last_triggered ? new Date(row.last_triggered) : undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      metadata: row.metadata ? JSON.parse(row.metadata) : {}
    };
  }

  /**
   * アラート統計取得
   */
  async getAlertStats(userId: string): Promise<any> {
    const stats = await db.get(`
      SELECT 
        COUNT(*) as total_alerts,
        COUNT(CASE WHEN is_active = 1 THEN 1 END) as active_alerts,
        COUNT(CASE WHEN last_triggered IS NOT NULL THEN 1 END) as triggered_alerts
      FROM price_alerts 
      WHERE user_id = ?
    `, [parseInt(userId)]);

    const recentTriggers = await db.all(`
      SELECT * FROM price_alert_triggers 
      WHERE user_id = ? 
      ORDER BY timestamp DESC 
      LIMIT 10
    `, [parseInt(userId)]);

    return {
      ...stats,
      recent_triggers: recentTriggers
    };
  }
}

export const priceAlertService = new PriceAlertService();