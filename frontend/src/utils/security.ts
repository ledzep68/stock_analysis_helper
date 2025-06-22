/**
 * フロントエンドセキュリティユーティリティ
 * XSS防止、入力検証
 */

/**
 * 検索クエリの入力値検証
 */
export const validateSearchInput = (input: string): boolean => {
  // 空文字チェック
  if (!input || !input.trim()) {
    return false;
  }
  
  // 長さ制限
  if (input.length > 100) {
    return false;
  }
  
  // 危険な文字のチェック
  const dangerousChars = /[<>'"&;(){}[\]]/;
  if (dangerousChars.test(input)) {
    return false;
  }
  
  return true;
};

/**
 * ユーザー入力のサニタイゼーション（表示前）
 */
export const sanitizeDisplayText = (text: string): string => {
  if (!text) return '';
  
  // HTMLエスケープ（React が自動で行うが、明示的に実装）
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
};

/**
 * 数値の安全な表示用フォーマット
 */
export const safeNumberFormat = (value: unknown): string => {
  if (typeof value !== 'number' || isNaN(value) || !isFinite(value)) {
    return 'N/A';
  }
  
  // 異常に大きな値のチェック
  if (Math.abs(value) > Number.MAX_SAFE_INTEGER) {
    return 'N/A';
  }
  
  return value.toString();
};

/**
 * URL の安全性チェック
 */
export const isSafeUrl = (url: string): boolean => {
  try {
    const parsedUrl = new URL(url);
    
    // HTTPSまたはHTTPのみ許可
    if (!['https:', 'http:'].includes(parsedUrl.protocol)) {
      return false;
    }
    
    // 許可されたドメインのチェック
    const allowedDomains = [
      'localhost',
      '127.0.0.1',
      'query1.finance.yahoo.com',
      'www.alphavantage.co'
    ];
    
    return allowedDomains.some(domain => 
      parsedUrl.hostname === domain || 
      parsedUrl.hostname.endsWith('.' + domain)
    );
    
  } catch {
    return false;
  }
};

/**
 * APIレスポンスの型安全性チェック
 */
export const isValidApiResponse = (response: any): boolean => {
  if (!response || typeof response !== 'object') {
    return false;
  }
  
  // 必須フィールドの存在チェック
  if (typeof response.success !== 'boolean') {
    return false;
  }
  
  if (typeof response.timestamp !== 'string') {
    return false;
  }
  
  return true;
};

/**
 * 金融データの妥当性チェック
 */
export const validateFinancialData = (data: any): boolean => {
  if (!data || typeof data !== 'object') {
    return false;
  }
  
  // 基本的な型チェック
  const requiredFields = ['symbol', 'price'];
  for (const field of requiredFields) {
    if (!(field in data)) {
      return false;
    }
  }
  
  // 株価の妥当性チェック
  if (typeof data.price === 'number') {
    if (data.price < 0 || !isFinite(data.price)) {
      return false;
    }
  }
  
  return true;
};

/**
 * エラーメッセージの安全な表示
 */
export const getSafeErrorMessage = (error: unknown): string => {
  // デフォルトメッセージ
  const defaultMessage = '予期しないエラーが発生しました。しばらく待ってから再試行してください。';
  
  if (typeof error === 'string') {
    // 文字列エラーの場合、HTMLエスケープして返す
    return sanitizeDisplayText(error.substring(0, 200)); // 長さ制限
  }
  
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as any).message;
    if (typeof message === 'string') {
      return sanitizeDisplayText(message.substring(0, 200));
    }
  }
  
  return defaultMessage;
};

/**
 * ローカルストレージの安全な使用
 */
export const safeLocalStorage = {
  set: (key: string, value: any): boolean => {
    try {
      // キーの検証
      if (!key || typeof key !== 'string' || key.length > 100) {
        return false;
      }
      
      // 値のサニタイゼーション
      const sanitizedValue = typeof value === 'string' 
        ? sanitizeDisplayText(value) 
        : JSON.stringify(value);
      
      localStorage.setItem(key, sanitizedValue);
      return true;
    } catch {
      return false;
    }
  },
  
  get: (key: string): string | null => {
    try {
      if (!key || typeof key !== 'string') {
        return null;
      }
      
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  
  remove: (key: string): boolean => {
    try {
      if (!key || typeof key !== 'string') {
        return false;
      }
      
      localStorage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  }
};