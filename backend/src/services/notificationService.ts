import { db } from '../config/database';
import webpush from 'web-push';

interface NotificationSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: any;
  actions?: Array<{
    action: string;
    title: string;
  }>;
}

export class NotificationService {
  private static isInitialized = false;

  static initialize() {
    if (this.isInitialized) return;

    // Configure web-push with VAPID keys
    const vapidKeys = {
      publicKey: process.env.VAPID_PUBLIC_KEY || 'BKd0KjgYfJLJHrF9VPzQqHMNqJqPzA9H7lRlJqB2dBXXKdVVzODpqOf0L8nGkx5MyL-siAJwI6kHx0YdKqN0vCc',
      privateKey: process.env.VAPID_PRIVATE_KEY || 'your-private-key'
    };

    webpush.setVapidDetails(
      'mailto:support@stockanalysishelper.com',
      vapidKeys.publicKey,
      vapidKeys.privateKey
    );

    this.isInitialized = true;
  }

  static async saveSubscription(userId: number, subscription: NotificationSubscription): Promise<void> {
    try {
      const query = `
        INSERT OR REPLACE INTO notification_subscriptions (user_id, endpoint, p256dh, auth, updated_at)
        VALUES (?, ?, ?, ?, datetime('now'))
      `;

      await db.run(query, [
        userId,
        subscription.endpoint,
        subscription.keys.p256dh,
        subscription.keys.auth
      ]);
    } catch (error) {
      console.error('Error saving subscription:', error);
      throw error;
    }
  }

  static async removeSubscription(userId: number, endpoint: string): Promise<void> {
    try {
      await db.run(
        'DELETE FROM notification_subscriptions WHERE user_id = ? AND endpoint = ?',
        [userId, endpoint]
      );
    } catch (error) {
      console.error('Error removing subscription:', error);
      throw error;
    }
  }

  static async getUserSubscriptions(userId: number): Promise<NotificationSubscription[]> {
    try {
      const query = `
        SELECT endpoint, p256dh, auth
        FROM notification_subscriptions
        WHERE user_id = ? AND is_active = 1
      `;

      const result = await db.all(query, [userId]);
      
      return result.map((row: any) => ({
        endpoint: row.endpoint,
        keys: {
          p256dh: row.p256dh,
          auth: row.auth
        }
      }));
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
      return [];
    }
  }

  static async sendNotificationToUser(
    userId: number, 
    payload: NotificationPayload
  ): Promise<void> {
    try {
      if (!this.isInitialized) {
        this.initialize();
      }

      const subscriptions = await this.getUserSubscriptions(userId);
      
      const notificationPayload = JSON.stringify({
        notification: {
          title: payload.title,
          body: payload.body,
          icon: payload.icon || '/logo192.png',
          badge: payload.badge || '/favicon.ico',
          tag: payload.tag || 'stock-alert',
          data: payload.data || {},
          actions: payload.actions || [
            {
              action: 'view',
              title: '表示'
            },
            {
              action: 'close',
              title: '閉じる'
            }
          ]
        }
      });

      // Send to all user's subscriptions
      const sendPromises = subscriptions.map(async (subscription) => {
        try {
          await webpush.sendNotification(subscription, notificationPayload);
        } catch (error: any) {
          // If subscription is invalid, remove it
          if (error.statusCode === 410) {
            await this.removeSubscription(userId, subscription.endpoint);
          }
          console.error('Error sending notification to subscription:', error);
        }
      });

      await Promise.all(sendPromises);

      // Record notification in history
      await this.recordNotification(userId, payload);
    } catch (error) {
      console.error('Error sending notification to user:', error);
      throw error;
    }
  }

  static async sendBroadcastNotification(
    userIds: number[], 
    payload: NotificationPayload
  ): Promise<void> {
    try {
      const sendPromises = userIds.map(userId => 
        this.sendNotificationToUser(userId, payload)
      );

      await Promise.all(sendPromises);
    } catch (error) {
      console.error('Error broadcasting notification:', error);
      throw error;
    }
  }

  private static async recordNotification(
    userId: number, 
    payload: NotificationPayload
  ): Promise<void> {
    try {
      const query = `
        INSERT INTO notification_history (user_id, title, body, payload, sent_at)
        VALUES (?, ?, ?, ?, datetime('now'))
      `;

      await db.run(query, [
        userId,
        payload.title,
        payload.body,
        JSON.stringify(payload)
      ]);
    } catch (error) {
      console.error('Error recording notification:', error);
    }
  }

  static async getNotificationHistory(
    userId: number, 
    limit: number = 50
  ): Promise<any[]> {
    try {
      const query = `
        SELECT * FROM notification_history
        WHERE user_id = ?
        ORDER BY sent_at DESC
        LIMIT ?
      `;

      const result = await db.all(query, [userId, limit]);
      return result;
    } catch (error) {
      console.error('Error fetching notification history:', error);
      return [];
    }
  }

  // Check user notification preferences
  static async checkUserPreferences(
    userId: number, 
    notificationType: string
  ): Promise<boolean> {
    try {
      const query = `
        SELECT notification_preferences
        FROM user_settings
        WHERE user_id = ?
      `;

      const result = await db.get(query, [userId]);
      
      if (!result) {
        return true; // Default to enabled
      }

      const preferences = JSON.parse(result.notification_preferences || '{}');
      return preferences[notificationType] !== false;
    } catch (error) {
      console.error('Error checking user preferences:', error);
      return true;
    }
  }

  // Send alert notification
  static async sendAlertNotification(
    userId: number,
    alertType: string,
    symbol: string,
    message: string,
    data?: any
  ): Promise<void> {
    try {
      // Check if user wants this type of notification
      const shouldSend = await this.checkUserPreferences(userId, alertType);
      
      if (!shouldSend) {
        return;
      }

      const payload: NotificationPayload = {
        title: `株価アラート: ${symbol}`,
        body: message,
        tag: `alert-${symbol}-${Date.now()}`,
        data: {
          type: 'price_alert',
          symbol,
          alertType,
          timestamp: new Date().toISOString(),
          ...data
        },
        actions: [
          {
            action: 'view',
            title: '詳細を見る'
          },
          {
            action: 'dismiss',
            title: '閉じる'
          }
        ]
      };

      await this.sendNotificationToUser(userId, payload);
    } catch (error) {
      console.error('Error sending alert notification:', error);
    }
  }
}