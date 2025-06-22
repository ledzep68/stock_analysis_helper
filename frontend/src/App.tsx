import React, { useState, useEffect } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, Typography, Box, useMediaQuery } from '@mui/material';
import { Search as SearchIcon, Assessment as AssessmentIcon, Notifications as NotificationsIcon, PictureAsPdf as ReportIcon } from '@mui/icons-material';
import CompanySearch from './components/CompanySearch';
import FinancialSummary from './components/FinancialSummary';
import { SecurityProvider } from './components/SecurityProvider';
import { MobileLayout } from './components/MobileLayout';
import { TechnicalAnalysis } from './components/TechnicalAnalysis';
import { PriceAlerts } from './components/PriceAlerts';
import { ReportGenerator } from './components/ReportGenerator';
import { Portfolio } from './components/Portfolio';
import { UserProfile } from './components/UserProfile';
import { PWAInstallPrompt } from './components/PWAInstallPrompt';
import { Login } from './components/Login';
import { usePWA } from './hooks/usePWA';
import { isAuthenticated, logout } from './services/api';
import { Company } from './types';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
  typography: {
    h4: {
      fontWeight: 600,
    },
    h5: {
      fontWeight: 600,
    },
  },
});

function App() {
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [currentPage, setCurrentPage] = useState('home');
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  
  const { isInstallable, registerServiceWorker } = usePWA();

  useEffect(() => {
    // Check authentication status
    setAuthenticated(isAuthenticated());
    
    // Register service worker
    registerServiceWorker();

    // Show install prompt after 30 seconds if installable
    const timer = setTimeout(() => {
      if (isInstallable && !localStorage.getItem('installPromptShown')) {
        setShowInstallPrompt(true);
        localStorage.setItem('installPromptShown', 'true');
      }
    }, 30000);

    return () => clearTimeout(timer);
  }, [isInstallable, registerServiceWorker]);

  const handleCompanySelect = (company: Company) => {
    setSelectedCompany(company);
    setCurrentPage('home'); // 企業選択後はホーム画面で詳細を表示
  };

  const handleBackToSearch = () => {
    setSelectedCompany(null);
  };

  const handleLogin = (token: string) => {
    localStorage.setItem('token', token);
    setAuthenticated(true);
    console.log('Login successful, token saved:', !!token);
  };

  const handleLogout = () => {
    logout();
    setAuthenticated(false);
    setSelectedCompany(null);
    setCurrentPage('home');
  };

  if (!authenticated) {
    return (
      <SecurityProvider>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <Login onLogin={handleLogin} />
        </ThemeProvider>
      </SecurityProvider>
    );
  }

  const renderContent = () => {
    if (selectedCompany && (currentPage === 'home' || currentPage === 'search')) {
      return (
        <Box>
          <Box sx={{ mb: 2, textAlign: 'center' }}>
            <Typography
              variant="body2"
              color="primary"
              sx={{ cursor: 'pointer', textDecoration: 'underline' }}
              onClick={handleBackToSearch}
            >
              ← 検索に戻る
            </Typography>
          </Box>
          <FinancialSummary company={selectedCompany} onPageChange={setCurrentPage} />
        </Box>
      );
    }

    switch (currentPage) {
      case 'search':
        return <CompanySearch onCompanySelect={handleCompanySelect} />;
      case 'analysis':
      case 'technical':
        return selectedCompany ? (
          <TechnicalAnalysis symbol={selectedCompany.symbol} />
        ) : (
          <Box textAlign="center" py={4}>
            <Typography>企業を選択してテクニカル分析を表示</Typography>
          </Box>
        );
      case 'portfolio':
        return <Portfolio />;
      case 'profile':
        return <UserProfile />;
      case 'favorites':
        return <Portfolio />;
      case 'help':
        return (
          <Box sx={{ p: 2 }}>
            <Typography variant="h5" gutterBottom color="primary">
              使い方ガイド
            </Typography>
            
            <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
              基本操作
            </Typography>
            <Typography variant="body2" paragraph>
              • 下のナビゲーションバーで主要機能に移動<br/>
              • 左上のメニューボタン（三本線）で全機能にアクセス<br/>
              • 右上の検索・通知ボタンで素早くアクセス
            </Typography>
            
            <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
              主要機能
            </Typography>
            <Typography variant="body2" paragraph>
              • <strong>企業検索:</strong> 銘柄コードや企業名で検索<br/>
              • <strong>テクニカル分析:</strong> 各種指標とチャート分析<br/>
              • <strong>価格アラート:</strong> 価格変動の通知設定<br/>
              • <strong>レポート生成:</strong> 分析結果のエクスポート
            </Typography>
            
            <Typography variant="body2" color="text.secondary" sx={{ mt: 3 }}>
              詳細なヘルプ機能は今後のアップデートで追加予定です。
            </Typography>
          </Box>
        );
      case 'settings':
        return (
          <Box textAlign="center" py={4}>
            <Typography variant="h5" gutterBottom>設定</Typography>
            <Typography>アプリ設定とユーザー管理機能</Typography>
          </Box>
        );
      case 'alerts':
        return <PriceAlerts presetSymbol={selectedCompany?.symbol} />;
      case 'reports':
        return <ReportGenerator />;
      case 'home':
      default:
        return selectedCompany ? (
          <FinancialSummary company={selectedCompany} onPageChange={setCurrentPage} />
        ) : (
          <Box>
            <Box textAlign="center" py={4}>
              <Typography variant="h4" gutterBottom color="primary">
                株式分析ヘルパー
              </Typography>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                プロフェッショナル株式分析ツール
              </Typography>
              
              <Box sx={{ mt: 3, px: 2 }}>
                <Typography variant="body1" color="text.secondary" paragraph>
                  日本株式の包括的な分析を支援するツールです。
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  企業検索・財務分析・テクニカル分析・価格アラート・レポート生成など、
                  投資判断に必要な機能を一つのアプリで提供します。
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  下のメニューまたは以下のボタンから各機能をご利用ください。
                </Typography>
              </Box>
            </Box>
            
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 2, p: 2 }}>
              <Box 
                onClick={() => setCurrentPage('search')}
                sx={{ 
                  p: 3, 
                  textAlign: 'center', 
                  bgcolor: 'primary.main', 
                  color: 'white', 
                  borderRadius: 2,
                  cursor: 'pointer',
                  '&:hover': { bgcolor: 'primary.dark' }
                }}
              >
                <SearchIcon sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="subtitle1">企業検索</Typography>
              </Box>
              
              <Box 
                onClick={() => setCurrentPage('analysis')}
                sx={{ 
                  p: 3, 
                  textAlign: 'center', 
                  bgcolor: 'secondary.main', 
                  color: 'white', 
                  borderRadius: 2,
                  cursor: 'pointer',
                  '&:hover': { bgcolor: 'secondary.dark' }
                }}
              >
                <AssessmentIcon sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="subtitle1">テクニカル分析</Typography>
              </Box>
              
              <Box 
                onClick={() => setCurrentPage('alerts')}
                sx={{ 
                  p: 3, 
                  textAlign: 'center', 
                  bgcolor: 'warning.main', 
                  color: 'white', 
                  borderRadius: 2,
                  cursor: 'pointer',
                  '&:hover': { bgcolor: 'warning.dark' }
                }}
              >
                <NotificationsIcon sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="subtitle1">価格アラート</Typography>
              </Box>
              
              <Box 
                onClick={() => setCurrentPage('reports')}
                sx={{ 
                  p: 3, 
                  textAlign: 'center', 
                  bgcolor: 'success.main', 
                  color: 'white', 
                  borderRadius: 2,
                  cursor: 'pointer',
                  '&:hover': { bgcolor: 'success.dark' }
                }}
              >
                <ReportIcon sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="subtitle1">レポート生成</Typography>
              </Box>
            </Box>
          </Box>
        );
    }
  };

  // 常にモバイルレイアウトを使用（デスクトップでも）
  return (
    <SecurityProvider>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <MobileLayout 
          currentPage={currentPage} 
          onPageChange={setCurrentPage}
          onLogout={handleLogout}
        >
          {renderContent()}
        </MobileLayout>
        <PWAInstallPrompt 
          open={showInstallPrompt} 
          onClose={() => setShowInstallPrompt(false)} 
        />
      </ThemeProvider>
    </SecurityProvider>
  );
}

export default App;