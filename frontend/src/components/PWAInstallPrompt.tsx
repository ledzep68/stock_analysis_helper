import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Slide,
  IconButton,
  Snackbar,
  Alert
} from '@mui/material';
import {
  GetApp as InstallIcon,
  Close as CloseIcon,
  Smartphone as SmartphoneIcon,
  Notifications as NotificationsIcon,
  CloudDownload as OfflineIcon,
  Speed as SpeedIcon,
  Security as SecurityIcon
} from '@mui/icons-material';
import { TransitionProps } from '@mui/material/transitions';
import { usePWA } from '../hooks/usePWA';

interface PWAInstallPromptProps {
  open: boolean;
  onClose: () => void;
}

const Transition = React.forwardRef(function Transition(
  props: TransitionProps & {
    children: React.ReactElement<any, any>;
  },
  ref: React.Ref<unknown>,
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

export const PWAInstallPrompt: React.FC<PWAInstallPromptProps> = ({ open, onClose }) => {
  const { installApp, requestNotificationPermission } = usePWA();
  const [installing, setInstalling] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);

  const handleInstall = async () => {
    setInstalling(true);
    
    try {
      const success = await installApp();
      
      if (success) {
        setShowSuccess(true);
        
        // Request notification permission after successful install
        setTimeout(async () => {
          await requestNotificationPermission();
        }, 1000);
        
        onClose();
      } else {
        setShowError(true);
      }
    } catch (error) {
      console.error('Installation failed:', error);
      setShowError(true);
    } finally {
      setInstalling(false);
    }
  };

  const features = [
    {
      icon: <SmartphoneIcon color="primary" />,
      title: 'ホーム画面に追加',
      description: 'アプリのようにホーム画面からすぐにアクセス'
    },
    {
      icon: <OfflineIcon color="primary" />,
      title: 'オフライン対応',
      description: 'インターネット接続がなくても基本機能が利用可能'
    },
    {
      icon: <NotificationsIcon color="primary" />,
      title: 'プッシュ通知',
      description: '重要な株価アラートをリアルタイムで受信'
    },
    {
      icon: <SpeedIcon color="primary" />,
      title: '高速起動',
      description: 'ネイティブアプリのような高速な動作'
    },
    {
      icon: <SecurityIcon color="primary" />,
      title: 'セキュア',
      description: 'HTTPS対応で安全なデータ通信'
    }
  ];

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        TransitionComponent={Transition}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            mx: 1
          }
        }}
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Box display="flex" alignItems="center">
              <InstallIcon color="primary" sx={{ mr: 1 }} />
              <Typography variant="h6">
                株式分析ヘルパーをインストール
              </Typography>
            </Box>
            <IconButton onClick={onClose} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        
        <DialogContent>
          <Typography variant="body1" paragraph>
            株式分析ヘルパーをデバイスにインストールして、より便利にご利用いただけます。
          </Typography>

          <Card variant="outlined" sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom color="primary">
                インストールの特典
              </Typography>
              <List dense>
                {features.map((feature, index) => (
                  <ListItem key={index} sx={{ px: 0 }}>
                    <ListItemIcon sx={{ minWidth: 40 }}>
                      {feature.icon}
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Typography variant="subtitle2">
                          {feature.title}
                        </Typography>
                      }
                      secondary={
                        <Typography variant="body2" color="text.secondary">
                          {feature.description}
                        </Typography>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>

          <Typography variant="body2" color="text.secondary">
            ※ インストールはいつでも削除できます。追加料金は発生しません。
          </Typography>
        </DialogContent>
        
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button onClick={onClose} color="inherit">
            後で
          </Button>
          <Button
            variant="contained"
            onClick={handleInstall}
            disabled={installing}
            startIcon={<InstallIcon />}
            sx={{ minWidth: 120 }}
          >
            {installing ? 'インストール中...' : 'インストール'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success Snackbar */}
      <Snackbar
        open={showSuccess}
        autoHideDuration={6000}
        onClose={() => setShowSuccess(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setShowSuccess(false)} severity="success">
          アプリのインストールが完了しました！ホーム画面からアクセスできます。
        </Alert>
      </Snackbar>

      {/* Error Snackbar */}
      <Snackbar
        open={showError}
        autoHideDuration={6000}
        onClose={() => setShowError(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setShowError(false)} severity="error">
          インストールに失敗しました。ブラウザの設定をご確認ください。
        </Alert>
      </Snackbar>
    </>
  );
};