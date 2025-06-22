import { db } from '../config/database';
import cron from 'node-cron';

interface PriceAlert {
  id: number;
  user_id: number;
  symbol: string;
  alert_type: 'price_above' | 'price_below' | 'percent_change' | 'volume_spike' | 'technical_signal';
  target_value: number;
  current_value: number;
  is_active: boolean;
  triggered_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

interface AlertCondition {
  symbol: string;
  currentPrice: number;
  previousPrice: number;
  volume: number;
  averageVolume: number;
  technicalSignals?: any;
}

interface AlertNotification {
  userId: number;
  alertId: number;
  message: string;
  alertType: string;
  symbol: string;
  triggeredValue: number;
}

export class AlertService {
  private static notificationQueue: AlertNotification[] = [];
  private static isMonitoringActive = false;

  static async createAlert(
    userId: number,
    symbol: string,
    alertType: string,
    targetValue: number
  ): Promise<PriceAlert> {
    try {
      const query = `
        INSERT INTO price_alerts (user_id, symbol, alert_type, target_value, current_value, is_active)
        VALUES (?, ?, ?, ?, ?, true)
      `;
      
      const currentPrice = await this.getCurrentPrice(symbol);
      const result = await db.run(query, [userId, symbol, alertType, targetValue, currentPrice]);
      
      // Get the created alert
      const selectQuery = 'SELECT * FROM price_alerts WHERE id = ?';
      const createdAlert = await db.get(selectQuery, [result.lastID]);
      
      if (!this.isMonitoringActive) {
        this.startMonitoring();
      }
      
      return createdAlert;
    } catch (error) {
      console.error('Error creating alert:', error);
      throw error;
    }
  }

  static async getUserAlerts(userId: number): Promise<PriceAlert[]> {
    try {
      const query = `
        SELECT * FROM price_alerts
        WHERE user_id = ?
        ORDER BY created_at DESC
      `;
      
      const result = await db.all(query, [userId]);
      return result;
    } catch (error) {
      console.error('Error fetching user alerts:', error);
      throw error;
    }
  }

  static async updateAlert(alertId: number, userId: number, updates: Partial<PriceAlert>): Promise<PriceAlert> {
    try {
      const setClauses = [];
      const values = [];

      for (const [key, value] of Object.entries(updates)) {
        if (key !== 'id' && key !== 'user_id' && key !== 'created_at') {
          setClauses.push(`${key} = ?`);
          values.push(value);
        }
      }

      if (setClauses.length === 0) {
        throw new Error('No valid fields to update');
      }

      const query = `
        UPDATE price_alerts
        SET ${setClauses.join(', ')}, updated_at = datetime('now')
        WHERE id = ? AND user_id = ?
      `;
      
      values.push(alertId, userId);
      const result = await db.run(query, values);
      
      if (result.rowCount === 0) {
        throw new Error('Alert not found or access denied');
      }
      
      // Get the updated alert
      const selectQuery = 'SELECT * FROM price_alerts WHERE id = ?';
      const updatedAlert = await db.get(selectQuery, [alertId]);
      
      return updatedAlert;
    } catch (error) {
      console.error('Error updating alert:', error);
      throw error;
    }
  }

  static async deleteAlert(alertId: number, userId: number): Promise<void> {
    try {
      const query = `
        DELETE FROM price_alerts
        WHERE id = ? AND user_id = ?
      `;
      
      const result = await db.run(query, [alertId, userId]);
      
      if (result.rowCount === 0) {
        throw new Error('Alert not found or access denied');
      }
    } catch (error) {
      console.error('Error deleting alert:', error);
      throw error;
    }
  }

  static async getCurrentPrice(symbol: string): Promise<number> {
    try {
      const query = `
        SELECT close_price FROM stock_prices
        WHERE symbol = ?
        ORDER BY date DESC
        LIMIT 1
      `;
      
      const result = await db.get(query, [symbol]);
      
      if (!result) {
        // Fallback to external API if no data in database
        return await this.fetchExternalPrice(symbol);
      }
      
      return parseFloat(result.close_price);
    } catch (error) {
      console.error('Error getting current price:', error);
      // Fallback to external API
      return await this.fetchExternalPrice(symbol);
    }
  }

