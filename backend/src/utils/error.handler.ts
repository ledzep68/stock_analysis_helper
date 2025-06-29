import { Response } from 'express';
import { createSecureApiResponse } from './security';

/**
 * エラーハンドリングユーティリティ
 */
export class ErrorHandler {
  /**
   * APIエラーレスポンス送信
   */
  static sendErrorResponse(
    res: Response,
    statusCode: number,
    message: string,
    error?: any
  ): void {
    console.error(`[ERROR] ${message}:`, error);
    
    res.status(statusCode).json(
      createSecureApiResponse(false, undefined, message)
    );
  }

  /**
   * 非同期関数のエラーハンドリングラッパー
   */
  static asyncHandler<T extends (...args: any[]) => Promise<any>>(
    fn: T
  ): (...args: Parameters<T>) => Promise<void> {
    return async (...args: Parameters<T>): Promise<void> => {
      try {
        await fn(...args);
      } catch (error) {
        const [req, res] = args;
        if (res && typeof res.status === 'function') {
          ErrorHandler.sendErrorResponse(res as Response, 500, 'Internal server error', error);
        } else {
          throw error;
        }
      }
    };
  }

  /**
   * エラーのログ出力
   */
  static logError(context: string, error: any): void {
    const timestamp = new Date().toISOString();
    const errorMessage = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    
    console.error(`[${timestamp}] ${context}:`, {
      message: errorMessage,
      stack,
      error
    });
  }

  /**
   * エラーメッセージの標準化
   */
  static formatErrorMessage(error: any): string {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === 'string') {
      return error;
    }
    return 'An unknown error occurred';
  }
}