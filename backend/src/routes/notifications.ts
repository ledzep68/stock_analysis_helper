import { Router, Request, Response } from 'express';
import { NotificationService } from '../services/notificationService';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email: string;
  };
}

// Subscribe to push notifications
router.post('/subscribe', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { subscription } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return res.status(400).json({ error: 'Invalid subscription data' });
    }

    await NotificationService.saveSubscription(userId, subscription);

    res.json({
      success: true,
      message: 'Subscription saved successfully'
    });
  } catch (error) {
    console.error('Subscribe error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save subscription'
    });
  }
});

// Unsubscribe from push notifications
router.post('/unsubscribe', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { endpoint } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!endpoint) {
      return res.status(400).json({ error: 'Endpoint is required' });
    }

    await NotificationService.removeSubscription(userId, endpoint);

    res.json({
      success: true,
      message: 'Subscription removed successfully'
    });
  } catch (error) {
    console.error('Unsubscribe error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove subscription'
    });
  }
});

// Get notification history
router.get('/history', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { limit = '50' } = req.query;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const limitNum = parseInt(limit as string);
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      return res.status(400).json({ error: 'Invalid limit parameter (1-100)' });
    }

    const history = await NotificationService.getNotificationHistory(userId, limitNum);

    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    console.error('Get notification history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve notification history'
    });
  }
});

// Update notification preferences
router.put('/preferences', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { preferences } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!preferences || typeof preferences !== 'object') {
      return res.status(400).json({ error: 'Invalid preferences format' });
    }

    // Update user notification preferences
    const { db } = require('../config/database');
    await db.query(
      `UPDATE user_settings 
       SET notification_preferences = $1 
       WHERE user_id = $2`,
      [JSON.stringify(preferences), userId]
    );

    res.json({
      success: true,
      message: 'Notification preferences updated'
    });
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update preferences'
    });
  }
});

// Get notification preferences
router.get('/preferences', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { db } = require('../config/database');
    const result = await db.query(
      'SELECT notification_preferences FROM user_settings WHERE user_id = $1',
      [userId]
    );

    const preferences = result.rows[0]?.notification_preferences || {
      price_above: true,
      price_below: true,
      percent_change: true,
      volume_spike: true,
      technical_signal: true,
      portfolio_updates: true,
      market_news: false
    };

    res.json({
      success: true,
      data: preferences
    });
  } catch (error) {
    console.error('Get preferences error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve preferences'
    });
  }
});

// Send test notification
router.post('/test', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    await NotificationService.sendNotificationToUser(userId, {
      title: 'テスト通知',
      body: 'これは株式分析ヘルパーからのテスト通知です。',
      tag: 'test-notification',
      data: {
        type: 'test',
        timestamp: new Date().toISOString()
      }
    });

    res.json({
      success: true,
      message: 'Test notification sent'
    });
  } catch (error) {
    console.error('Send test notification error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send test notification'
    });
  }
});

export default router;