  private static async fetchExternalPrice(symbol: string): Promise<number> {
    try {
      // This would typically call an external API like Yahoo Finance
      // For now, return a mock value
      return 100.0;
    } catch (error) {
      console.error('Error fetching external price:', error);
      throw new Error('Unable to fetch current price');
    }
  }

  static async checkAlerts(): Promise<void> {
    try {
      const activeAlerts = await db.all(
        'SELECT * FROM price_alerts WHERE is_active = 1'
      );

      for (const alert of activeAlerts) {
        await this.evaluateAlert(alert);
      }
    } catch (error) {
      console.error('Error checking alerts:', error);
    }
  }

  private static async evaluateAlert(alert: PriceAlert): Promise<void> {
    try {
      const currentPrice = await this.getCurrentPrice(alert.symbol);
      const previousPrice = alert.current_value;
      
      let shouldTrigger = false;
      let message = '';

      switch (alert.alert_type) {
        case 'price_above':
          shouldTrigger = currentPrice > alert.target_value && previousPrice <= alert.target_value;
          message = `${alert.symbol}の価格が目標値¥${alert.target_value}を上回りました（現在価格: ¥${currentPrice}）`;
          break;
          
        case 'price_below':
          shouldTrigger = currentPrice < alert.target_value;
          message = `${alert.symbol}の価格が目標値¥${alert.target_value}を下回りました（現在価格: ¥${currentPrice}）`;
          break;
          
        case 'percent_change':
          const changePercent = ((currentPrice - previousPrice) / previousPrice) * 100;
          shouldTrigger = Math.abs(changePercent) >= alert.target_value;
          message = `${alert.symbol}の価格が${changePercent.toFixed(2)}%変動しました（現在価格: ¥${currentPrice}）`;
          break;
          
        case 'volume_spike':
          const volumeData = await this.getVolumeData(alert.symbol);
          const volumeRatio = volumeData.current / volumeData.average;
          shouldTrigger = volumeRatio >= alert.target_value;
          message = `${alert.symbol}の出来高が通常の${volumeRatio.toFixed(2)}倍に急増しました`;
          break;
          
        case 'technical_signal':
          const technicalSignal = await this.getTechnicalSignal(alert.symbol);
          shouldTrigger = technicalSignal.shouldTrigger;
          message = `${alert.symbol}のテクニカル分析でシグナルが発生しました: ${technicalSignal.message}`;
          break;
      }

      // Update current value
      await db.run(
        'UPDATE price_alerts SET current_value = ? WHERE id = ?',
        [currentPrice, alert.id]
      );

      if (shouldTrigger) {
        await this.triggerAlert(alert, message, currentPrice);
      }
    } catch (error) {
      console.error(`Error evaluating alert ${alert.id}:`, error);
    }
  }

  private static async triggerAlert(alert: PriceAlert, message: string, triggeredValue: number): Promise<void> {
    try {
      // Mark alert as triggered
      await db.run(
        'UPDATE price_alerts SET is_active = 0, triggered_at = datetime("now") WHERE id = ?',
        [alert.id]
      );

      // Record in alert history
      await db.run(
        'INSERT INTO alert_history (alert_id, triggered_value, message) VALUES (?, ?, ?)',
        [alert.id, triggeredValue, message]
      );

      // Add to notification queue
      this.notificationQueue.push({
        userId: alert.user_id,
        alertId: alert.id,
        message,
        alertType: alert.alert_type,
        symbol: alert.symbol,
        triggeredValue
      });

      // Process notifications
      await this.processNotifications();
    } catch (error) {
      console.error('Error triggering alert:', error);
    }
  }

  private static async getVolumeData(symbol: string): Promise<{ current: number; average: number }> {
    try {
      const query = `
        SELECT 
          volume as current,
          (SELECT AVG(volume) FROM stock_prices sp2 WHERE sp2.symbol = ? AND sp2.date < sp1.date ORDER BY sp2.date DESC LIMIT 20) as average
        FROM stock_prices sp1
        WHERE symbol = ?
        ORDER BY date DESC
        LIMIT 1
      `;
      
      const result = await db.get(query, [symbol, symbol]);
      
      if (!result) {
        return { current: 0, average: 0 };
      }
      
      return {
        current: parseInt(result.current),
        average: parseFloat(result.average) || 0
      };
    } catch (error) {
      console.error('Error getting volume data:', error);
      return { current: 0, average: 0 };
    }
  }

