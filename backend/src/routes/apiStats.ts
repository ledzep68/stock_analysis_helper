import { Router, Request, Response } from 'express';
import { apiManager } from '../services/apiManager';
import { createSecureApiResponse } from '../utils/security';
import { jpxAlertMiddleware, addJPXAlertToResponse } from '../middleware/jpxAlert';

const router = Router();

// JPXアラートミドルウェアを適用
router.use(jpxAlertMiddleware);

/**
 * API統計情報の取得
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const stats = apiManager.getStats();
    
    const responseData = {
      providers: stats.providers,
      cacheInfo: {
        size: stats.cacheSize,
        callHistorySize: stats.callHistorySize
      },
      timestamp: new Date().toISOString()
    };
    
    // JPXアラート情報を追加
    const dataWithAlert = addJPXAlertToResponse(responseData, req as any);
    
    res.json(createSecureApiResponse(true, dataWithAlert));
  } catch (error) {
    console.error('Error getting API stats:', error);
    res.status(500).json(
      createSecureApiResponse(false, undefined, 'Internal server error')
    );
  }
});

export default router;