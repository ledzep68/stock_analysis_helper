import React, { useState, useEffect } from 'react';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  List,
  ListItemIcon,
  ListItemText,
  BottomNavigation,
  BottomNavigationAction,
  useMediaQuery,
  useTheme,
  Fab,
  SwipeableDrawer,
  ListItemButton,
  Divider,
  Avatar,
  Card,
  CardContent,
  Chip
} from '@mui/material';
import {
  Menu as MenuIcon,
  Search as SearchIcon,
  Notifications as NotificationsIcon,
  Home as HomeIcon,
  TrendingUp as TrendingUpIcon,
  Assessment as AssessmentIcon,
  Person as PersonIcon,
  Add as AddIcon,
  Settings as SettingsIcon,
  Favorite as FavoriteIcon,
  ShowChart as ShowChartIcon,
  PictureAsPdf as ReportIcon,
  NotificationsActive as AlertIcon,
  Help as HelpIcon,
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
  AccountBalance as EcoIcon
} from '@mui/icons-material';

interface MobileLayoutProps {
  children: React.ReactNode;
  currentPage?: string;
  onPageChange?: (page: string) => void;
  onLogout?: () => void;
  darkMode?: boolean;
  onThemeToggle?: () => void;
}

export const MobileLayout: React.FC<MobileLayoutProps> = ({ 
  children, 
  currentPage = 'home', 
  onPageChange,
  onLogout,
  darkMode = false,
  onThemeToggle
}) => {
  const theme = useTheme();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [bottomNavValue, setBottomNavValue] = useState(currentPage);
  const [notifications] = useState(3); // Mock notification count
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleDrawerToggle = () => {
    setDrawerOpen(!drawerOpen);
  };

  const handleBottomNavChange = (event: React.SyntheticEvent, newValue: string) => {
    setBottomNavValue(newValue);
    if (onPageChange) {
      onPageChange(newValue);
    }
  };

  const menuItems = [
    { id: 'home', text: 'ホーム', icon: <HomeIcon /> },
    { id: 'search', text: '企業検索', icon: <SearchIcon /> },
    { id: 'favorites', text: 'お気に入り', icon: <FavoriteIcon /> },
    { id: 'technical', text: 'テクニカル分析', icon: <ShowChartIcon /> },
    { id: 'esg', text: 'ESG評価', icon: <EcoIcon /> },
    { id: 'reports', text: 'レポート', icon: <ReportIcon /> },
    { id: 'alerts', text: 'アラート', icon: <AlertIcon /> },
    { id: 'profile', text: 'プロフィール', icon: <PersonIcon /> },
    { id: 'help', text: 'ヘルプ', icon: <HelpIcon /> },
    { id: 'settings', text: '設定', icon: <SettingsIcon /> }
  ];

  const bottomNavItems = [
    { value: 'home', label: 'ホーム', icon: <HomeIcon /> },
    { value: 'search', label: '検索', icon: <SearchIcon /> },
    { value: 'analysis', label: '分析', icon: <AssessmentIcon /> },
    { value: 'esg', label: 'ESG', icon: <EcoIcon /> },
    { value: 'portfolio', label: 'ポートフォリオ', icon: <TrendingUpIcon /> },
    { value: 'profile', label: 'プロフィール', icon: <PersonIcon /> }
  ];

  const drawerContent = (
    <Box sx={{ width: 280 }}>
      {/* User Profile Section */}
      <Box sx={{ p: 2, bgcolor: 'primary.main', color: 'white' }}>
        <Box display="flex" alignItems="center" mb={1}>
          <Avatar sx={{ mr: 2 }}>U</Avatar>
          <Box>
            <Typography variant="subtitle1">ユーザー名</Typography>
            <Typography variant="caption">user@example.com</Typography>
          </Box>
        </Box>
        {!isOnline && (
          <Chip 
            label="オフライン" 
            size="small" 
            color="warning" 
            variant="outlined"
            sx={{ mt: 1 }}
          />
        )}
      </Box>

      <Divider />

      {/* Navigation Menu */}
      <List>
        {menuItems.map((item) => (
          <ListItemButton
            key={item.id}
            selected={currentPage === item.id}
            onClick={() => {
              if (onPageChange) onPageChange(item.id);
              setDrawerOpen(false);
            }}
          >
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText primary={item.text} />
            {item.id === 'alerts' && notifications > 0 && (
              <Chip label={notifications} size="small" color="error" />
            )}
          </ListItemButton>
        ))}
      </List>

      <Divider />

      {/* Theme Toggle */}
      {onThemeToggle && (
        <ListItemButton onClick={() => {
          onThemeToggle();
          setDrawerOpen(false);
        }}>
          <ListItemIcon>
            {darkMode ? <LightModeIcon /> : <DarkModeIcon />}
          </ListItemIcon>
          <ListItemText primary={darkMode ? "ライトモード" : "ダークモード"} />
        </ListItemButton>
      )}

      {/* Logout Button */}
      {onLogout && (
        <ListItemButton onClick={() => {
          onLogout();
          setDrawerOpen(false);
        }}>
          <ListItemIcon>
            <PersonIcon />
          </ListItemIcon>
          <ListItemText primary="ログアウト" />
        </ListItemButton>
      )}

      <Divider />

      {/* App Info */}
      <Box sx={{ p: 2 }}>
        <Typography variant="caption" color="text.secondary">
          株式分析ヘルパー v3.0
        </Typography>
        <br />
        <Typography variant="caption" color="text.secondary">
          {isOnline ? 'オンライン' : 'オフラインモード'}
        </Typography>
      </Box>
    </Box>
  );

  // 常にモバイルレイアウトを使用
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Top App Bar */}
      <AppBar position="fixed" sx={{ zIndex: theme.zIndex.drawer + 1 }}>
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2 }}
            data-testid="hamburger-menu"
          >
            <MenuIcon />
          </IconButton>
          
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            株式分析ヘルパー
          </Typography>
          
          <IconButton 
            color="inherit"
            onClick={() => {
              if (onPageChange) onPageChange('search');
            }}
            data-testid="top-search-button"
          >
            <SearchIcon />
          </IconButton>
          
          <IconButton 
            color="inherit"
            onClick={() => {
              if (onPageChange) onPageChange('alerts');
            }}
            data-testid="top-notifications-button"
          >
            <NotificationsIcon />
            {notifications > 0 && (
              <Box
                sx={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  bgcolor: 'error.main',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Typography variant="caption" sx={{ fontSize: 10, color: 'white' }}>
                  {notifications}
                </Typography>
              </Box>
            )}
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Navigation Drawer */}
      <SwipeableDrawer
        anchor="left"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onOpen={() => setDrawerOpen(true)}
        sx={{
          '& .MuiDrawer-paper': {
            width: 280,
          },
        }}
        data-testid="drawer-menu"
      >
        {drawerContent}
      </SwipeableDrawer>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          mt: 8, // Account for AppBar height
          mb: 7,  // Account for BottomNavigation height
          overflow: 'auto',
          p: 1
        }}
      >
        {/* Offline Banner */}
        {!isOnline && (
          <Card sx={{ mb: 2, bgcolor: 'warning.light' }}>
            <CardContent sx={{ py: 1 }}>
              <Typography variant="body2" color="warning.dark">
                インターネット接続がありません。一部の機能が制限されています。
              </Typography>
            </CardContent>
          </Card>
        )}

        {children}
      </Box>

      {/* Bottom Navigation */}
      <BottomNavigation
        value={bottomNavValue}
        onChange={handleBottomNavChange}
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: theme.zIndex.drawer + 1,
          borderTop: 1,
          borderColor: 'divider'
        }}
        data-testid="bottom-nav"
      >
        {bottomNavItems.map((item) => (
          <BottomNavigationAction
            key={item.value}
            label={item.label}
            value={item.value}
            icon={item.icon}
          />
        ))}
      </BottomNavigation>

      {/* Floating Action Button */}
      <Fab
        color="primary"
        aria-label="add"
        sx={{
          position: 'fixed',
          bottom: 80,
          right: 16,
          zIndex: theme.zIndex.drawer + 1
        }}
        onClick={() => {
          if (onPageChange) onPageChange('search');
        }}
      >
        <AddIcon />
      </Fab>
    </Box>
  );
};