import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Switch,
  FormControlLabel,
  Chip,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Alert,
  Divider,
  Grid,
  Paper,
  Fab,
  Badge,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  CircularProgress
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  NotificationsActive,
  NotificationsOff,
  TrendingUp,
  TrendingDown,
  ShowChart,
  VolumeUp,
  History as HistoryIcon,
  Notifications as NotificationsIcon,
  NotificationsOff as NotificationsOffIcon
} from '@mui/icons-material';
import { api } from '../services/api';

interface PriceAlert {
  id: string;
  symbol: string;
  alertType: 'PRICE_TARGET' | 'PRICE_CHANGE' | 'VOLUME_SPIKE';
  targetValue: number;
  currentValue?: number;
  condition: 'ABOVE' | 'BELOW' | 'CHANGE_PERCENT';
  isActive: boolean;
  lastTriggered?: string;
  createdAt: string;
  metadata?: {
    companyName?: string;
    notificationMethod?: string;
  };
}

interface AlertStats {
  total_alerts: number;
  active_alerts: number;
  triggered_alerts: number;
  recent_triggers: any[];
}

interface PriceAlertsProps {
  presetSymbol?: string;
}

const PriceAlerts: React.FC<PriceAlertsProps> = ({ presetSymbol }) => {
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [stats, setStats] = useState<AlertStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingAlert, setEditingAlert] = useState<PriceAlert | null>(null);
  const [formData, setFormData] = useState<{
    symbol: string;
    alertType: 'PRICE_TARGET' | 'PRICE_CHANGE' | 'VOLUME_SPIKE';
    targetValue: string;
    condition: 'ABOVE' | 'BELOW' | 'CHANGE_PERCENT';
    companyName: string;
    notificationMethod: string;
  }>({
    symbol: presetSymbol || '',
    alertType: 'PRICE_TARGET',
    targetValue: '',
    condition: 'ABOVE',
    companyName: '',
    notificationMethod: 'WEB_PUSH'
  });
  const [history, setHistory] = useState<any[]>([]);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<PriceAlert | null>(null);

  useEffect(() => {
    fetchAlerts();
    fetchStats();
  }, []);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const response = await api.get('/price-alerts');
      setAlerts(response.data.alerts || []);
    } catch (err: any) {
      setError('アラートの取得に失敗しました');
      console.error('Fetch alerts error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/price-alerts/stats/summary');
      setStats(response.data.stats);
    } catch (err) {
      console.error('Fetch stats error:', err);
    }
  };

  const fetchHistory = async () => {
    try {
      const response = await api.get('/alerts/history');
      setHistory(response.data.data);
    } catch (err) {
      console.error('Fetch history error:', err);
    }
  };

  const handleCreateAlert = async () => {
    try {
      const response = await api.post('/alerts', {
        symbol: formData.symbol.toUpperCase(),
        alertType: formData.alertType,
        targetValue: parseFloat(formData.targetValue)
      });

      if (response.data.success) {
        await fetchAlerts();
        setCreateDialogOpen(false);
        setFormData({ 
          symbol: presetSymbol || '', 
          alertType: 'PRICE_TARGET', 
          targetValue: '', 
          condition: 'ABOVE',
          companyName: '',
          notificationMethod: 'WEB_PUSH'
        });
      }
    } catch (err) {
      setError('アラートの作成に失敗しました');
      console.error('Create alert error:', err);
    }
  };

  const handleUpdateAlert = async () => {
    if (!selectedAlert) return;

    try {
      const response = await api.put(`/alerts/${selectedAlert.id}`, {
        target_value: parseFloat(formData.targetValue),
        alert_type: formData.alertType,
        is_active: selectedAlert.isActive
      });

      if (response.data.success) {
        await fetchAlerts();
        setEditDialogOpen(false);
        setSelectedAlert(null);
      }
    } catch (err) {
      setError('アラートの更新に失敗しました');
      console.error('Update alert error:', err);
    }
  };

  const handleDeleteAlert = async (alertId: string) => {
    try {
      const response = await api.delete(`/alerts/${alertId}`);
      
      if (response.data.success) {
        await fetchAlerts();
      }
    } catch (err) {
      setError('アラートの削除に失敗しました');
      console.error('Delete alert error:', err);
    }
  };

  const handleToggleAlert = async (alert: PriceAlert) => {
    try {
      const response = await api.put(`/alerts/${alert.id}`, {
        is_active: !alert.isActive
      });

      if (response.data.success) {
        await fetchAlerts();
      }
    } catch (err) {
      setError('アラートの切り替えに失敗しました');
      console.error('Toggle alert error:', err);
    }
  };

  const openEditDialog = (alert: PriceAlert) => {
    setSelectedAlert(alert);
    setFormData({
      symbol: alert.symbol,
      alertType: alert.alertType,
      targetValue: alert.targetValue.toString(),
      condition: alert.condition,
      companyName: alert.metadata?.companyName || '',
      notificationMethod: alert.metadata?.notificationMethod || 'WEB_PUSH'
    });
    setEditDialogOpen(true);
  };

  const openHistoryDialog = async () => {
    await fetchHistory();
    setHistoryDialogOpen(true);
  };

  const getAlertTypeLabel = (type: string) => {
    switch (type) {
      case 'PRICE_TARGET': return '価格目標';
      case 'PRICE_CHANGE': return '価格変動';
      case 'VOLUME_SPIKE': return '出来高急増';
      default: return type;
    }
  };

  const getAlertTypeIcon = (type: string) => {
    switch (type) {
      case 'PRICE_TARGET': return <TrendingUp />;
      case 'PRICE_CHANGE': return <ShowChart />;
      case 'VOLUME_SPIKE': return <VolumeUp />;
      default: return <NotificationsIcon />;
    }
  };

  const getAlertStatusColor = (alert: PriceAlert) => {
    if (alert.lastTriggered) return 'success';
    if (alert.isActive) return 'primary';
    return 'default';
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h5" component="h2">
            価格アラート
          </Typography>
          <Box>
            <Button
              startIcon={<HistoryIcon />}
              onClick={openHistoryDialog}
              sx={{ mr: 1 }}
            >
              履歴
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setCreateDialogOpen(true)}
            >
              アラート作成
            </Button>
          </Box>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>銘柄</TableCell>
                <TableCell>種類</TableCell>
                <TableCell>目標値</TableCell>
                <TableCell>現在値</TableCell>
                <TableCell>状態</TableCell>
                <TableCell>作成日時</TableCell>
                <TableCell>操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {alerts.map((alert) => (
                <TableRow key={alert.id}>
                  <TableCell>
                    <Box display="flex" alignItems="center">
                      {getAlertTypeIcon(alert.alertType)}
                      <Typography variant="body2" sx={{ ml: 1 }}>
                        {alert.symbol}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={getAlertTypeLabel(alert.alertType)}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    {alert.alertType.includes('CHANGE') 
                      ? `${alert.targetValue}%`
                      : `¥${alert.targetValue.toFixed(2)}`
                    }
                  </TableCell>
                  <TableCell>
                    {alert.alertType.includes('CHANGE')
                      ? '-'
                      : alert.currentValue ? `¥${alert.currentValue.toFixed(2)}` : '-'
                    }
                  </TableCell>
                  <TableCell>
                    <Box display="flex" alignItems="center">
                      <Chip
                        icon={alert.isActive ? <NotificationsIcon /> : <NotificationsOffIcon />}
                        label={alert.lastTriggered ? '発動済み' : alert.isActive ? '有効' : '無効'}
                        color={getAlertStatusColor(alert) as any}
                        size="small"
                      />
                      <Switch
                        checked={alert.isActive}
                        onChange={() => handleToggleAlert(alert)}
                        disabled={!!alert.lastTriggered}
                        size="small"
                        sx={{ ml: 1 }}
                      />
                    </Box>
                  </TableCell>
                  <TableCell>
                    {new Date(alert.createdAt).toLocaleDateString('ja-JP')}
                  </TableCell>
                  <TableCell>
                    <Tooltip title="編集">
                      <IconButton
                        size="small"
                        onClick={() => openEditDialog(alert)}
                        disabled={!!alert.lastTriggered}
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="削除">
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteAlert(alert.id)}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
              {alerts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <Typography color="text.secondary">
                      アラートが設定されていません
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Create Alert Dialog */}
        <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>新しいアラートを作成</DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 1 }}>
              <TextField
                fullWidth
                label="銘柄コード"
                value={formData.symbol}
                onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
                margin="normal"
                placeholder="例: 7203, AAPL"
              />
              <FormControl fullWidth margin="normal">
                <InputLabel>アラート種類</InputLabel>
                <Select
                  value={formData.alertType}
                  onChange={(e) => setFormData({ ...formData, alertType: e.target.value as 'PRICE_TARGET' | 'PRICE_CHANGE' | 'VOLUME_SPIKE' })}
                >
                  <MenuItem value="PRICE_TARGET">価格目標アラート</MenuItem>
                  <MenuItem value="PRICE_CHANGE">価格変動アラート</MenuItem>
                  <MenuItem value="VOLUME_SPIKE">出来高急増アラート</MenuItem>
                </Select>
              </FormControl>
              <TextField
                fullWidth
                label={formData.alertType.includes('CHANGE') ? '変動率 (%)' : 'ターゲット価格 (¥)'}
                value={formData.targetValue}
                onChange={(e) => setFormData({ ...formData, targetValue: e.target.value })}
                type="number"
                margin="normal"
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCreateDialogOpen(false)}>キャンセル</Button>
            <Button onClick={handleCreateAlert} variant="contained">作成</Button>
          </DialogActions>
        </Dialog>

        {/* Edit Alert Dialog */}
        <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>アラートを編集</DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 1 }}>
              <TextField
                fullWidth
                label="銘柄コード"
                value={formData.symbol}
                disabled
                margin="normal"
              />
              <FormControl fullWidth margin="normal">
                <InputLabel>アラート種類</InputLabel>
                <Select
                  value={formData.alertType}
                  onChange={(e) => setFormData({ ...formData, alertType: e.target.value as 'PRICE_TARGET' | 'PRICE_CHANGE' | 'VOLUME_SPIKE' })}
                >
                  <MenuItem value="PRICE_TARGET">価格目標アラート</MenuItem>
                  <MenuItem value="PRICE_CHANGE">価格変動アラート</MenuItem>
                  <MenuItem value="VOLUME_SPIKE">出来高急増アラート</MenuItem>
                </Select>
              </FormControl>
              <TextField
                fullWidth
                label={formData.alertType.includes('CHANGE') ? '変動率 (%)' : 'ターゲット価格 (¥)'}
                value={formData.targetValue}
                onChange={(e) => setFormData({ ...formData, targetValue: e.target.value })}
                type="number"
                margin="normal"
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditDialogOpen(false)}>キャンセル</Button>
            <Button onClick={handleUpdateAlert} variant="contained">更新</Button>
          </DialogActions>
        </Dialog>

        {/* History Dialog */}
        <Dialog open={historyDialogOpen} onClose={() => setHistoryDialogOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>アラート履歴</DialogTitle>
          <DialogContent>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>銘柄</TableCell>
                    <TableCell>種類</TableCell>
                    <TableCell>発動価格</TableCell>
                    <TableCell>メッセージ</TableCell>
                    <TableCell>発動日時</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {history.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.symbol}</TableCell>
                      <TableCell>
                        <Chip
                          label={getAlertTypeLabel(item.alertType || item.alert_type)}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>¥{(item.triggerPrice || item.triggered_value || 0).toFixed(2)}</TableCell>
                      <TableCell>{item.message || 'アラートが発動しました'}</TableCell>
                      <TableCell>
                        {new Date(item.createdAt || item.created_at).toLocaleString('ja-JP')}
                      </TableCell>
                    </TableRow>
                  ))}
                  {history.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        <Typography color="text.secondary">
                          履歴がありません
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setHistoryDialogOpen(false)}>閉じる</Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default PriceAlerts;