  private static async getTechnicalSignal(symbol: string): Promise<{ shouldTrigger: boolean; message: string }> {
    try {
      // Import TechnicalAnalysisService dynamically to avoid circular dependency
      const { TechnicalAnalysisService } = await import('./technicalAnalysisService');
      
      const analysis = await TechnicalAnalysisService.performTechnicalAnalysis(symbol);
      
      if (!analysis || !analysis.signals) {
        return {
          shouldTrigger: false,
          message: 'テクニカルデータが不足しています'
        };
      }
      
      const signals = analysis.signals;
      const recommendations = signals.recommendations || [];
      
      // Check for strong buy/sell signals
      const strongBuySignals = ['Golden Cross detected', 'RSI oversold', 'Strong bullish divergence'];
      const strongSellSignals = ['Death Cross detected', 'RSI overbought', 'Strong bearish divergence'];
      
      let shouldTrigger = false;
      let message = '';
      
      if (signals.trend === 'bullish' && signals.strength > 70) {
        shouldTrigger = true;
        message = `強い買いシグナル検出: ${recommendations.join(', ')}`;
      } else if (signals.trend === 'bearish' && signals.strength > 70) {
        shouldTrigger = true;
        message = `強い売りシグナル検出: ${recommendations.join(', ')}`;
      }
      
      // Check for specific technical patterns
      for (const rec of recommendations) {
        if (strongBuySignals.some(signal => rec.includes(signal)) ||
            strongSellSignals.some(signal => rec.includes(signal))) {
          shouldTrigger = true;
          message = `重要なテクニカルシグナル: ${rec}`;
          break;
        }
      }
      
      return {
        shouldTrigger,
        message: message || 'テクニカル分析による特別なシグナルはありません'
      };
    } catch (error) {
      console.error('Error getting technical signal:', error);
      return {
        shouldTrigger: false,
        message: 'テクニカル分析の取得に失敗しました'
      };
    }
  }

  private static async processNotifications(): Promise<void> {
    try {
      while (this.notificationQueue.length > 0) {
        const notification = this.notificationQueue.shift();
        if (notification) {
          await this.sendNotification(notification);
        }
      }
    } catch (error) {
      console.error('Error processing notifications:', error);
    }
  }

  private static async sendNotification(notification: AlertNotification): Promise<void> {
    try {
      // Import NotificationService dynamically
      const { NotificationService } = await import('./notificationService');
      
      // Send push notification
      await NotificationService.sendAlertNotification(
        notification.userId,
        notification.alertType,
        notification.symbol,
        notification.message,
        {
          alertId: notification.alertId,
          triggeredValue: notification.triggeredValue
        }
      );
      
      // You can also add email notifications here
      // await EmailService.sendAlertEmail(notification);
      
      console.log('Notification sent successfully:', notification);
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  }

  static startMonitoring(): void {
    if (this.isMonitoringActive) {
      return;
    }

    this.isMonitoringActive = true;
    
    // Check alerts every minute
    cron.schedule('* * * * *', async () => {
      await this.checkAlerts();
    });

    // More frequent checks during market hours (9:00-15:30 JST)
    cron.schedule('*/30 * * * * *', async () => {
      const now = new Date();
      const hour = now.getHours();
      const minute = now.getMinutes();
      
      // Market hours check (9:00-15:30 JST)
      if (hour >= 9 && (hour < 15 || (hour === 15 && minute <= 30))) {
        await this.checkAlerts();
      }
    });

    console.log('Alert monitoring started');
  }

  static stopMonitoring(): void {
    this.isMonitoringActive = false;
    console.log('Alert monitoring stopped');
  }

  static async getAlertHistory(userId: number, limit: number = 50): Promise<any[]> {
    try {
      const query = `
        SELECT 
          ah.*,
          pa.symbol,
          pa.alert_type
        FROM alert_history ah
        JOIN price_alerts pa ON ah.alert_id = pa.id
        WHERE pa.user_id = ?
        ORDER BY ah.created_at DESC
        LIMIT ?
      `;
      
      const result = await db.all(query, [userId, limit]);
      return result;
    } catch (error) {
      console.error('Error fetching alert history:', error);
      throw error;
    }
  }
}