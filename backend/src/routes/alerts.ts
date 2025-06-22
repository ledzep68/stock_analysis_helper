import { Router, Request, Response } from 'express';
import { AlertService } from '../services/alertService';
import { authenticateToken } from '../middleware/auth';
import { validateInput } from '../utils/security';

const router = Router();

router.use(authenticateToken);

interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email: string;
  };
}

router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { symbol, alertType, targetValue } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!validateInput.isValidSymbol(symbol)) {
      return res.status(400).json({ error: 'Invalid symbol format' });
    }

    if (!['price_above', 'price_below', 'percent_change', 'volume_spike', 'technical_signal'].includes(alertType)) {
      return res.status(400).json({ error: 'Invalid alert type' });
    }

    if (!validateInput.isValidNumber(targetValue, 0)) {
      return res.status(400).json({ error: 'Invalid target value' });
    }

    const alert = await AlertService.createAlert(userId, symbol.toUpperCase(), alertType, parseFloat(targetValue));

    res.status(201).json({
      success: true,
      data: alert
    });
  } catch (error) {
    console.error('Create alert error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create alert'
    });
  }
});

router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const alerts = await AlertService.getUserAlerts(userId);

    res.json({
      success: true,
      data: alerts
    });
  } catch (error) {
    console.error('Get alerts error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve alerts'
    });
  }
});

router.put('/:alertId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { alertId } = req.params;
    const userId = req.user?.id;
    const updates = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!validateInput.isValidNumber(alertId, 1)) {
      return res.status(400).json({ error: 'Invalid alert ID' });
    }

    // Validate update fields
    const allowedFields = ['target_value', 'is_active', 'alert_type'];
    const validUpdates: any = {};

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        if (key === 'target_value' && !validateInput.isValidNumber(value, 0)) {
          return res.status(400).json({ error: 'Invalid target value' });
        }
        if (key === 'is_active' && typeof value !== 'boolean') {
          return res.status(400).json({ error: 'Invalid is_active value' });
        }
        if (key === 'alert_type' && !['price_above', 'price_below', 'percent_change', 'volume_spike', 'technical_signal'].includes(value as string)) {
          return res.status(400).json({ error: 'Invalid alert type' });
        }
        validUpdates[key] = value;
      }
    }

    if (Object.keys(validUpdates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    const alert = await AlertService.updateAlert(parseInt(alertId), userId, validUpdates);

    res.json({
      success: true,
      data: alert
    });
  } catch (error) {
    console.error('Update alert error:', error);
    if (error instanceof Error && error.message === 'Alert not found or access denied') {
      res.status(404).json({
        success: false,
        error: 'Alert not found'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to update alert'
      });
    }
  }
});

router.delete('/:alertId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { alertId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!validateInput.isValidNumber(alertId, 1)) {
      return res.status(400).json({ error: 'Invalid alert ID' });
    }

    await AlertService.deleteAlert(parseInt(alertId), userId);

    res.json({
      success: true,
      message: 'Alert deleted successfully'
    });
  } catch (error) {
    console.error('Delete alert error:', error);
    if (error instanceof Error && error.message === 'Alert not found or access denied') {
      res.status(404).json({
        success: false,
        error: 'Alert not found'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to delete alert'
      });
    }
  }
});

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

    const history = await AlertService.getAlertHistory(userId, limitNum);

    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    console.error('Get alert history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve alert history'
    });
  }
});

router.post('/test/:symbol', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { symbol } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!validateInput.isValidSymbol(symbol)) {
      return res.status(400).json({ error: 'Invalid symbol format' });
    }

    const currentPrice = await AlertService.getCurrentPrice(symbol.toUpperCase());

    res.json({
      success: true,
      data: {
        symbol: symbol.toUpperCase(),
        currentPrice,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Test alert error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to test alert system'
    });
  }
});

router.post('/check-all', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // This endpoint allows manual triggering of alert checks (for testing)
    await AlertService.checkAlerts();

    res.json({
      success: true,
      message: 'Alert check completed'
    });
  } catch (error) {
    console.error('Manual alert check error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check alerts'
    });
  }
});

export default router;