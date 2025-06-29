import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Grid,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
  Switch,
  FormControlLabel,
  Badge,
  Divider
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  TrendingFlat,
  Wifi,
  WifiOff,
  PlayArrow,
  Pause,
  Refresh
} from '@mui/icons-material';
import { useWebSocket, PriceUpdate } from '../hooks/useWebSocket';

interface RealTimePriceDisplayProps {
  symbols: string[];
  onPriceUpdate?: (symbol: string, update: PriceUpdate) => void;
}

export const RealTimePriceDisplay: React.FC<RealTimePriceDisplayProps> = ({
  symbols,
  onPriceUpdate
}) => {
  const { state, priceUpdates, subscribe, unsubscribe, connect, disconnect } = useWebSocket();
  const [autoConnect, setAutoConnect] = useState(false); // デフォルトは手動接続
  const [subscribedSymbols, setSubscribedSymbols] = useState<Set<string>>(new Set());

  // 自動接続 - 初回マウント時に少し遅延を入れる
  useEffect(() => {
    if (autoConnect && !state.connected && !state.connecting) {
      const timer = setTimeout(() => {
        connect();
      }, 100); // 100msの遅延
      
      return () => clearTimeout(timer);
    }
  }, [autoConnect, state.connected, state.connecting, connect]);

  // シンボル購読管理
  useEffect(() => {
    if (state.connected && symbols.length > 0) {
      // 新しいシンボルを購読
      const newSymbols = symbols.filter(symbol => !subscribedSymbols.has(symbol));
      if (newSymbols.length > 0) {
        subscribe(newSymbols);
        setSubscribedSymbols(prev => new Set([...Array.from(prev), ...newSymbols]));
      }

      // 不要なシンボルの購読解除
      const removeSymbols = Array.from(subscribedSymbols).filter(symbol => !symbols.includes(symbol));
      if (removeSymbols.length > 0) {
        unsubscribe(removeSymbols);
        setSubscribedSymbols(prev => {
          const newSet = new Set(prev);
          removeSymbols.forEach(symbol => newSet.delete(symbol));
          return newSet;
        });
      }
    }
  }, [state.connected, symbols, subscribedSymbols, subscribe, unsubscribe]);

  // 価格更新コールバック
  useEffect(() => {
    if (onPriceUpdate) {
      priceUpdates.forEach((update, symbol) => {
        if (symbols.includes(symbol)) {
          onPriceUpdate(symbol, update);
        }
      });
    }
  }, [priceUpdates, symbols, onPriceUpdate]);

  const handleToggleConnection = () => {
    if (state.connected) {
      disconnect();
      setAutoConnect(false);
    } else {
      connect();
      setAutoConnect(true);
    }
  };

  const getConnectionStatusColor = () => {
    if (state.connected) return 'success';
    if (state.connecting) return 'info';
    if (state.error) return 'error';
    return 'default';
  };

  const getConnectionStatusText = () => {
    if (state.connected) return '接続中';
    if (state.connecting) return '接続中...';
    if (state.error) return 'エラー';
    return '未接続';
  };

  const getPriceChangeIcon = (change: number) => {
    if (change > 0) return <TrendingUp color="success" />;
    if (change < 0) return <TrendingDown color="error" />;
    return <TrendingFlat color="action" />;
  };

  const getPriceChangeColor = (change: number) => {
    if (change > 0) return 'success';
    if (change < 0) return 'error';
    return 'default';
  };

  const formatPrice = (price: number) => {
    return `¥${price.toLocaleString()}`;
  };

  const formatChange = (change: number, changePercent: number) => {
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(2)} (${sign}${changePercent.toFixed(2)}%)`;
  };

  const formatTimestamp = (timestamp: Date) => {
    return timestamp.toLocaleTimeString('ja-JP');
  };

  if (symbols.length === 0) {
    return (
      <Card>
        <CardContent>
          <Typography variant="body1" color="text.secondary" textAlign="center">
            価格を監視する銘柄を選択してください
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        {/* ヘッダー部分 */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6" component="h3">
            リアルタイム価格
          </Typography>
          
          <Box display="flex" alignItems="center" gap={1}>
            <Badge 
              badgeContent={priceUpdates.size} 
              color="primary"
              anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
            >
              <Chip
                icon={state.connected ? <Wifi /> : <WifiOff />}
                label={getConnectionStatusText()}
                color={getConnectionStatusColor() as any}
                size="small"
              />
            </Badge>
            
            <Tooltip title={state.connected ? "接続を切断" : "接続を開始"}>
              <span>
                <IconButton 
                  onClick={handleToggleConnection}
                  size="small"
                  disabled={state.connecting}
                >
                  {state.connecting ? (
                    <CircularProgress size={20} />
                  ) : state.connected ? (
                    <Pause />
                  ) : (
                    <PlayArrow />
                  )}
                </IconButton>
              </span>
            </Tooltip>
          </Box>
        </Box>

        {/* 自動接続設定 */}
        <Box mb={2}>
          <FormControlLabel
            control={
              <Switch
                checked={autoConnect}
                onChange={(e) => setAutoConnect(e.target.checked)}
                size="small"
              />
            }
            label="自動接続"
          />
        </Box>

        <Divider sx={{ mb: 2 }} />

        {/* エラー表示 */}
        {state.error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {state.error}
          </Alert>
        )}

        {/* 接続中表示 */}
        {state.connecting && (
          <Box display="flex" justifyContent="center" alignItems="center" py={2}>
            <CircularProgress size={24} sx={{ mr: 1 }} />
            <Typography>WebSocketに接続中...</Typography>
          </Box>
        )}

        {/* 価格一覧 */}
        <Grid container spacing={2}>
          {symbols.map(symbol => {
            const update = priceUpdates.get(symbol);
            
            return (
              <Grid item xs={12} sm={6} md={4} key={symbol}>
                <Card variant="outlined">
                  <CardContent sx={{ p: 2 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                      <Typography variant="subtitle1" fontWeight="bold">
                        {symbol}
                      </Typography>
                      <Chip
                        size="small"
                        label={update?.source === 'live' ? 'LIVE' : 'MOCK'}
                        color={update?.source === 'live' ? 'success' : 'default'}
                        variant="outlined"
                      />
                    </Box>

                    {update ? (
                      <>
                        <Typography variant="h6" fontWeight="bold" color="primary">
                          {formatPrice(update.price)}
                        </Typography>
                        
                        <Box display="flex" alignItems="center" gap={0.5} mb={1}>
                          {getPriceChangeIcon(update.change)}
                          <Typography 
                            variant="body2" 
                            color={getPriceChangeColor(update.change) + '.main'}
                          >
                            {formatChange(update.change, update.changePercent)}
                          </Typography>
                        </Box>

                        <Typography variant="caption" color="text.secondary">
                          出来高: {update.volume.toLocaleString()}
                        </Typography>
                        <br />
                        <Typography variant="caption" color="text.secondary">
                          更新: {formatTimestamp(update.timestamp)}
                        </Typography>
                      </>
                    ) : (
                      <Box display="flex" justifyContent="center" py={2}>
                        <Typography variant="body2" color="text.secondary">
                          データ待機中...
                        </Typography>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>

        {/* フッター情報 */}
        {state.lastUpdate && (
          <Box mt={2} pt={2} borderTop={1} borderColor="divider">
            <Typography variant="caption" color="text.secondary">
              最終更新: {formatTimestamp(state.lastUpdate)} 
              • 接続クライアント数: {subscribedSymbols.size}
              • 更新間隔: 5秒
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};