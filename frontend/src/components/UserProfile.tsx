import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Avatar,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Switch,
  Alert,
  Snackbar,
  Grid,
  Paper,
  Chip,
  IconButton
} from '@mui/material';
import {
  Person as PersonIcon,
  Email as EmailIcon,
  Security as SecurityIcon,
  Notifications as NotificationsIcon,
  Settings as SettingsIcon,
  Edit as EditIcon,
  Lock as LockIcon,
  Delete as DeleteIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { ListItemButton } from '@mui/material';

interface UserSettings {
  emailNotifications: boolean;
  pushNotifications: boolean;
  priceAlerts: boolean;
  newsAlerts: boolean;
  darkMode: boolean;
  language: string;
}

interface UserProfile {
  email: string;
  name: string;
  joinedAt: string;
  lastLogin: string;
  settings: UserSettings;
}

export const UserProfile: React.FC = () => {
  const [profile, setProfile] = useState<UserProfile>({
    email: 'testuser@example.com',
    name: 'テストユーザー',
    joinedAt: '2025-06-19',
    lastLogin: new Date().toISOString(),
    settings: {
      emailNotifications: true,
      pushNotifications: false,
      priceAlerts: true,
      newsAlerts: false,
      darkMode: false,
      language: 'ja'
    }
  });

  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  const [editForm, setEditForm] = useState({
    name: profile.name,
    email: profile.email
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const handleSettingChange = (setting: keyof UserSettings) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setProfile(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        [setting]: event.target.checked
      }
    }));
    setSnackbar({ open: true, message: '設定を更新しました', severity: 'success' });
  };

  const handleEditProfile = () => {
    setProfile(prev => ({
      ...prev,
      name: editForm.name,
      email: editForm.email
    }));
    setEditProfileOpen(false);
    setSnackbar({ open: true, message: 'プロフィールを更新しました', severity: 'success' });
  };

  const handleChangePassword = () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setSnackbar({ open: true, message: 'パスワードが一致しません', severity: 'error' });
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      setSnackbar({ open: true, message: 'パスワードは8文字以上で入力してください', severity: 'error' });
      return;
    }
    
    setChangePasswordOpen(false);
    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setSnackbar({ open: true, message: 'パスワードを変更しました', severity: 'success' });
  };

  const handleDeleteAccount = () => {
    setDeleteAccountOpen(false);
    setSnackbar({ open: true, message: 'アカウント削除の処理を開始しました', severity: 'success' });
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" color="primary" gutterBottom>
        ユーザープロフィール
      </Typography>

      {/* プロフィール情報 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" alignItems="center" mb={3}>
            <Avatar sx={{ width: 80, height: 80, mr: 2, bgcolor: 'primary.main' }}>
              <PersonIcon sx={{ fontSize: 40 }} />
            </Avatar>
            <Box flex={1}>
              <Typography variant="h6">{profile.name}</Typography>
              <Typography variant="body2" color="text.secondary">{profile.email}</Typography>
              <Box display="flex" gap={1} mt={1}>
                <Chip label="プレミアムユーザー" size="small" color="primary" />
                <Chip label="アクティブ" size="small" color="success" />
              </Box>
            </Box>
            <IconButton onClick={() => setEditProfileOpen(true)}>
              <EditIcon />
            </IconButton>
          </Box>

          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Typography variant="body2" color="text.secondary">登録日</Typography>
              <Typography variant="body1">{new Date(profile.joinedAt).toLocaleDateString()}</Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="body2" color="text.secondary">最終ログイン</Typography>
              <Typography variant="body1">{new Date(profile.lastLogin).toLocaleString()}</Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* 通知設定 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            <NotificationsIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            通知設定
          </Typography>
          <List>
            <ListItem>
              <ListItemIcon><EmailIcon /></ListItemIcon>
              <ListItemText primary="メール通知" secondary="重要な更新をメールで受信" />
              <ListItemSecondaryAction>
                <Switch
                  checked={profile.settings.emailNotifications}
                  onChange={handleSettingChange('emailNotifications')}
                />
              </ListItemSecondaryAction>
            </ListItem>
            <ListItem>
              <ListItemIcon><NotificationsIcon /></ListItemIcon>
              <ListItemText primary="プッシュ通知" secondary="ブラウザ通知を有効にする" />
              <ListItemSecondaryAction>
                <Switch
                  checked={profile.settings.pushNotifications}
                  onChange={handleSettingChange('pushNotifications')}
                />
              </ListItemSecondaryAction>
            </ListItem>
            <ListItem>
              <ListItemIcon><InfoIcon /></ListItemIcon>
              <ListItemText primary="価格アラート" secondary="設定した価格に達した時の通知" />
              <ListItemSecondaryAction>
                <Switch
                  checked={profile.settings.priceAlerts}
                  onChange={handleSettingChange('priceAlerts')}
                />
              </ListItemSecondaryAction>
            </ListItem>
          </List>
        </CardContent>
      </Card>

      {/* セキュリティ */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            <SecurityIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            セキュリティ
          </Typography>
          <List>
            <ListItemButton onClick={() => setChangePasswordOpen(true)}>
              <ListItemIcon><LockIcon /></ListItemIcon>
              <ListItemText primary="パスワード変更" secondary="アカウントのパスワードを変更" />
            </ListItemButton>
          </List>
        </CardContent>
      </Card>

      {/* アカウント管理 */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            <SettingsIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            アカウント管理
          </Typography>
          <List>
            <ListItemButton onClick={() => setDeleteAccountOpen(true)}>
              <ListItemIcon><DeleteIcon color="error" /></ListItemIcon>
              <ListItemText 
                primary="アカウント削除" 
                secondary="この操作は取り消せません"
                primaryTypographyProps={{ color: 'error' }}
              />
            </ListItemButton>
          </List>
        </CardContent>
      </Card>

      {/* プロフィール編集ダイアログ */}
      <Dialog open={editProfileOpen} onClose={() => setEditProfileOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>プロフィール編集</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="名前"
            value={editForm.name}
            onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
            margin="normal"
          />
          <TextField
            fullWidth
            label="メールアドレス"
            type="email"
            value={editForm.email}
            onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
            margin="normal"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditProfileOpen(false)}>キャンセル</Button>
          <Button onClick={handleEditProfile} variant="contained">保存</Button>
        </DialogActions>
      </Dialog>

      {/* パスワード変更ダイアログ */}
      <Dialog open={changePasswordOpen} onClose={() => setChangePasswordOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>パスワード変更</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="現在のパスワード"
            type="password"
            value={passwordForm.currentPassword}
            onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
            margin="normal"
          />
          <TextField
            fullWidth
            label="新しいパスワード"
            type="password"
            value={passwordForm.newPassword}
            onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
            margin="normal"
            helperText="8文字以上で入力してください"
          />
          <TextField
            fullWidth
            label="新しいパスワード（確認）"
            type="password"
            value={passwordForm.confirmPassword}
            onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
            margin="normal"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setChangePasswordOpen(false)}>キャンセル</Button>
          <Button onClick={handleChangePassword} variant="contained">変更</Button>
        </DialogActions>
      </Dialog>

      {/* アカウント削除ダイアログ */}
      <Dialog open={deleteAccountOpen} onClose={() => setDeleteAccountOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle color="error">アカウント削除</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            この操作は取り消すことができません。アカウントとすべてのデータが削除されます。
          </Alert>
          <Typography variant="body2">
            アカウントを削除すると、以下のデータがすべて失われます：
          </Typography>
          <ul>
            <li>お気に入り銘柄</li>
            <li>価格アラート設定</li>
            <li>投資レポート</li>
            <li>アカウント設定</li>
          </ul>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteAccountOpen(false)}>キャンセル</Button>
          <Button onClick={handleDeleteAccount} color="error" variant="contained">
            削除する
          </Button>
        </DialogActions>
      </Dialog>

      {/* スナックバー */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};