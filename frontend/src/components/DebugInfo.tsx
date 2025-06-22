import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { useMediaQuery, useTheme } from '@mui/material';

export const DebugInfo: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const hasToken = !!localStorage.getItem('token');
  
  return (
    <Paper sx={{ p: 2, mb: 2, bgcolor: 'warning.light' }}>
      <Typography variant="h6">🔍 デバッグ情報</Typography>
      <Typography>画面幅: {window.innerWidth}px</Typography>
      <Typography>画面高: {window.innerHeight}px</Typography>
      <Typography>isMobile: {isMobile ? 'true' : 'false'}</Typography>
      <Typography>breakpoint md: {theme.breakpoints.values.md}px</Typography>
      <Typography>認証状態: {hasToken ? 'ログイン済み' : '未ログイン'}</Typography>
      <Typography>現在時刻: {new Date().toLocaleTimeString()}</Typography>
      <Typography>User Agent: {navigator.userAgent.slice(0, 50)}...</Typography>
    </Paper>
  );
};