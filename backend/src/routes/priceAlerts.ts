import { Router, Request, Response } from 'express';
import { priceAlertService, PriceAlert } from '../services/priceAlertService';
import { authenticateToken } from '../middleware/auth';
import { createSecureApiResponse } from '../utils/security';

// 認証済みリクエストの型定義
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}

const router = Router();

// 全ルートに認証を適用
router.use(authenticateToken);

/**
 * アラート作成
 * POST /api/price-alerts
 */
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { symbol, alertType, targetValue, condition, metadata } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json(
        createSecureApiResponse(false, undefined, 'User not authenticated')
      );
    }

    // バリデーション
    if (!symbol || !alertType || !targetValue || !condition) {
      return res.status(400).json(
        createSecureApiResponse(false, undefined, 'Missing required fields')
      );
    }

    if (!['PRICE_TARGET', 'PRICE_CHANGE', 'VOLUME_SPIKE'].includes(alertType)) {
      return res.status(400).json(
        createSecureApiResponse(false, undefined, 'Invalid alert type')
      );
    }

    if (!['ABOVE', 'BELOW', 'CHANGE_PERCENT'].includes(condition)) {
      return res.status(400).json(
        createSecureApiResponse(false, undefined, 'Invalid condition')
      );
    }

    if (typeof targetValue !== 'number' || targetValue <= 0) {
      return res.status(400).json(
        createSecureApiResponse(false, undefined, 'Invalid target value')
      );
    }

    const alert = await priceAlertService.createAlert(userId, {
      symbol: symbol.toUpperCase(),
      alertType,
      targetValue,
      condition,
      metadata: metadata || {}
    });

    res.status(201).json(
      createSecureApiResponse(true, { alert })
    );
  } catch (error) {
    console.error('Create alert error:', error);
    res.status(500).json(
      createSecureApiResponse(false, undefined, 'Failed to create alert')
    );
  }
});

/**
 * ユーザーのアラート一覧取得
 * GET /api/price-alerts
 */
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json(
        createSecureApiResponse(false, undefined, 'User not authenticated')
      );
    }

    const alerts = await priceAlertService.getUserAlerts(userId);

    res.json(
      createSecureApiResponse(true, { alerts, total: alerts.length })
    );
  } catch (error) {
    console.error('Get alerts error:', error);
    res.status(500).json(
      createSecureApiResponse(false, undefined, 'Failed to fetch alerts')
    );
  }
});

/**
 * アラート詳細取得
 * GET /api/price-alerts/:alertId
 */
router.get('/:alertId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { alertId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json(
        createSecureApiResponse(false, undefined, 'User not authenticated')
      );
    }

    const alerts = await priceAlertService.getUserAlerts(userId);
    const alert = alerts.find(a => a.id === alertId);

    if (!alert) {
      return res.status(404).json(
        createSecureApiResponse(false, undefined, 'Alert not found')
      );
    }

    res.json(
      createSecureApiResponse(true, { alert })
    );
  } catch (error) {
    console.error('Get alert error:', error);
    res.status(500).json(
      createSecureApiResponse(false, undefined, 'Failed to fetch alert')
    );
  }
});

/**
 * アラート更新
 * PUT /api/price-alerts/:alertId
 */
router.put('/:alertId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { alertId } = req.params;
    const { targetValue, condition, isActive, metadata } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json(
        createSecureApiResponse(false, undefined, 'User not authenticated')
      );
    }

    const updates: Partial<PriceAlert> = {};

    if (targetValue !== undefined) {
      if (typeof targetValue !== 'number' || targetValue <= 0) {
        return res.status(400).json(
          createSecureApiResponse(false, undefined, 'Invalid target value')
        );
      }
      updates.targetValue = targetValue;
    }

    if (condition !== undefined) {
      if (!['ABOVE', 'BELOW', 'CHANGE_PERCENT'].includes(condition)) {
        return res.status(400).json(
          createSecureApiResponse(false, undefined, 'Invalid condition')
        );
      }
      updates.condition = condition;
    }

    if (isActive !== undefined) {
      updates.isActive = Boolean(isActive);
    }

    if (metadata !== undefined) {
      updates.metadata = metadata;
    }

    const updatedAlert = await priceAlertService.updateAlert(alertId, userId, updates);

    if (!updatedAlert) {
      return res.status(404).json(
        createSecureApiResponse(false, undefined, 'Alert not found')
      );
    }

    res.json(
      createSecureApiResponse(true, { alert: updatedAlert })
    );
  } catch (error) {
    console.error('Update alert error:', error);
    res.status(500).json(
      createSecureApiResponse(false, undefined, 'Failed to update alert')
    );
  }
});

/**
 * アラート削除
 * DELETE /api/price-alerts/:alertId
 */
router.delete('/:alertId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { alertId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json(
        createSecureApiResponse(false, undefined, 'User not authenticated')
      );
    }

    const deleted = await priceAlertService.deleteAlert(alertId, userId);

    if (!deleted) {
      return res.status(404).json(
        createSecureApiResponse(false, undefined, 'Alert not found')
      );
    }

    res.json(
      createSecureApiResponse(true, { message: 'Alert deleted successfully' })
    );
  } catch (error) {
    console.error('Delete alert error:', error);
    res.status(500).json(
      createSecureApiResponse(false, undefined, 'Failed to delete alert')
    );
  }
});

/**
 * アラート統計取得
 * GET /api/price-alerts/stats
 */
router.get('/stats/summary', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json(
        createSecureApiResponse(false, undefined, 'User not authenticated')
      );
    }

    const stats = await priceAlertService.getAlertStats(userId);

    res.json(
      createSecureApiResponse(true, { stats })
    );
  } catch (error) {
    console.error('Get alert stats error:', error);
    res.status(500).json(
      createSecureApiResponse(false, undefined, 'Failed to fetch alert statistics')
    );
  }
});

/**
 * アラート一括操作
 * POST /api/price-alerts/bulk
 */
router.post('/bulk', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { action, alertIds } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json(
        createSecureApiResponse(false, undefined, 'User not authenticated')
      );
    }

    if (!action || !Array.isArray(alertIds)) {
      return res.status(400).json(
        createSecureApiResponse(false, undefined, 'Invalid bulk operation parameters')
      );
    }

    let results = [];

    switch (action) {
      case 'activate':
        for (const alertId of alertIds) {
          const result = await priceAlertService.updateAlert(alertId, userId, { isActive: true });
          results.push({ alertId, success: !!result });
        }
        break;

      case 'deactivate':
        for (const alertId of alertIds) {
          const result = await priceAlertService.updateAlert(alertId, userId, { isActive: false });
          results.push({ alertId, success: !!result });
        }
        break;

      case 'delete':
        for (const alertId of alertIds) {
          const success = await priceAlertService.deleteAlert(alertId, userId);
          results.push({ alertId, success });
        }
        break;

      default:
        return res.status(400).json(
          createSecureApiResponse(false, undefined, 'Invalid bulk action')
        );
    }

    const successCount = results.filter(r => r.success).length;

    res.json(
      createSecureApiResponse(true, {
        message: `Bulk ${action} completed`,
        total: alertIds.length,
        successful: successCount,
        failed: alertIds.length - successCount,
        results
      })
    );
  } catch (error) {
    console.error('Bulk alert operation error:', error);
    res.status(500).json(
      createSecureApiResponse(false, undefined, 'Failed to perform bulk operation')
    );
  }
});

export default router;