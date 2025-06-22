import React, { createContext, useContext, useEffect, ReactNode } from 'react';

interface SecurityContextType {
  reportSecurityIssue: (issue: string, details?: any) => void;
  checkContentSecurity: () => boolean;
}

const SecurityContext = createContext<SecurityContextType | undefined>(undefined);

interface SecurityProviderProps {
  children: ReactNode;
}

export const SecurityProvider: React.FC<SecurityProviderProps> = ({ children }) => {
  useEffect(() => {
    // CSP違反の監視
    const handleCspViolation = (event: SecurityPolicyViolationEvent) => {
      console.warn('CSP Violation:', {
        blockedURI: event.blockedURI,
        violatedDirective: event.violatedDirective,
        originalPolicy: event.originalPolicy,
        disposition: event.disposition
      });
      
      // 本番環境では外部サービスに報告
      if (process.env.NODE_ENV === 'production') {
        // レポート送信の実装
        reportSecurityIssue('CSP Violation', {
          blockedURI: event.blockedURI,
          violatedDirective: event.violatedDirective
        });
      }
    };

    document.addEventListener('securitypolicyviolation', handleCspViolation);

    // 不正なスクリプト実行の検出
    const originalEval = window.eval;
    // eslint-disable-next-line no-eval
    window.eval = function(code: string) {
      console.warn('Eval detected - potential security risk:', code);
      reportSecurityIssue('Eval detected', { code: code.substring(0, 100) });
      throw new Error('Eval is disabled for security reasons');
    };

    // DOMContentLoaded後の外部スクリプト追加を監視
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            if (element.tagName === 'SCRIPT') {
              const scriptElement = element as HTMLScriptElement;
              if (scriptElement.src && !isAllowedScript(scriptElement.src)) {
                console.warn('Unauthorized script detected:', scriptElement.src);
                reportSecurityIssue('Unauthorized script', { src: scriptElement.src });
                scriptElement.remove();
              }
            }
          }
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    return () => {
      document.removeEventListener('securitypolicyviolation', handleCspViolation);
      // eslint-disable-next-line no-eval
      window.eval = originalEval;
      observer.disconnect();
    };
  }, []);

  const reportSecurityIssue = (issue: string, details?: any) => {
    const report = {
      issue,
      details,
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp: new Date().toISOString()
    };

    // 開発環境ではコンソールに出力
    console.warn('Security Issue:', report);

    // 本番環境では外部サービスに送信（将来実装）
    if (process.env.NODE_ENV === 'production') {
      // fetch('/api/security-report', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(report)
      // }).catch(err => console.error('Failed to report security issue:', err));
    }
  };

  const checkContentSecurity = (): boolean => {
    // XSSやその他のセキュリティ問題のチェック
    const suspiciousPatterns = [
      /<script[^>]*>/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /<iframe[^>]*>/i
    ];

    const documentHTML = document.documentElement.innerHTML;
    
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(documentHTML)) {
        reportSecurityIssue('Suspicious content detected', { pattern: pattern.source });
        return false;
      }
    }

    return true;
  };

  const isAllowedScript = (src: string): boolean => {
    const allowedDomains = [
      'localhost',
      '127.0.0.1',
      'cdn.jsdelivr.net',
      'unpkg.com',
      'fonts.googleapis.com',
      'fonts.gstatic.com'
    ];

    try {
      const url = new URL(src);
      return allowedDomains.some(domain => 
        url.hostname === domain || url.hostname.endsWith('.' + domain)
      );
    } catch {
      return false;
    }
  };

  const contextValue: SecurityContextType = {
    reportSecurityIssue,
    checkContentSecurity
  };

  return (
    <SecurityContext.Provider value={contextValue}>
      {children}
    </SecurityContext.Provider>
  );
};

export const useSecurity = (): SecurityContextType => {
  const context = useContext(SecurityContext);
  if (!context) {
    throw new Error('useSecurity must be used within a SecurityProvider');
  }
  return context;
};