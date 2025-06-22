/**
 * API制限チェックミドルウェア
 */

import { Request, Response, NextFunction } from 'express';
import { apiLimitManager } from '../services/apiLimitManager';
import { createSecureApiResponse } from '../utils/security';

export interface ApiLimitRequest extends Request {
  apiLimits?: {
    availableProviders: string[];
    isLimited: boolean;
    nextAvailableTime?: Date;
  };
}

/**
 * API制限をチェックし、制限時は適切なレスポンスを返す
 */
export const apiLimitMiddleware = (requiredProvider?: string) => {
  return async (req: ApiLimitRequest, res: Response, next: NextFunction) => {
    try {
      const availableProviders = apiLimitManager.getAvailableProviders();
      
      // 特定のプロバイダーが必要な場合
      if (requiredProvider) {
        const check = apiLimitManager.canMakeRequest(requiredProvider);
        
        if (!check.allowed) {
          const nextReset = new Date(Date.now() + (check.waitTime || 0) * 1000);
          
          return res.status(429).json(
            createSecureApiResponse(false, {
              provider: requiredProvider,
              limitReached: true,
              reason: check.reason,
              nextAvailableTime: nextReset,
              suggestedWaitTime: check.waitTime
            }, 'API rate limit exceeded')
          );
        }
      }
      
      // 利用可能なプロバイダーがない場合
      if (availableProviders.length === 0) {
        const stats = apiLimitManager.getUsageStats();
        const nextReset = stats.reduce((earliest, stat) => {
          const resetTime = new Date(stat.lastReset.daily);
          resetTime.setDate(resetTime.getDate() + 1);
          resetTime.setHours(0, 0, 0, 0);
          return resetTime < earliest ? resetTime : earliest;
        }, new Date(Date.now() + 24 * 60 * 60 * 1000));

        return res.status(503).json(
          createSecureApiResponse(false, {
            allProvidersLimited: true,
            nextAvailableTime: nextReset,
            fallbackMode: true,
            message: 'All external APIs have reached their limits. Using cached/local data.'
          }, 'Service temporarily limited due to API quotas')
        );
      }

      // リクエストに制限情報を追加
      req.apiLimits = {
        availableProviders,
        isLimited: availableProviders.length < 2, // 2つ未満の場合は制限状態とみなす
        nextAvailableTime: availableProviders.length === 0 ? new Date(Date.now() + 60 * 60 * 1000) : undefined
      };

      next();
      
    } catch (error) {
      console.error('API limit middleware error:', error);
      // エラーの場合は継続（制限チェック失敗でサービスを止めない）
      next();
    }
  };
};

/**
 * API呼び出し成功/失敗を記録するミドルウェア
 */
export const recordApiUsage = (provider: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // レスポンス終了時に使用量を記録
    const originalSend = res.send;
    
    res.send = function(data) {
      const success = res.statusCode < 400;
      apiLimitManager.recordApiCall(provider, success);
      
      if (success) {
        console.log(`✅ API call recorded: ${provider} (${res.statusCode})`);
      } else {
        console.log(`❌ API call failed: ${provider} (${res.statusCode})`);
      }
      
      return originalSend.call(this, data);
    };
    
    next();
  };
};

/**
 * フロントエンド向けAPI制限状態の通知
 */
export const addLimitStatusToResponse = (req: ApiLimitRequest, res: Response, next: NextFunction) => {
  const originalJson = res.json;
  
  res.json = function(data: any) {
    // レスポンスに制限状態を追加
    if (data && typeof data === 'object' && req.apiLimits) {
      data.apiLimitStatus = {
        isLimited: req.apiLimits.isLimited,
        availableProviders: req.apiLimits.availableProviders.length,
        fallbackMode: req.apiLimits.availableProviders.length === 0,
        nextCheck: new Date(Date.now() + 5 * 60 * 1000) // 5分後に再チェック推奨
      };
    }
    
    return originalJson.call(this, data);
  };
  
  next();
};