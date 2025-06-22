import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  LinearProgress,
  Tabs,
  Tab,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  Tooltip,
  IconButton
} from '@mui/material';
import Grid2 from '@mui/material/Grid2';
import {
  TrendingUp,
  TrendingDown,
  TrendingFlat,
  Info,
  ShowChart,
  Timeline,
  Assessment,
  Speed
} from '@mui/icons-material';
import { api } from '../services/api';

interface TechnicalIndicators {
  sma: { [key: string]: number };
  ema: { [key: string]: number };
  rsi: number;
  macd: {
    macdLine: number;
    signalLine: number;
    histogram: number;
  };
  bollingerBands: {
    upper: number;
    middle: number;
    lower: number;
  };
  stochastic: {
    k: number;
    d: number;
  };
  atr: number;
  adx: number;
  volume: {
    average: number;
    ratio: number;
  };
}

interface TechnicalSignals {
  trend: 'bullish' | 'bearish' | 'neutral';
  strength: number;
  recommendations: string[];
}

interface TechnicalAnalysisData {
  symbol: string;
  indicators: TechnicalIndicators;
  signals: TechnicalSignals;
  timestamp: string;
}

interface TechnicalAnalysisProps {
  symbol: string;
}

export const TechnicalAnalysis: React.FC<TechnicalAnalysisProps> = ({ symbol }) => {
  const [data, setData] = useState<TechnicalAnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);

  useEffect(() => {
    fetchTechnicalAnalysis();
  }, [symbol]);

  const fetchTechnicalAnalysis = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/technical/${symbol}/indicators`);
      setData(response.data.data);
    } catch (err) {
      setError('テクニカル分析データの取得に失敗しました');
      console.error('Technical analysis error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'bullish':
        return <TrendingUp color="success" />;
      case 'bearish':
        return <TrendingDown color="error" />;
      default:
        return <TrendingFlat color="action" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'bullish':
        return 'success';
      case 'bearish':
        return 'error';
      default:
        return 'default';
    }
  };

  const getRSIStatus = (rsi: number) => {
    if (rsi > 70) return { label: '買われ過ぎ', color: 'error' };
    if (rsi < 30) return { label: '売られ過ぎ', color: 'success' };
    return { label: '中立', color: 'default' };
  };

  const getMACDSignal = (histogram: number) => {
    return histogram > 0 
      ? { label: '買いシグナル', color: 'success' }
      : { label: '売りシグナル', color: 'error' };
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !data) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        {error || 'データの取得に失敗しました'}
      </Alert>
    );
  }

  return (
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h5" component="h2">
            テクニカル分析
          </Typography>
          <Box display="flex" alignItems="center" gap={2}>
            {getTrendIcon(data.signals.trend)}
            <Chip 
              label={`${data.signals.trend.toUpperCase()} - 強度: ${data.signals.strength.toFixed(0)}%`}
              color={getTrendColor(data.signals.trend) as any}
              size="medium"
            />
          </Box>
        </Box>

        <Tabs value={tabValue} onChange={(_, value) => setTabValue(value)} sx={{ mb: 3 }}>
          <Tab icon={<ShowChart />} label="移動平均" />
          <Tab icon={<Timeline />} label="モメンタム" />
          <Tab icon={<Assessment />} label="ボラティリティ" />
          <Tab icon={<Speed />} label="シグナル" />
        </Tabs>

        {tabValue === 0 && (
          <Grid2 container spacing={3}>
            <Grid2 size={{ xs: 12, md: 6 }}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="subtitle1" gutterBottom>
                  単純移動平均（SMA）
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableBody>
                      {Object.entries(data.indicators.sma).map(([period, value]) => (
                        <TableRow key={period}>
                          <TableCell>{period}日</TableCell>
                          <TableCell align="right">¥{value.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Grid2>
            <Grid2 size={{ xs: 12, md: 6 }}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="subtitle1" gutterBottom>
                  指数移動平均（EMA）
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableBody>
                      {Object.entries(data.indicators.ema).map(([period, value]) => (
                        <TableRow key={period}>
                          <TableCell>{period}日</TableCell>
                          <TableCell align="right">¥{value.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Grid2>
          </Grid2>
        )}

        {tabValue === 1 && (
          <Grid2 container spacing={3}>
            <Grid2 size={{ xs: 12, md: 6 }}>
              <Paper sx={{ p: 2 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="subtitle1">RSI（相対力指数）</Typography>
                  <Chip 
                    label={getRSIStatus(data.indicators.rsi).label}
                    color={getRSIStatus(data.indicators.rsi).color as any}
                    size="small"
                  />
                </Box>
                <Box display="flex" alignItems="center">
                  <Box flexGrow={1} mr={2}>
                    <LinearProgress 
                      variant="determinate" 
                      value={data.indicators.rsi} 
                      sx={{ height: 10, borderRadius: 1 }}
                    />
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    {data.indicators.rsi.toFixed(2)}
                  </Typography>
                </Box>
              </Paper>
            </Grid2>
            <Grid2 size={{ xs: 12, md: 6 }}>
              <Paper sx={{ p: 2 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="subtitle1">MACD</Typography>
                  <Chip 
                    label={getMACDSignal(data.indicators.macd.histogram).label}
                    color={getMACDSignal(data.indicators.macd.histogram).color as any}
                    size="small"
                  />
                </Box>
                <TableContainer>
                  <Table size="small">
                    <TableBody>
                      <TableRow>
                        <TableCell>MACDライン</TableCell>
                        <TableCell align="right">{data.indicators.macd.macdLine.toFixed(2)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>シグナルライン</TableCell>
                        <TableCell align="right">{data.indicators.macd.signalLine.toFixed(2)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>ヒストグラム</TableCell>
                        <TableCell align="right">{data.indicators.macd.histogram.toFixed(2)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Grid2>
            <Grid2 size={{ xs: 12, md: 6 }}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="subtitle1" gutterBottom>
                  ストキャスティクス
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableBody>
                      <TableRow>
                        <TableCell>%K</TableCell>
                        <TableCell align="right">{data.indicators.stochastic.k.toFixed(2)}%</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>%D</TableCell>
                        <TableCell align="right">{data.indicators.stochastic.d.toFixed(2)}%</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Grid2>
          </Grid2>
        )}

        {tabValue === 2 && (
          <Grid2 container spacing={3}>
            <Grid2 size={{ xs: 12, md: 6 }}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="subtitle1" gutterBottom>
                  ボリンジャーバンド
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableBody>
                      <TableRow>
                        <TableCell>上限バンド</TableCell>
                        <TableCell align="right">¥{data.indicators.bollingerBands.upper.toFixed(2)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>中央線（SMA）</TableCell>
                        <TableCell align="right">¥{data.indicators.bollingerBands.middle.toFixed(2)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>下限バンド</TableCell>
                        <TableCell align="right">¥{data.indicators.bollingerBands.lower.toFixed(2)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Grid2>
            <Grid2 size={{ xs: 12, md: 6 }}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="subtitle1" gutterBottom>
                  その他指標
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableBody>
                      <TableRow>
                        <TableCell>ATR（真の値幅）</TableCell>
                        <TableCell align="right">{data.indicators.atr.toFixed(2)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>ADX（方向性指数）</TableCell>
                        <TableCell align="right">{data.indicators.adx.toFixed(2)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>出来高比率</TableCell>
                        <TableCell align="right">{data.indicators.volume.ratio.toFixed(2)}x</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Grid2>
          </Grid2>
        )}

        {tabValue === 3 && (
          <Box>
            <Typography variant="subtitle1" gutterBottom>
              分析シグナル
            </Typography>
            <Grid2 container spacing={2}>
              {data.signals.recommendations.map((recommendation, index) => (
                <Grid2 size={12} key={index}>
                  <Alert 
                    severity={data.signals.trend === 'bullish' ? 'success' : 
                             data.signals.trend === 'bearish' ? 'error' : 'info'}
                    icon={<Info />}
                  >
                    {recommendation}
                  </Alert>
                </Grid2>
              ))}
            </Grid2>
          </Box>
        )}

        <Box mt={3} pt={2} borderTop={1} borderColor="divider">
          <Typography variant="caption" color="text.secondary">
            最終更新: {new Date(data.timestamp).toLocaleString('ja-JP')}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};