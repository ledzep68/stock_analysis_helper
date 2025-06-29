import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { createSecureApiResponse } from '../utils/security';

const router = Router();

router.use(authenticateToken);

/**
 * WebSocket接続情報取得
 * GET /api/websocket/info
 */
router.get('/info', (req: Request, res: Response) => {
  try {
    const info = {
      endpoint: `ws://localhost:${process.env.PORT || 5003}`,
      protocols: ['websocket'],
      events: {
        connection: 'WebSocket接続開始',
        subscribe: '銘柄購読開始',
        unsubscribe: '銘柄購読解除', 
        priceUpdate: 'リアルタイム価格更新',
        ping: 'ハートビート送信',
        pong: 'ハートビート応答'
      },
      authentication: 'JWT Token required in auth.token or Authorization header'
    };

    res.json(createSecureApiResponse(true, info));
  } catch (error) {
    console.error('WebSocket info error:', error);
    res.status(500).json(
      createSecureApiResponse(false, undefined, 'Failed to get WebSocket info')
    );
  }
});

export default router;