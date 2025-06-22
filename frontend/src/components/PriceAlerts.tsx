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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Switch,
  FormControlLabel,
  Alert,
  CircularProgress,
  Tooltip,
  Fab
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Notifications as NotificationsIcon,
  NotificationsOff as NotificationsOffIcon,
  History as HistoryIcon,
  TrendingUp,
  TrendingDown,
  ShowChart,
  VolumeUp
} from '@mui/icons-material';
import { api } from '../services/api';

interface PriceAlert {
  id: number;
  symbol: string;
  alert_type: 'price_above' | 'price_below' | 'percent_change' | 'volume_spike' | 'technical_signal';
  target_value: number;
  current_value: number;
  is_active: boolean;
  triggered_at: string | null;
  created_at: string;
  updated_at: string;
}

interface AlertHistory {
  id: number;
  alert_id: number;
  triggered_value: number;
  message: string;
  created_at: string;
  symbol: string;
  alert_type: string;
}

interface PriceAlertsProps {
  presetSymbol?: string;
}

export const PriceAlerts: React.FC<PriceAlertsProps> = ({ presetSymbol }) => {
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [history, setHistory] = useState<AlertHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<PriceAlert | null>(null);
  const [formData, setFormData] = useState({
    symbol: '',
    alertType: 'price_above',
    targetValue: ''
  });

  useEffect(() => {
    fetchAlerts();
    // If preset symbol is provided, open create dialog with preset
    if (presetSymbol) {
      setFormData(prev => ({ ...prev, symbol: presetSymbol }));
      setCreateDialogOpen(true);
    }
  }, [presetSymbol]);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/alerts');
      setAlerts(response.data.data);
    } catch (err) {
      setError('アラートの取得に失敗しました');
      console.error('Fetch alerts error:', err);
    } finally {
      setLoading(false);
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
        setFormData({ symbol: '', alertType: 'price_above', targetValue: '' });
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
        is_active: selectedAlert.is_active
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

  const handleDeleteAlert = async (alertId: number) => {
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
        is_active: !alert.is_active
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
      alertType: alert.alert_type,
      targetValue: alert.target_value.toString()
    });
    setEditDialogOpen(true);
  };

  const openHistoryDialog = async () => {
    await fetchHistory();
    setHistoryDialogOpen(true);
  };

  const getAlertTypeLabel = (type: string) => {
    switch (type) {
      case 'price_above': return '価格上昇';
      case 'price_below': return '価格下落';
      case 'percent_change': return '変動率';
      case 'volume_spike': return '出来高急増';
      case 'technical_signal': return 'テクニカル';
      default: return type;
    }
  };

  const getAlertTypeIcon = (type: string) => {
    switch (type) {
      case 'price_above': return <TrendingUp />;
      case 'price_below': return <TrendingDown />;
      case 'percent_change': return <ShowChart />;
      case 'volume_spike': return <VolumeUp />;
      case 'technical_signal': return <ShowChart />;
      default: return <NotificationsIcon />;
    }
  };

  const getAlertStatusColor = (alert: PriceAlert) => {
    if (alert.triggered_at) return 'success';
    if (alert.is_active) return 'primary';
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
                      {getAlertTypeIcon(alert.alert_type)}
                      <Typography variant="body2" sx={{ ml: 1 }}>
                        {alert.symbol}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={getAlertTypeLabel(alert.alert_type)}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    {alert.alert_type.includes('percent') 
                      ? `${alert.target_value}%`
                      : `¥${alert.target_value.toFixed(2)}`
                    }
                  </TableCell>
                  <TableCell>
                    {alert.alert_type.includes('percent')
                      ? '-'
                      : `¥${alert.current_value.toFixed(2)}`
                    }
                  </TableCell>
                  <TableCell>
                    <Box display="flex" alignItems="center">
                      <Chip
                        icon={alert.is_active ? <NotificationsIcon /> : <NotificationsOffIcon />}
                        label={alert.triggered_at ? '発動済み' : alert.is_active ? '有効' : '無効'}
                        color={getAlertStatusColor(alert) as any}
                        size="small"
                      />
                      <Switch
                        checked={alert.is_active}
                        onChange={() => handleToggleAlert(alert)}
                        disabled={!!alert.triggered_at}
                        size="small"
                        sx={{ ml: 1 }}
                      />
                    </Box>
                  </TableCell>
                  <TableCell>
                    {new Date(alert.created_at).toLocaleDateString('ja-JP')}
                  </TableCell>
                  <TableCell>
                    <Tooltip title="編集">
                      <IconButton
                        size="small"
                        onClick={() => openEditDialog(alert)}
                        disabled={!!alert.triggered_at}
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
                  onChange={(e) => setFormData({ ...formData, alertType: e.target.value })}
                >
                  <MenuItem value="price_above">価格上昇アラート</MenuItem>
                  <MenuItem value="price_below">価格下落アラート</MenuItem>
                  <MenuItem value="percent_change">変動率アラート</MenuItem>
                  <MenuItem value="volume_spike">出来高急増アラート</MenuItem>
                  <MenuItem value="technical_signal">テクニカルシグナル</MenuItem>
                </Select>
              </FormControl>
              <TextField
                fullWidth
                label={formData.alertType.includes('percent') ? '変動率 (%)' : 'ターゲット価格 (¥)'}
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
                  onChange={(e) => setFormData({ ...formData, alertType: e.target.value })}
                >
                  <MenuItem value="price_above">価格上昇アラート</MenuItem>
                  <MenuItem value="price_below">価格下落アラート</MenuItem>
                  <MenuItem value="percent_change">変動率アラート</MenuItem>
                  <MenuItem value="volume_spike">出来高急増アラート</MenuItem>
                  <MenuItem value="technical_signal">テクニカルシグナル</MenuItem>
                </Select>
              </FormControl>
              <TextField
                fullWidth
                label={formData.alertType.includes('percent') ? '変動率 (%)' : 'ターゲット価格 (¥)'}
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
                          label={getAlertTypeLabel(item.alert_type)}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>¥{item.triggered_value.toFixed(2)}</TableCell>
                      <TableCell>{item.message}</TableCell>
                      <TableCell>
                        {new Date(item.created_at).toLocaleString('ja-JP')}
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