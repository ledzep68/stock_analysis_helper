/**
 * API制限管理用ルート
 */

import { Router, Request, Response } from 'express';
import { apiLimitManager } from '../services/apiLimitManager';
import { createSecureApiResponse } from '../utils/security';

const router = Router();

/**
 * API使用統計の取得
 */
router.get('/usage', (req: Request, res: Response) => {
  try {
    const stats = apiLimitManager.getUsageStats();
    res.json(createSecureApiResponse(true, {
      providers: stats,
      timestamp: new Date().toISOString()
    }));
  } catch (error) {
    console.error('Error getting API usage:', error);
    res.status(500).json(
      createSecureApiResponse(false, undefined, 'Internal server error')
    );
  }
});

/**
 * 利用可能なプロバイダーリストの取得
 */
router.get('/available', (req: Request, res: Response) => {
  try {
    const available = apiLimitManager.getAvailableProviders();
    const stats = apiLimitManager.getUsageStats();
    
    res.json(createSecureApiResponse(true, {
      availableProviders: available,
      totalProviders: stats.length,
      limitedProviders: stats.filter(s => s.isLimited).length,
      recommendations: {
        shouldCache: available.length < 2,
        shouldReduceRequests: available.length < 3,
        fallbackMode: available.length === 0
      }
    }));
  } catch (error) {
    console.error('Error getting available providers:', error);
    res.status(500).json(
      createSecureApiResponse(false, undefined, 'Internal server error')
    );
  }
});

/**
 * 最近のアラート履歴の取得
 */
router.get('/alerts', (req: Request, res: Response) => {
  try {
    const hours = parseInt(req.query.hours as string) || 24;
    const alerts = apiLimitManager.getRecentAlerts(hours);
    
    res.json(createSecureApiResponse(true, {
      alerts,
      count: alerts.length,
      timeframe: `${hours} hours`,
      severity: {
        critical: alerts.filter(a => a.level === 'critical').length,
        warning: alerts.filter(a => a.level === 'warning').length,
        blocked: alerts.filter(a => a.level === 'blocked').length
      }
    }));
  } catch (error) {
    console.error('Error getting alerts:', error);
    res.status(500).json(
      createSecureApiResponse(false, undefined, 'Internal server error')
    );
  }
});

/**
 * プロバイダーの手動制限設定
 */
router.post('/limit/:provider', (req: Request, res: Response) => {
  try {
    const { provider } = req.params;
    const { limited, reason } = req.body;
    
    if (typeof limited !== 'boolean') {
      return res.status(400).json(
        createSecureApiResponse(false, undefined, 'Invalid limited parameter')
      );
    }
    
    apiLimitManager.setProviderLimited(provider, limited, reason);
    
    res.json(createSecureApiResponse(true, {
      provider,
      limited,
      reason,
      appliedAt: new Date().toISOString()
    }));
  } catch (error) {
    console.error('Error setting provider limit:', error);
    res.status(500).json(
      createSecureApiResponse(false, undefined, 'Internal server error')
    );
  }
});

/**
 * 特定プロバイダーの制限チェック
 */
router.get('/check/:provider', (req: Request, res: Response) => {
  try {
    const { provider } = req.params;
    const check = apiLimitManager.canMakeRequest(provider);
    const stats = apiLimitManager.getUsageStats().find(s => s.provider === provider);
    
    res.json(createSecureApiResponse(true, {
      provider,
      canMakeRequest: check.allowed,
      reason: check.reason,
      waitTime: check.waitTime,
      usage: stats || null,
      recommendation: check.allowed 
        ? 'Request can proceed' 
        : `Wait ${check.waitTime} seconds before retry`
    }));
  } catch (error) {
    console.error('Error checking provider limit:', error);
    res.status(500).json(
      createSecureApiResponse(false, undefined, 'Internal server error')
    );
  }
});

/**
 * システム全体の制限状態サマリー
 */
router.get('/summary', (req: Request, res: Response) => {
  try {
    const stats = apiLimitManager.getUsageStats();
    const available = apiLimitManager.getAvailableProviders();
    const alerts = apiLimitManager.getRecentAlerts(1); // 過去1時間
    
    const summary = {
      status: available.length === 0 ? 'critical' : available.length < 2 ? 'warning' : 'normal',
      availableProviders: available.length,
      totalProviders: stats.length,
      recentAlerts: alerts.length,
      systemRecommendation: available.length === 0 
        ? 'Use fallback/cached data only'
        : available.length < 2 
        ? 'Reduce API usage and enable caching'
        : 'Normal operation',
      providers: stats.map(stat => ({
        name: stat.provider,
        available: available.includes(stat.provider),
        dailyUsage: `${stat.dailyUsed}/${stat.dailyUsed + (available.includes(stat.provider) ? 100 : 0)}`, // 概算
        status: stat.isLimited ? 'limited' : 'active'
      }))
    };
    
    res.json(createSecureApiResponse(true, summary));
  } catch (error) {
    console.error('Error getting limit summary:', error);
    res.status(500).json(
      createSecureApiResponse(false, undefined, 'Internal server error')
    );
  }
});

export default router;