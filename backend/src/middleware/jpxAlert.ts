/**
 * JPX更新アラートミドルウェア
 * 管理者向けの自動アラート機能
 */

import { Request, Response, NextFunction } from 'express';
import { jpxStatusService } from '../services/jpxStatusService';

interface AlertRequest extends Request {
  jpxAlert?: {
    needsUpdate: boolean;
    warningLevel: string;
    dataAge: number;
  };
}

export const jpxAlertMiddleware = async (
  req: AlertRequest, 
  res: Response, 
  next: NextFunction
): Promise<void> => {
  try {
    // 管理者向けのリクエストのみチェック
    const isAdminRoute = req.path.includes('/admin') || 
                        req.path.includes('/api-manager') ||
                        req.headers['x-admin-request'] === 'true';
    
    if (!isAdminRoute) {
      return next();
    }

    // JPXステータスをチェック（キャッシュ付き）
    const status = await getJPXStatusCached();
    
    // アラート情報をリクエストに追加
    req.jpxAlert = {
      needsUpdate: status.needsUpdate,
      warningLevel: status.warningLevel,
      dataAge: status.dataAge
    };
    
    // レスポンスヘッダーにアラート情報を追加
    if (status.needsUpdate) {
      res.setHeader('X-JPX-Alert', 'true');
      res.setHeader('X-JPX-Warning-Level', status.warningLevel);
      res.setHeader('X-JPX-Data-Age', status.dataAge.toString());
      res.setHeader('X-JPX-Update-Instructions', 'See docs/operation_manual.md');
    }
    
    next();
    
  } catch (error) {
    console.warn('JPXアラートチェックでエラー:', error);
    next(); // エラーでもリクエストは継続
  }
};

// レスポンスにアラート情報を追加するヘルパー
export const addJPXAlertToResponse = (data: any, req: AlertRequest): any => {
  if (req.jpxAlert && req.jpxAlert.needsUpdate) {
    return {
      ...data,
      systemAlert: {
        type: 'jpx_update_required',
        level: req.jpxAlert.warningLevel,
        message: getAlertMessage(req.jpxAlert.warningLevel, req.jpxAlert.dataAge),
        action: 'Update JPX data',
        documentation: '/docs/operation_manual.md'
      }
    };
  }
  
  return data;
};

// アラートメッセージ生成
function getAlertMessage(warningLevel: string, dataAge: number): string {
  switch (warningLevel) {
    case 'critical':
      return `企業データが${dataAge}日前から更新されていません。緊急更新が必要です。`;
    case 'warning':
      return `企業データが${dataAge}日前から更新されていません。更新をお願いします。`;
    case 'info':
      return `企業データの更新時期が近づいています（${dataAge}日経過）。`;
    default:
      return 'データは最新です。';
  }
}

// キャッシュ機能付きステータスチェック
let statusCache: any = null;
let lastCheck = 0;
const CACHE_DURATION = 60 * 60 * 1000; // 1時間

async function getJPXStatusCached(): Promise<any> {
  const now = Date.now();
  
  if (statusCache && (now - lastCheck) < CACHE_DURATION) {
    return statusCache;
  }
  
  try {
    statusCache = await jpxStatusService.checkStatus();
    lastCheck = now;
    return statusCache;
  } catch (error) {
    // エラー時は前回のキャッシュを返すか、安全なデフォルト値
    return statusCache || {
      needsUpdate: false,
      warningLevel: 'none',
      dataAge: 0
    };
  }
}

// 手動でキャッシュをクリア
export const clearJPXStatusCache = (): void => {
  statusCache = null;
  lastCheck = 0;
};