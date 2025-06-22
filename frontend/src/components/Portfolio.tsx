import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Switch,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Grid,
  Alert,
  Fab,
  CircularProgress
} from '@mui/material';
import {
  Favorite as FavoriteIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Notifications as NotificationsIcon,
  Star as StarIcon
} from '@mui/icons-material';
import { api } from '../services/api';

interface Favorite {
  id: number;
  symbol: string;
  companyName?: string;
  currentPrice?: number;
  priceChange?: number;
  priceChangePercent?: number;
  notes?: string;
  priceAlertEnabled: boolean;
  targetPrice?: number;
  alertType?: 'above' | 'below' | 'change';
  addedAt: string;
  marketSegment?: string;
  exchange?: string;
}

interface AddFavoriteDialogProps {
  open: boolean;
  onClose: () => void;
  onAdd: (favorite: any) => void;
}

const AddFavoriteDialog: React.FC<AddFavoriteDialogProps> = ({ open, onClose, onAdd }) => {
  const [symbol, setSymbol] = useState('');
  const [notes, setNotes] = useState('');
  const [priceAlertEnabled, setPriceAlertEnabled] = useState(false);
  const [targetPrice, setTargetPrice] = useState('');
  const [alertType, setAlertType] = useState<'above' | 'below' | 'change'>('above');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!symbol.trim()) return;

    setLoading(true);
    try {
      console.log('Adding favorite with data:', {
        symbol: symbol.toUpperCase(),
        notes: notes || undefined,
        priceAlertEnabled,
        targetPrice: priceAlertEnabled ? parseFloat(targetPrice) : undefined,
        alertType: priceAlertEnabled ? alertType : undefined
      });

      const response = await api.post('/favorites', {
        symbol: symbol.toUpperCase(),
        notes: notes || undefined,
        priceAlertEnabled,
        targetPrice: priceAlertEnabled ? parseFloat(targetPrice) : undefined,
        alertType: priceAlertEnabled ? alertType : undefined
      });

      console.log('Add favorite response:', response.data);

      if (response.data.success) {
        onAdd(response.data.data.favorite);
        setSymbol('');
        setNotes('');
        setPriceAlertEnabled(false);
        setTargetPrice('');
        setAlertType('above');
        onClose();
        alert('お気に入りに追加しました！');
      } else {
        console.error('API returned error:', response.data.error);
        alert('追加に失敗しました: ' + (response.data.error || '不明なエラー'));
      }
    } catch (error: any) {
      console.error('Failed to add favorite:', error);
      console.error('Error details:', error.response?.data);
      alert('お気に入りの追加に失敗しました: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>お気に入りに追加</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 2 }}>
          <TextField
            fullWidth
            label="銘柄コード"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            margin="normal"
            placeholder="例: 7203"
          />
          
          <TextField
            fullWidth
            label="メモ"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            margin="normal"
            multiline
            rows={3}
            placeholder="投資理由や注意点など"
          />
          
          <FormControlLabel
            control={
              <Switch
                checked={priceAlertEnabled}
                onChange={(e) => setPriceAlertEnabled(e.target.checked)}
              />
            }
            label="価格アラートを有効にする"
            sx={{ mt: 2 }}
          />
          
          {priceAlertEnabled && (
            <Box sx={{ mt: 2 }}>
              <TextField
                fullWidth
                label="目標価格"
                type="number"
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
                margin="normal"
              />
              
              <FormControl fullWidth margin="normal">
                <InputLabel>アラートタイプ</InputLabel>
                <Select
                  value={alertType}
                  onChange={(e) => setAlertType(e.target.value as 'above' | 'below' | 'change')}
                  label="アラートタイプ"
                >
                  <MenuItem value="above">指定価格以上</MenuItem>
                  <MenuItem value="below">指定価格以下</MenuItem>
                  <MenuItem value="change">価格変動</MenuItem>
                </Select>
              </FormControl>
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>キャンセル</Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          disabled={!symbol.trim() || loading}
        >
          {loading ? <CircularProgress size={20} /> : '追加'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export const Portfolio: React.FC = () => {
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchFavorites();
  }, []);

  const fetchFavorites = async () => {
    try {
      setLoading(true);
      console.log('Fetching favorites...');
      
      // Check if user is authenticated
      const token = localStorage.getItem('token');
      console.log('Token exists:', !!token);
      
      const response = await api.get('/favorites');
      console.log('Favorites response:', response.data);
      
      if (response.data.success) {
        setFavorites(response.data.data.favorites || []);
        setError(null);
        console.log('Favorites loaded successfully:', response.data.data.favorites);
      } else {
        console.error('API returned error:', response.data.error);
        setError(response.data.error || 'お気に入りの取得に失敗しました');
      }
    } catch (error: any) {
      console.error('Failed to fetch favorites:', error);
      console.error('Error status:', error.response?.status);
      console.error('Error data:', error.response?.data);
      
      if (error.response?.status === 401) {
        setError('認証エラー: ログインし直してください');
      } else {
        setError('お気に入りの取得に失敗しました: ' + (error.response?.data?.error || error.message));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddFavorite = (newFavorite: Favorite) => {
    setFavorites(prev => [...prev, newFavorite]);
  };

  const handleRemoveFavorite = async (symbol: string) => {
    if (!window.confirm(`${symbol} をお気に入りから削除しますか？`)) {
      return;
    }

    try {
      console.log('Removing favorite:', symbol);
      const response = await api.delete(`/favorites/${symbol}`);
      console.log('Remove favorite response:', response.data);
      
      if (response.data.success) {
        setFavorites(prev => prev.filter(f => f.symbol !== symbol));
        console.log('Favorite removed successfully');
        alert('お気に入りから削除しました');
      } else {
        console.error('API returned error:', response.data.error);
        setError('削除に失敗しました: ' + (response.data.error || '不明なエラー'));
      }
    } catch (error: any) {
      console.error('Failed to remove favorite:', error);
      console.error('Error details:', error.response?.data);
      setError('お気に入りの削除に失敗しました: ' + (error.response?.data?.error || error.message));
    }
  };

  const formatPrice = (price?: number) => {
    if (price == null) return '-';
    return `¥${price.toLocaleString()}`;
  };

  const formatPriceChange = (change?: number, changePercent?: number) => {
    if (change == null || changePercent == null) return null;
    
    const isPositive = change >= 0;
    const color = isPositive ? 'success.main' : 'error.main';
    const icon = isPositive ? <TrendingUpIcon /> : <TrendingDownIcon />;
    
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', color }}>
        {icon}
        <Typography variant="body2" sx={{ ml: 0.5 }}>
          {isPositive ? '+' : ''}{change.toFixed(2)} ({isPositive ? '+' : ''}{changePercent.toFixed(2)}%)
        </Typography>
      </Box>
    );
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" color="primary">
          ポートフォリオ
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setAddDialogOpen(true)}
        >
          追加
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {favorites.length === 0 ? (
        <Box textAlign="center" py={6}>
          <StarIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            お気に入り銘柄がありません
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            気になる銘柄を追加して、ポートフォリオを管理しましょう
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setAddDialogOpen(true)}
          >
            最初の銘柄を追加
          </Button>
        </Box>
      ) : (
        <Grid container spacing={2}>
          {favorites.map((favorite) => (
            <Grid item xs={12} sm={6} md={4} key={favorite.symbol}>
              <Card>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                    <Box>
                      <Typography variant="h6" component="div">
                        {favorite.symbol}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {favorite.companyName || `${favorite.symbol} (企業名取得中...)`}
                      </Typography>
                      {favorite.marketSegment && (
                        <Chip 
                          label={
                            favorite.marketSegment === 'Prime' ? 'プライム' :
                            favorite.marketSegment === 'Standard' ? 'スタンダード' :
                            favorite.marketSegment === 'Growth' ? 'グロース' :
                            favorite.marketSegment
                          }
                          size="small"
                          color={
                            favorite.marketSegment === 'Prime' ? 'primary' :
                            favorite.marketSegment === 'Standard' ? 'secondary' :
                            favorite.marketSegment === 'Growth' ? 'success' :
                            'default'
                          }
                          variant="outlined"
                          sx={{ mt: 0.5 }}
                        />
                      )}
                    </Box>
                    {favorite.priceAlertEnabled && (
                      <Chip
                        icon={<NotificationsIcon />}
                        label="アラート"
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    )}
                  </Box>

                  <Box mb={2}>
                    <Typography variant="h6">
                      {formatPrice(favorite.currentPrice)}
                    </Typography>
                    {formatPriceChange(favorite.priceChange, favorite.priceChangePercent)}
                  </Box>

                  {favorite.notes && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      {favorite.notes}
                    </Typography>
                  )}

                  {favorite.priceAlertEnabled && (
                    <Box sx={{ mb: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        アラート: {formatPrice(favorite.targetPrice)} {favorite.alertType === 'above' ? '以上' : favorite.alertType === 'below' ? '以下' : '変動時'}
                      </Typography>
                    </Box>
                  )}

                  <Typography variant="caption" color="text.secondary">
                    追加日: {favorite.addedAt ? new Date(favorite.addedAt).toLocaleDateString() : '不明'}
                  </Typography>
                </CardContent>

                <CardActions>
                  <IconButton size="small" color="primary">
                    <EditIcon />
                  </IconButton>
                  <IconButton 
                    size="small" 
                    color="error"
                    onClick={() => handleRemoveFavorite(favorite.symbol)}
                  >
                    <DeleteIcon />
                  </IconButton>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <AddFavoriteDialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        onAdd={handleAddFavorite}
      />
    </Box>
  );
};