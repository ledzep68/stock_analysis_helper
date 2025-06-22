import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress
} from '@mui/material';
import { login } from '../services/api';

interface LoginProps {
  onLogin: (token: string) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('testuser@example.com');
  const [password, setPassword] = useState('TestPassword123@');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const token = await login(email, password);
      console.log('Login response received, token:', !!token);
      onLogin(token);
      console.log('onLogin called');
    } catch (err: any) {
      console.error('Login error:', err);
      if (err.response) {
        setError(`エラー: ${err.response.data?.error || err.response.statusText} (${err.response.status})`);
      } else if (err.request) {
        setError('サーバーに接続できません。APIサーバーが起動しているか確認してください。');
      } else {
        setError(`エラー: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      minHeight="100vh"
      bgcolor="grey.100"
    >
      <Card sx={{ minWidth: 300, maxWidth: 400 }}>
        <CardContent>
          <Typography variant="h5" component="h1" gutterBottom textAlign="center">
            ログイン
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom textAlign="center">
            株式分析ヘルパー
          </Typography>
          
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleLogin}>
            <TextField
              fullWidth
              label="メールアドレス"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="パスワード"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              margin="normal"
              required
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading}
              data-testid="login-loading"
            >
              {loading ? <CircularProgress size={24} /> : 'ログイン'}
            </Button>
          </Box>

          <Typography variant="body2" color="text.secondary" textAlign="center">
            テスト用アカウント情報が入力済みです
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};