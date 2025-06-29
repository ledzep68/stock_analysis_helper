import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
  Chip,
  CircularProgress,
  Alert,
  FormControlLabel,
  Checkbox,
  Grid,
  Tooltip,
  IconButton,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  ResponsiveContainer,
  ComposedChart,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  Bar,
  Area,
  AreaChart
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  ShowChart,
  BarChart,
  Timeline,
  Refresh
} from '@mui/icons-material';
import { api } from '../services/api';
import { useSwipeGestures } from '../hooks/useSwipeGestures';
import { usePinchZoom } from '../hooks/usePinchZoom';

interface ChartDataPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  sma20?: number;
  sma50?: number;
  ema12?: number;
  ema26?: number;
  bollingerUpper?: number;
  bollingerLower?: number;
  rsi?: number;
}

interface InteractiveChartProps {
  symbol: string;
}

type TimePeriod = '1D' | '1W' | '1M' | '3M' | '6M' | '1Y' | '2Y' | '5Y';
type ChartType = 'candlestick' | 'line' | 'area';

interface TechnicalIndicators {
  sma20: boolean;
  sma50: boolean;
  ema12: boolean;
  ema26: boolean;
  bollingerBands: boolean;
  volume: boolean;
  rsi: boolean;
}

export const InteractiveChart: React.FC<InteractiveChartProps> = ({ symbol }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<TimePeriod>('1M');
  const [chartType, setChartType] = useState<ChartType>('candlestick');
  const [indicators, setIndicators] = useState<TechnicalIndicators>({
    sma20: true,
    sma50: true,
    ema12: false,
    ema26: false,
    bollingerBands: false,
    volume: true,
    rsi: false
  });

  // タッチジェスチャー対応
  const periods: TimePeriod[] = ['1D', '1W', '1M', '3M', '6M', '1Y', '2Y', '5Y'];
  const currentPeriodIndex = periods.indexOf(period);

  const swipeRef = useSwipeGestures<HTMLDivElement>({
    onSwipeLeft: () => {
      if (currentPeriodIndex < periods.length - 1) {
        setPeriod(periods[currentPeriodIndex + 1]);
      }
    },
    onSwipeRight: () => {
      if (currentPeriodIndex > 0) {
        setPeriod(periods[currentPeriodIndex - 1]);
      }
    },
    minSwipeDistance: 80
  });

  const { elementRef: zoomRef, zoom, resetZoom } = usePinchZoom<HTMLDivElement>({
    minZoom: 0.8,
    maxZoom: 3,
    enablePan: true
  });

  useEffect(() => {
    fetchChartData();
  }, [symbol, period]);

  const fetchChartData = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log(`📊 Fetching chart data for symbol: ${symbol}, period: ${period}`);
      
      const [priceResponse, technicalResponse] = await Promise.all([
        api.get(`/chart-data/${symbol}/price-history`, { params: { period } }),
        api.get(`/chart-data/${symbol}/technical-overlay`, { params: { period } })
      ]);

      const priceData = priceResponse.data.data.data;
      const technicalData = technicalResponse.data.data.data;

      // データをマージ
      const mergedData = priceData.map((price: any, index: number) => ({
        ...price,
        ...technicalData[index]
      }));

      console.log('✅ Chart data merged successfully:', mergedData.length, 'data points');
      setChartData(mergedData);
    } catch (err: any) {
      console.error('❌ Chart data error:', err);
      
      let errorMessage = 'チャートデータの取得に失敗しました';
      
      if (err.response?.status === 401) {
        errorMessage = '認証が必要です。再度ログインしてください。';
      } else if (err.response?.status === 403) {
        errorMessage = 'アクセス権限がありません。ログインし直してください。';
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handlePeriodChange = (event: React.MouseEvent<HTMLElement>, newPeriod: TimePeriod | null) => {
    if (newPeriod !== null) {
      setPeriod(newPeriod);
    }
  };

  const handleChartTypeChange = (event: React.MouseEvent<HTMLElement>, newType: ChartType | null) => {
    if (newType !== null) {
      setChartType(newType);
    }
  };

  const handleIndicatorChange = (indicator: keyof TechnicalIndicators) => {
    setIndicators(prev => ({
      ...prev,
      [indicator]: !prev[indicator]
    }));
  };

  const formatYAxisTick = (value: number) => {
    return `¥${value.toLocaleString()}`;
  };

  const formatTooltip = (value: any, name: string) => {
    if (name === 'volume') {
      return [value.toLocaleString(), '出来高'];
    }
    return [`¥${value.toLocaleString()}`, name];
  };

  const getLatestPrice = () => {
    if (chartData.length === 0) return null;
    const latest = chartData[chartData.length - 1];
    const previous = chartData[chartData.length - 2];
    
    if (!previous) return { price: latest.close, change: 0, changePercent: 0 };
    
    const change = latest.close - previous.close;
    const changePercent = (change / previous.close) * 100;
    
    return { price: latest.close, change, changePercent };
  };

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
            <CircularProgress />
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (error || chartData.length === 0) {
    return (
      <Card>
        <CardContent>
          <Alert severity="error">
            {error || 'チャートデータがありません'}
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const latestPrice = getLatestPrice();

  return (
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Box>
            <Typography variant="h6" component="h3">
              {symbol} 価格チャート
            </Typography>
            {latestPrice && (
              <Box display="flex" alignItems="center" gap={1} mt={1}>
                <Typography variant="h5">
                  ¥{latestPrice.price.toLocaleString()}
                </Typography>
                <Chip
                  icon={latestPrice.change >= 0 ? <TrendingUp /> : <TrendingDown />}
                  label={`${latestPrice.change >= 0 ? '+' : ''}${latestPrice.change.toFixed(2)} (${latestPrice.changePercent >= 0 ? '+' : ''}${latestPrice.changePercent.toFixed(2)}%)`}
                  color={latestPrice.change >= 0 ? 'success' : 'error'}
                  size="small"
                />
              </Box>
            )}
          </Box>
          <Tooltip title="更新">
            <IconButton onClick={fetchChartData}>
              <Refresh />
            </IconButton>
          </Tooltip>
        </Box>

        <Box display="flex" gap={isMobile ? 1 : 2} mb={3} flexWrap="wrap">
          <ToggleButtonGroup
            value={period}
            exclusive
            onChange={handlePeriodChange}
            size={isMobile ? "small" : "medium"}
            sx={{
              flexWrap: isMobile ? 'wrap' : 'nowrap',
              '& .MuiToggleButton-root': {
                minWidth: isMobile ? '40px' : 'auto',
                px: isMobile ? 1 : 2,
                fontSize: isMobile ? '0.75rem' : '0.875rem'
              }
            }}
          >
            <ToggleButton value="1D">1日</ToggleButton>
            <ToggleButton value="1W">1週</ToggleButton>
            <ToggleButton value="1M">1月</ToggleButton>
            <ToggleButton value="3M">3月</ToggleButton>
            <ToggleButton value="6M">6月</ToggleButton>
            <ToggleButton value="1Y">1年</ToggleButton>
            <ToggleButton value="2Y">2年</ToggleButton>
            <ToggleButton value="5Y">5年</ToggleButton>
          </ToggleButtonGroup>

          <ToggleButtonGroup
            value={chartType}
            exclusive
            onChange={handleChartTypeChange}
            size={isMobile ? "small" : "medium"}
          >
            <ToggleButton value="candlestick">
              <BarChart fontSize={isMobile ? "small" : "medium"} />
            </ToggleButton>
            <ToggleButton value="line">
              <ShowChart fontSize={isMobile ? "small" : "medium"} />
            </ToggleButton>
            <ToggleButton value="area">
              <Timeline fontSize={isMobile ? "small" : "medium"} />
            </ToggleButton>
          </ToggleButtonGroup>

          {zoom !== 1 && (
            <Tooltip title="ズームリセット">
              <IconButton onClick={resetZoom} size="small">
                <Refresh />
              </IconButton>
            </Tooltip>
          )}
        </Box>

        <Box mb={3}>
          <Typography variant="subtitle2" gutterBottom>
            テクニカル指標
          </Typography>
          <Grid container spacing={isMobile ? 0.5 : 1}>
            <Grid item xs={6} sm={4} md={2}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={indicators.sma20}
                    onChange={() => handleIndicatorChange('sma20')}
                    size="small"
                  />
                }
                label="SMA20"
                sx={{
                  '& .MuiFormControlLabel-label': {
                    fontSize: isMobile ? '0.75rem' : '0.875rem'
                  }
                }}
              />
            </Grid>
            <Grid item xs={6} sm={4} md={2}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={indicators.sma50}
                    onChange={() => handleIndicatorChange('sma50')}
                    size="small"
                  />
                }
                label="SMA50"
                sx={{
                  '& .MuiFormControlLabel-label': {
                    fontSize: isMobile ? '0.75rem' : '0.875rem'
                  }
                }}
              />
            </Grid>
            <Grid item xs={6} sm={4} md={2}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={indicators.ema12}
                    onChange={() => handleIndicatorChange('ema12')}
                    size="small"
                  />
                }
                label="EMA12"
                sx={{
                  '& .MuiFormControlLabel-label': {
                    fontSize: isMobile ? '0.75rem' : '0.875rem'
                  }
                }}
              />
            </Grid>
            <Grid item xs={6} sm={4} md={2}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={indicators.ema26}
                    onChange={() => handleIndicatorChange('ema26')}
                    size="small"
                  />
                }
                label="EMA26"
                sx={{
                  '& .MuiFormControlLabel-label': {
                    fontSize: isMobile ? '0.75rem' : '0.875rem'
                  }
                }}
              />
            </Grid>
            <Grid item xs={6} sm={4} md={2}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={indicators.bollingerBands}
                    onChange={() => handleIndicatorChange('bollingerBands')}
                    size="small"
                  />
                }
                label={isMobile ? "ボリンジャー" : "ボリンジャーバンド"}
                sx={{
                  '& .MuiFormControlLabel-label': {
                    fontSize: isMobile ? '0.75rem' : '0.875rem'
                  }
                }}
              />
            </Grid>
            <Grid item xs={6} sm={4} md={2}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={indicators.volume}
                    onChange={() => handleIndicatorChange('volume')}
                    size="small"
                  />
                }
                label="出来高"
                sx={{
                  '& .MuiFormControlLabel-label': {
                    fontSize: isMobile ? '0.75rem' : '0.875rem'
                  }
                }}
              />
            </Grid>
          </Grid>
        </Box>

        <Box 
          ref={swipeRef}
          height={isMobile ? 300 : 500}
          sx={{ 
            position: 'relative',
            touchAction: 'manipulation',
            userSelect: 'none'
          }}
        >
          <div 
            ref={zoomRef}
            style={{ 
              width: '100%', 
              height: '100%',
              transformOrigin: 'center center'
            }}
          >
            <ResponsiveContainer width="100%" height="100%">
            {chartType === 'area' ? (
              <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => new Date(value).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  tickFormatter={formatYAxisTick}
                />
                <RechartsTooltip 
                  formatter={formatTooltip}
                  labelFormatter={(value) => new Date(value).toLocaleDateString('ja-JP')}
                  contentStyle={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid #ccc',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="close"
                  stroke="#2196F3"
                  fill="#E3F2FD"
                  name="終値"
                />
                {/* テクニカル指標 */}
                {indicators.sma20 && (
                  <Line
                    type="monotone"
                    dataKey="sma20"
                    stroke="#FF9800"
                    strokeWidth={1.5}
                    dot={false}
                    name="SMA20"
                  />
                )}
                {indicators.sma50 && (
                  <Line
                    type="monotone"
                    dataKey="sma50"
                    stroke="#9C27B0"
                    strokeWidth={1.5}
                    dot={false}
                    name="SMA50"
                  />
                )}
              </AreaChart>
            ) : (
              <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => new Date(value).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}
                />
                <YAxis 
                  yAxisId="price"
                  orientation="right"
                  tick={{ fontSize: 12 }}
                  tickFormatter={formatYAxisTick}
                />
                {indicators.volume && (
                  <YAxis 
                    yAxisId="volume"
                    orientation="left"
                    tick={{ fontSize: 12 }}
                  />
                )}
                <RechartsTooltip 
                  formatter={formatTooltip}
                  labelFormatter={(value) => new Date(value).toLocaleDateString('ja-JP')}
                  contentStyle={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid #ccc',
                    borderRadius: '8px'
                  }}
                />
                <Legend />

                {/* 価格データ */}
                {(chartType === 'line' || chartType === 'candlestick') && (
                  <Line
                    yAxisId="price"
                    type="monotone"
                    dataKey="close"
                    stroke="#2196F3"
                    strokeWidth={2}
                    dot={false}
                    name="終値"
                  />
                )}

                {/* 移動平均線 */}
                {indicators.sma20 && (
                  <Line
                    yAxisId="price"
                    type="monotone"
                    dataKey="sma20"
                    stroke="#FF9800"
                    strokeWidth={1.5}
                    dot={false}
                    name="SMA20"
                    connectNulls={false}
                  />
                )}
                {indicators.sma50 && (
                  <Line
                    yAxisId="price"
                    type="monotone"
                    dataKey="sma50"
                    stroke="#9C27B0"
                    strokeWidth={1.5}
                    dot={false}
                    name="SMA50"
                    connectNulls={false}
                  />
                )}
                {indicators.ema12 && (
                  <Line
                    yAxisId="price"
                    type="monotone"
                    dataKey="ema12"
                    stroke="#4CAF50"
                    strokeWidth={1.5}
                    dot={false}
                    name="EMA12"
                    connectNulls={false}
                  />
                )}
                {indicators.ema26 && (
                  <Line
                    yAxisId="price"
                    type="monotone"
                    dataKey="ema26"
                    stroke="#F44336"
                    strokeWidth={1.5}
                    dot={false}
                    name="EMA26"
                    connectNulls={false}
                  />
                )}

                {/* ボリンジャーバンド */}
                {indicators.bollingerBands && (
                  <>
                    <Line
                      yAxisId="price"
                      type="monotone"
                      dataKey="bollingerUpper"
                      stroke="#E0E0E0"
                      strokeWidth={1}
                      dot={false}
                      name="ボリンジャー上限"
                      connectNulls={false}
                    />
                    <Line
                      yAxisId="price"
                      type="monotone"
                      dataKey="bollingerLower"
                      stroke="#E0E0E0"
                      strokeWidth={1}
                      dot={false}
                      name="ボリンジャー下限"
                      connectNulls={false}
                    />
                  </>
                )}

                {/* 出来高 */}
                {indicators.volume && (
                  <Bar
                    yAxisId="volume"
                    dataKey="volume"
                    fill="#E3F2FD"
                    opacity={0.6}
                    name="出来高"
                  />
                )}
              </ComposedChart>
            )}
            </ResponsiveContainer>
          </div>
        </Box>

        <Box mt={2} pt={2} borderTop={1} borderColor="divider">
          <Typography variant="caption" color="text.secondary">
            {isMobile ? (
              <>
                • スワイプで期間切り替え、ピンチでズーム
                <br />
                • データは模擬データです
              </>
            ) : (
              <>
                • チャートをドラッグして移動、スクロールでズーム可能
                <br />
                • 凡例をクリックして表示/非表示を切り替え
                <br />
                • データは模擬データです（実際の取引には使用しないでください）
              </>
            )}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};