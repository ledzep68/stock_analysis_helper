import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  CircularProgress,
  Alert,
  Divider,
  Button
} from '@mui/material';
import { TrendingUp, TrendingDown, Favorite, FavoriteBorder, ShowChart, NotificationAdd } from '@mui/icons-material';
import { Company, FinancialData } from '../types';
import { getCompanyData, api } from '../services/api';
import { RealTimePriceDisplay } from './RealTimePriceDisplay';
import { PriceUpdate } from '../hooks/useWebSocket';

interface FinancialSummaryProps {
  company: Company;
  onPageChange?: (page: string) => void;
}

const FinancialSummary: React.FC<FinancialSummaryProps> = ({ company, onPageChange }) => {
  const [financialData, setFinancialData] = useState<FinancialData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [realTimePrice, setRealTimePrice] = useState<PriceUpdate | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await getCompanyData(company.symbol);
        setFinancialData(data);
      } catch (err: any) {
        console.error('Financial data error:', err);
        if (err.response?.status === 500) {
          setError('外部APIからのデータ取得に失敗しました。データベースからの情報を表示しています。');
          // Try to get data from backend fallback (database)
          setTimeout(async () => {
            try {
              const data = await getCompanyData(company.symbol);
              setFinancialData(data);
              setError(null); // Clear error if fallback succeeds
            } catch (fallbackErr) {
              console.error('Fallback also failed:', fallbackErr);
              setError('データを取得できませんでした。');
            }
          }, 1000);
        } else {
          setError('財務データの取得に失敗しました。');
        }
      } finally {
        setLoading(false);
      }
    };

    const checkFavoriteStatus = async () => {
      try {
        const response = await api.get('/favorites');
        const favorites = response.data?.favorites || response.data || [];
        const isFav = Array.isArray(favorites) && favorites.some((fav: any) => fav.symbol === company.symbol);
        setIsFavorite(isFav);
      } catch (error) {
        console.error('Failed to check favorite status:', error);
      }
    };

    fetchData();
    checkFavoriteStatus();
  }, [company.symbol]);

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatNumber = (value: number): string => {
    return new Intl.NumberFormat('ja-JP').format(value);
  };

  const getInvestmentRecommendation = (data: FinancialData): { recommendation: string; color: 'success' | 'warning' | 'error'; reason: string } => {
    const changePercent = data.changePercent;
    const pe = data.pe;
    
    if (changePercent > 5 && pe > 0 && pe < 15) {
      return { recommendation: 'BUY', color: 'success', reason: '上昇トレンド & 適正PER' };
    } else if (changePercent < -5 || pe > 30) {
      return { recommendation: 'HOLD', color: 'warning', reason: '慎重な検討が必要' };
    } else {
      return { recommendation: 'HOLD', color: 'warning', reason: '中立的な状況' };
    }
  };

  const handleFavoriteToggle = async () => {
    setFavoriteLoading(true);
    try {
      if (isFavorite) {
        // お気に入りから削除
        await api.delete(`/favorites/${company.symbol}`);
        setIsFavorite(false);
        alert('お気に入りから削除しました');
      } else {
        // お気に入りに追加
        await api.post('/favorites', {
          symbol: company.symbol,
          notes: `${company.name}の財務分析から追加`
        });
        setIsFavorite(true);
        alert('お気に入りに追加しました！');
      }
    } catch (error: any) {
      console.error('Favorite toggle error:', error);
      alert('操作に失敗しました: ' + (error.response?.data?.error || error.message));
    } finally {
      setFavoriteLoading(false);
    }
  };

  const handleRealTimePriceUpdate = (symbol: string, update: PriceUpdate) => {
    if (symbol === company.symbol) {
      setRealTimePrice(update);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
      </Alert>
    );
  }

  if (!financialData) {
    return null;
  }

  const recommendation = getInvestmentRecommendation(financialData);
  const isPositiveChange = financialData.change >= 0;

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 2 }}>
      <Card>
        <CardContent>
          <Typography variant="h5" component="h2" sx={{ mb: 2 }}>
            {company.name} ({company.symbol})
          </Typography>

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Typography variant="h4" component="div" sx={{ mr: 1 }}>
                  {realTimePrice ? formatCurrency(realTimePrice.price) : formatCurrency(financialData.price)}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  {(realTimePrice ? realTimePrice.change >= 0 : isPositiveChange) ? 
                    <TrendingUp color="success" /> : <TrendingDown color="error" />}
                  <Typography
                    variant="body1"
                    color={(realTimePrice ? realTimePrice.change >= 0 : isPositiveChange) ? 'success.main' : 'error.main'}
                    sx={{ ml: 0.5 }}
                  >
                    {realTimePrice ? (
                      <>
                        {realTimePrice.change >= 0 ? '+' : ''}{realTimePrice.change.toFixed(2)} 
                        ({realTimePrice.change >= 0 ? '+' : ''}{realTimePrice.changePercent.toFixed(2)}%)
                      </>
                    ) : (
                      <>
                        {isPositiveChange ? '+' : ''}{financialData.change.toFixed(2)} 
                        ({isPositiveChange ? '+' : ''}{financialData.changePercent.toFixed(2)}%)
                      </>
                    )}
                  </Typography>
                </Box>
              </Box>

              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                前日終値: {formatCurrency(financialData.previousClose)}
              </Typography>

              <Chip
                label={`投資判定: ${recommendation.recommendation}`}
                color={recommendation.color}
                sx={{ mb: 1 }}
              />
              <Typography variant="body2" color="text.secondary">
                {recommendation.reason}
              </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                主要指標
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    PER
                  </Typography>
                  <Typography variant="body1">
                    {financialData.pe > 0 ? financialData.pe.toFixed(2) : 'N/A'}
                  </Typography>
                </Grid>
                
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    EPS
                  </Typography>
                  <Typography variant="body1">
                    {financialData.eps > 0 ? formatCurrency(financialData.eps) : 'N/A'}
                  </Typography>
                </Grid>
                
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    配当利回り
                  </Typography>
                  <Typography variant="body1">
                    {financialData.dividendYield > 0 ? 
                      `${(financialData.dividendYield * 100).toFixed(2)}%` : 'N/A'}
                  </Typography>
                </Grid>
                
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    時価総額
                  </Typography>
                  <Typography variant="body1">
                    ¥{formatNumber(financialData.marketCap)}
                  </Typography>
                </Grid>
              </Grid>
            </Grid>
          </Grid>

          <Divider sx={{ my: 3 }} />

          <Grid container spacing={2}>
            <Grid item xs={6} md={3}>
              <Typography variant="body2" color="text.secondary">
                52週高値
              </Typography>
              <Typography variant="body1">
                {formatCurrency(financialData.week52High)}
              </Typography>
            </Grid>
            
            <Grid item xs={6} md={3}>
              <Typography variant="body2" color="text.secondary">
                52週安値
              </Typography>
              <Typography variant="body1">
                {formatCurrency(financialData.week52Low)}
              </Typography>
            </Grid>
            
            <Grid item xs={6} md={3}>
              <Typography variant="body2" color="text.secondary">
                出来高
              </Typography>
              <Typography variant="body1">
                {formatNumber(financialData.volume)}
              </Typography>
            </Grid>
            
            <Grid item xs={6} md={3}>
              <Typography variant="body2" color="text.secondary">
                平均出来高
              </Typography>
              <Typography variant="body1">
                {formatNumber(financialData.avgVolume)}
              </Typography>
            </Grid>
          </Grid>

          <Divider sx={{ my: 3 }} />

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mb: 3 }}>
            <Button
              variant="contained"
              color={isFavorite ? "secondary" : "primary"}
              startIcon={isFavorite ? <Favorite /> : <FavoriteBorder />}
              onClick={handleFavoriteToggle}
              disabled={favoriteLoading}
            >
              {favoriteLoading ? 'loading...' : isFavorite ? 'お気に入り削除' : 'お気に入り追加'}
            </Button>
            
            <Button
              variant="outlined"
              startIcon={<ShowChart />}
              onClick={() => {
                if (onPageChange) {
                  onPageChange('technical');
                }
              }}
            >
              テクニカル分析
            </Button>
            
            <Button
              variant="outlined"
              startIcon={<NotificationAdd />}
              onClick={() => {
                if (onPageChange) {
                  onPageChange('alerts');
                }
              }}
            >
              アラート設定
            </Button>
          </Box>

          <RealTimePriceDisplay 
            symbols={[company.symbol]}
            onPriceUpdate={handleRealTimePriceUpdate}
          />

          <Alert severity="info" sx={{ mt: 3 }}>
            <Typography variant="body2">
              <strong>免責事項:</strong> この情報は投資の参考資料であり、投資助言ではありません。
              最終的な投資判断はご自身の責任でお願いいたします。
            </Typography>
          </Alert>
        </CardContent>
      </Card>
    </Box>
  );
};

export default FinancialSummary;