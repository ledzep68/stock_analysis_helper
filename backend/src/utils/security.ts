/**
 * セキュリティユーティリティ関数
 * XSS攻撃、インジェクション攻撃対策
 */

/**
 * HTML文字をエスケープしてXSS攻撃を防ぐ
 */
export const escapeHtml = (text: string): string => {
  const htmlEscapes: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;'
  };
  
  return text.replace(/[&<>"'/]/g, (match) => htmlEscapes[match]);
};

/**
 * オブジェクトの文字列値を再帰的にエスケープ
 */
export const sanitizeObject = (obj: any): any => {
  if (typeof obj === 'string') {
    return escapeHtml(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }
  
  if (obj && typeof obj === 'object') {
    const sanitized: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        sanitized[key] = sanitizeObject(obj[key]);
      }
    }
    return sanitized;
  }
  
  return obj;
};

/**
 * 検索クエリの妥当性検証
 */
export const validateSearchQuery = (query: unknown): string | null => {
  if (typeof query !== 'string') {
    return null;
  }
  
  // 長さ制限（DoS攻撃防止）
  if (query.length > 100) {
    return null;
  }
  
  // 危険な文字のチェック（XSS防止）
  const dangerousChars = /[<>'"&;{}[\]]/;
  if (dangerousChars.test(query)) {
    return null;
  }
  
  // 英数字、日本語文字（ひらがな、カタカナ、漢字）、ハイフン、ドット、スペースを許可
  const allowedChars = /^[a-zA-Z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF.\-\s]+$/;
  if (!allowedChars.test(query)) {
    return null;
  }
  
  return query.trim();
};

/**
 * 銘柄コードの妥当性検証
 */
export const validateSymbol = (symbol: unknown): string | null => {
  if (typeof symbol !== 'string') {
    return null;
  }
  
  // 一般的な銘柄コード形式のチェック
  const symbolPattern = /^[A-Z0-9]{1,10}(\.[A-Z]{1,3})?$/;
  const normalized = symbol.toUpperCase().trim();
  
  return symbolPattern.test(normalized) ? normalized : null;
};

/**
 * SQLインジェクション対策（Phase 2以降のDB使用時）
 */
export const sanitizeForSql = (input: string): string => {
  // シンプルなサニタイゼーション（実際にはParameterized Queryを使用）
  return input.replace(/['";\\]/g, '');
};

/**
 * ユーザー入力の基本的なサニタイゼーション
 */
export const sanitizeUserInput = (input: string): string => {
  return input
    .trim()
    .replace(/\s+/g, ' ') // 複数の空白を単一に
    .substring(0, 1000); // 最大長制限
};

/**
 * 金融データの整合性チェック
 */
export const validateFinancialData = (data: any): boolean => {
  // 基本的なデータ型チェック
  if (!data || typeof data !== 'object') {
    return false;
  }
  
  // 株価が負の値でないかチェック
  if (typeof data.price === 'number' && data.price < 0) {
    return false;
  }
  
  // 異常な変動率のチェック（50%以上の変動は要確認）
  if (typeof data.changePercent === 'number' && Math.abs(data.changePercent) > 50) {
    console.warn('Unusual price change detected:', data.changePercent);
  }
  
  return true;
};

/**
 * APIレスポンスのセキュアな生成
 */
export const createSecureApiResponse = <T>(
  success: boolean,
  data?: T,
  error?: string
): { success: boolean; data?: T; error?: string; timestamp: string } => {
  const response = {
    success,
    timestamp: new Date().toISOString()
  } as any;
  
  if (success && data !== undefined) {
    response.data = sanitizeObject(data);
  }
  
  if (!success && error) {
    response.error = escapeHtml(error);
  }
  
  return response;
};

export const validateInput = {
  isValidSymbol: (symbol: string): boolean => {
    const symbolPattern = /^[A-Z0-9]{1,10}(\.[A-Z]{1,3})?$/;
    return symbolPattern.test(symbol.toUpperCase().trim());
  },
  
  isValidEmail: (email: string): boolean => {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailPattern.test(email);
  },
  
  isValidPassword: (password: string): boolean => {
    return password.length >= 8 && 
           /[A-Z]/.test(password) && 
           /[a-z]/.test(password) && 
           /[0-9]/.test(password);
  },
  
  isValidNumber: (value: any, min?: number, max?: number): boolean => {
    const num = Number(value);
    if (isNaN(num)) return false;
    if (min !== undefined && num < min) return false;
    if (max !== undefined && num > max) return false;
    return true;
  }
};