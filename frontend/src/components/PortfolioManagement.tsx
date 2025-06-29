import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Tabs,
  Tab,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete
} from '@mui/material';
import {
  Add as AddIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  AccountBalance as AccountBalanceIcon,
  Assessment as AssessmentIcon,
  Security as SecurityIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ShowChart as ShowChartIcon
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import api from '../services/api';
import PortfolioOptimization from './PortfolioOptimization';

interface Portfolio {
  id: string;
  name: string;
  description?: string;
  initialCapital: number;
  currency: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface PortfolioSummary {
  portfolio: Portfolio;
  totalValue: number;
  totalCost: number;
  unrealizedPnL: number;
  realizedPnL: number;
  totalReturn: number;
  totalReturnPercent: number;
  holdingsCount: number;
  topHoldings: Array<{
    symbol: string;
    companyName?: string;
    quantity: number;
    currentValue: number;
    allocation: number;
  }>;
}

interface PortfolioHolding {
  id: string;
  portfolioId: string;
  symbol: string;
  companyName?: string;
  quantity: number;
  averageCost: number;
  purchaseDate: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface CompanySearchResult {
  symbol: string;
  name: string;
}

interface PerformanceData {
  date: string;
  totalValue: number;
  cumulativeReturn: number;
}

interface RiskAnalysis {
  overall: {
    var95: number;
    var99: number;
    concentrationRisk: number;
    liquidityRisk: number;
    sectorAllocation: { [sector: string]: number };
  };
  breakdown: {
    systematicRisk: number;
    unsystematicRisk: number;
    concentrationRisk: number;
    liquidityRisk: number;
  };
  recommendations: string[];
}

const PortfolioManagement: React.FC = () => {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [selectedPortfolio, setSelectedPortfolio] = useState<Portfolio | null>(null);
  const [portfolioSummary, setPortfolioSummary] = useState<PortfolioSummary | null>(null);
  const [portfolioHoldings, setPortfolioHoldings] = useState<PortfolioHolding[]>([]);
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>([]);
  const [riskAnalysis, setRiskAnalysis] = useState<RiskAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);

  // ダイアログ状態
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [transactionDialogOpen, setTransactionDialogOpen] = useState(false);
  const [editHoldingDialogOpen, setEditHoldingDialogOpen] = useState(false);
  const [deleteHoldingDialogOpen, setDeleteHoldingDialogOpen] = useState(false);
  const [selectedHolding, setSelectedHolding] = useState<PortfolioHolding | null>(null);
  const [newPortfolio, setNewPortfolio] = useState({
    name: '',
    description: '',
    initialCapital: 1000000,
    currency: 'JPY'
  });
  const [newTransaction, setNewTransaction] = useState({
    symbol: '',
    transactionType: 'BUY',
    quantity: 0,
    price: 0,
    fees: 0,
    notes: ''
  });

  // 企業検索状態
  const [companySearchResults, setCompanySearchResults] = useState<CompanySearchResult[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<CompanySearchResult | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);

  // 編集用状態
  const [editHoldingData, setEditHoldingData] = useState({
    quantity: 0,
    averageCost: 0,
    notes: ''
  });

  useEffect(() => {
    loadPortfolios();
  }, []);

  useEffect(() => {
    if (selectedPortfolio) {
      loadPortfolioDetails(selectedPortfolio.id);
    }
  }, [selectedPortfolio]);

  const loadPortfolios = async () => {
    try {
      setLoading(true);
      const response = await api.get('/portfolio');
      if (response.data.success) {
        setPortfolios(response.data.data.portfolios);
        if (response.data.data.portfolios.length > 0 && !selectedPortfolio) {
          setSelectedPortfolio(response.data.data.portfolios[0]);
        }
      }
    } catch (error) {
      console.error('Failed to load portfolios:', error);
      setError('ポートフォリオの読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const loadPortfolioDetails = async (portfolioId: string) => {
    try {
      const [summaryRes, holdingsRes, performanceRes, riskRes] = await Promise.all([
        api.get(`/portfolio/${portfolioId}/summary`),
        api.get(`/portfolio/${portfolioId}/holdings`),
        api.get(`/portfolio/${portfolioId}/performance?days=30`),
        api.get(`/portfolio/${portfolioId}/risk`)
      ]);

      if (summaryRes.data.success) {
        setPortfolioSummary(summaryRes.data.data.summary);
      }

      if (holdingsRes.data.success) {
        setPortfolioHoldings(holdingsRes.data.data.holdings);
      }

      if (performanceRes.data.success) {
        setPerformanceData(performanceRes.data.data.history.reverse());
      }

      if (riskRes.data.success) {
        setRiskAnalysis(riskRes.data.data.riskAnalysis);
      }
    } catch (error) {
      console.error('Failed to load portfolio details:', error);
      setError('ポートフォリオ詳細の読み込みに失敗しました');
    }
  };

  const createPortfolio = async () => {
    try {
      const response = await api.post('/portfolio', newPortfolio);
      if (response.data.success) {
        await loadPortfolios();
        setCreateDialogOpen(false);
        setNewPortfolio({ name: '', description: '', initialCapital: 1000000, currency: 'JPY' });
      }
    } catch (error) {
      console.error('Failed to create portfolio:', error);
      setError('ポートフォリオの作成に失敗しました');
    }
  };

  const searchCompanies = async (query: string) => {
    if (!query || query.trim().length < 1) {
      setCompanySearchResults([]);
      return;
    }

    try {
      setSearchLoading(true);
      const response = await api.get(`/portfolio/search?q=${encodeURIComponent(query.trim())}`);
      if (response.data.success) {
        setCompanySearchResults(response.data.data.companies);
      }
    } catch (error) {
      console.error('Failed to search companies:', error);
      setCompanySearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const addTransaction = async () => {
    if (!selectedPortfolio) return;

    try {
      const response = await api.post(`/portfolio/${selectedPortfolio.id}/transactions`, newTransaction);
      if (response.data.success) {
        await loadPortfolioDetails(selectedPortfolio.id);
        setTransactionDialogOpen(false);
        setNewTransaction({
          symbol: '',
          transactionType: 'BUY',
          quantity: 0,
          price: 0,
          fees: 0,
          notes: ''
        });
        setSelectedCompany(null);
        setCompanySearchResults([]);
      }
    } catch (error) {
      console.error('Failed to add transaction:', error);
      setError('取引の追加に失敗しました');
    }
  };

  const deleteHolding = async () => {
    if (!selectedPortfolio || !selectedHolding) return;

    try {
      const response = await api.delete(`/portfolio/${selectedPortfolio.id}/stocks/${selectedHolding.symbol}`);
      if (response.data.success) {
        await loadPortfolioDetails(selectedPortfolio.id);
        setDeleteHoldingDialogOpen(false);
        setSelectedHolding(null);
      }
    } catch (error) {
      console.error('Failed to delete holding:', error);
      setError('銘柄の削除に失敗しました');
    }
  };

  const updateHolding = async () => {
    if (!selectedPortfolio || !selectedHolding) return;

    try {
      const response = await api.put(`/portfolio/${selectedPortfolio.id}/stocks/${selectedHolding.symbol}`, editHoldingData);
      if (response.data.success) {
        await loadPortfolioDetails(selectedPortfolio.id);
        setEditHoldingDialogOpen(false);
        setSelectedHolding(null);
        setEditHoldingData({
          quantity: 0,
          averageCost: 0,
          notes: ''
        });
      }
    } catch (error) {
      console.error('Failed to update holding:', error);
      setError('銘柄の更新に失敗しました');
    }
  };

  const openEditDialog = (holding: PortfolioHolding) => {
    setSelectedHolding(holding);
    setEditHoldingData({
      quantity: holding.quantity,
      averageCost: holding.averageCost,
      notes: holding.notes || ''
    });
    setEditHoldingDialogOpen(true);
  };

  const openDeleteDialog = (holding: PortfolioHolding) => {
    setSelectedHolding(holding);
    setDeleteHoldingDialogOpen(true);
  };

  const formatCurrency = (amount: number, currency: string = 'JPY') => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  const getPieChartData = () => {
    if (!portfolioSummary) return [];
    return portfolioSummary.topHoldings.map(holding => ({
      name: holding.companyName || holding.symbol,
      symbol: holding.symbol,
      value: holding.allocation,
      amount: holding.currentValue
    }));
  };

  const getSectorData = () => {
    if (!riskAnalysis) return [];
    return Object.entries(riskAnalysis.overall.sectorAllocation).map(([sector, allocation]) => ({
      name: sector,
      value: allocation
    }));
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* ヘッダー */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          ポートフォリオ管理
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateDialogOpen(true)}
        >
          ポートフォリオ作成
        </Button>
      </Box>

      {/* ポートフォリオ選択 */}
      {portfolios.length > 0 && (
        <FormControl fullWidth sx={{ mb: 3 }}>
          <InputLabel>ポートフォリオ選択</InputLabel>
          <Select
            value={selectedPortfolio?.id || ''}
            onChange={(e) => {
              const portfolio = portfolios.find(p => p.id === e.target.value);
              setSelectedPortfolio(portfolio || null);
            }}
          >
            {portfolios.map(portfolio => (
              <MenuItem key={portfolio.id} value={portfolio.id}>
                {portfolio.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}

      {/* メインコンテンツ */}
      {selectedPortfolio && portfolioSummary && (
        <>
          {/* サマリーカード */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center">
                    <AccountBalanceIcon color="primary" sx={{ mr: 1 }} />
                    <Box>
                      <Typography color="textSecondary" gutterBottom>
                        総資産
                      </Typography>
                      <Typography variant="h6">
                        {formatCurrency(portfolioSummary.totalValue)}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center">
                    {portfolioSummary.totalReturnPercent >= 0 ? (
                      <TrendingUpIcon color="success" sx={{ mr: 1 }} />
                    ) : (
                      <TrendingDownIcon color="error" sx={{ mr: 1 }} />
                    )}
                    <Box>
                      <Typography color="textSecondary" gutterBottom>
                        総リターン
                      </Typography>
                      <Typography variant="h6" color={portfolioSummary.totalReturnPercent >= 0 ? 'success.main' : 'error.main'}>
                        {formatPercent(portfolioSummary.totalReturnPercent)}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center">
                    <ShowChartIcon color="info" sx={{ mr: 1 }} />
                    <Box>
                      <Typography color="textSecondary" gutterBottom>
                        未実現損益
                      </Typography>
                      <Typography variant="h6" color={portfolioSummary.unrealizedPnL >= 0 ? 'success.main' : 'error.main'}>
                        {formatCurrency(portfolioSummary.unrealizedPnL)}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center">
                    <AssessmentIcon color="warning" sx={{ mr: 1 }} />
                    <Box>
                      <Typography color="textSecondary" gutterBottom>
                        保有銘柄数
                      </Typography>
                      <Typography variant="h6">
                        {portfolioSummary.holdingsCount}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* タブ */}
          <Card>
            <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
              <Tab label="パフォーマンス" />
              <Tab label="保有銘柄" />
              <Tab label="リスク分析" />
              <Tab label="最適化" />
              <Tab label="取引履歴" />
            </Tabs>

            <CardContent>
              {/* パフォーマンスタブ */}
              {tabValue === 0 && (
                portfolioHoldings.length > 0 ? (
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={8}>
                      <Typography variant="h6" gutterBottom>
                        パフォーマンス推移
                      </Typography>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={performanceData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip />
                          <Line type="monotone" dataKey="totalValue" stroke="#8884d8" strokeWidth={2} />
                        </LineChart>
                      </ResponsiveContainer>
                    </Grid>

                    <Grid item xs={12} md={4}>
                      <Typography variant="h6" gutterBottom>
                        資産配分
                      </Typography>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={getPieChartData()}
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                            label={({name, value, symbol}) => `${name}: ${value.toFixed(1)}%`}
                          >
                            {getPieChartData().map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </Grid>
                  </Grid>
                ) : (
                  <Paper sx={{ p: 4, textAlign: 'center' }}>
                    <ShowChartIcon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
                    <Typography variant="h6" color="textSecondary" gutterBottom>
                      パフォーマンスデータがありません
                    </Typography>
                    <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                      保有銘柄を追加するとパフォーマンスの推移が表示されます
                    </Typography>
                    <Button
                      variant="outlined"
                      startIcon={<AddIcon />}
                      onClick={() => setTransactionDialogOpen(true)}
                    >
                      取引追加
                    </Button>
                  </Paper>
                )
              )}

              {/* 保有銘柄タブ */}
              {tabValue === 1 && (
                <Box>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h6">
                      保有銘柄
                    </Typography>
                    <Button
                      variant="contained"
                      startIcon={<AddIcon />}
                      onClick={() => setTransactionDialogOpen(true)}
                    >
                      取引追加
                    </Button>
                  </Box>
                  
                  {portfolioHoldings.length > 0 ? (
                    <TableContainer component={Paper}>
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell>銘柄</TableCell>
                            <TableCell>企業名</TableCell>
                            <TableCell align="right">数量</TableCell>
                            <TableCell align="right">平均取得価格</TableCell>
                            <TableCell align="right">投資額</TableCell>
                            <TableCell>メモ</TableCell>
                            <TableCell align="center">操作</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {portfolioHoldings.map((holding) => (
                            <TableRow key={holding.id}>
                              <TableCell>
                                <Chip 
                                  label={holding.symbol} 
                                  variant="outlined" 
                                  size="small" 
                                  color="primary" 
                                />
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" color="textPrimary" fontWeight="medium">
                                  {holding.companyName || holding.symbol}
                                </Typography>
                              </TableCell>
                              <TableCell align="right">
                                <Typography variant="body2">
                                  {holding.quantity.toLocaleString()}
                                </Typography>
                              </TableCell>
                              <TableCell align="right">
                                <Typography variant="body2">
                                  {formatCurrency(holding.averageCost)}
                                </Typography>
                              </TableCell>
                              <TableCell align="right">
                                <Typography variant="body2" fontWeight="medium">
                                  {formatCurrency(holding.quantity * holding.averageCost)}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" color="textSecondary">
                                  {holding.notes || '-'}
                                </Typography>
                              </TableCell>
                              <TableCell align="center">
                                <Box display="flex" gap={1} justifyContent="center">
                                  <IconButton
                                    size="small"
                                    onClick={() => openEditDialog(holding)}
                                    color="primary"
                                  >
                                    <EditIcon />
                                  </IconButton>
                                  <IconButton
                                    size="small"
                                    onClick={() => openDeleteDialog(holding)}
                                    color="error"
                                  >
                                    <DeleteIcon />
                                  </IconButton>
                                </Box>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  ) : (
                    <Paper sx={{ p: 4, textAlign: 'center' }}>
                      <Typography variant="h6" color="textSecondary" gutterBottom>
                        保有銘柄がありません
                      </Typography>
                      <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                        「取引追加」ボタンから最初の銘柄を追加してください
                      </Typography>
                      <Button
                        variant="outlined"
                        startIcon={<AddIcon />}
                        onClick={() => setTransactionDialogOpen(true)}
                      >
                        取引追加
                      </Button>
                    </Paper>
                  )}
                </Box>
              )}

              {/* リスク分析タブ */}
              {tabValue === 2 && (
                portfolioHoldings.length > 0 && riskAnalysis ? (
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      <Typography variant="h6" gutterBottom>
                        リスクメトリクス
                      </Typography>
                      <Box mb={2}>
                        <Typography variant="body2" color="textSecondary">
                          VaR (95%): {formatCurrency(riskAnalysis.overall.var95)}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          VaR (99%): {formatCurrency(riskAnalysis.overall.var99)}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          集中リスク: {riskAnalysis.overall.concentrationRisk.toFixed(1)}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          流動性リスク: {riskAnalysis.overall.liquidityRisk.toFixed(1)}
                        </Typography>
                      </Box>

                      <Typography variant="h6" gutterBottom>
                        推奨事項
                      </Typography>
                      {riskAnalysis.recommendations.map((rec, index) => (
                        <Alert key={index} severity="info" sx={{ mb: 1 }}>
                          {rec}
                        </Alert>
                      ))}
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <Typography variant="h6" gutterBottom>
                        セクター配分
                      </Typography>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={getSectorData()}
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                            label={({name, value}) => `${name}: ${value.toFixed(1)}%`}
                          >
                            {getSectorData().map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </Grid>
                  </Grid>
                ) : (
                  <Paper sx={{ p: 4, textAlign: 'center' }}>
                    <SecurityIcon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
                    <Typography variant="h6" color="textSecondary" gutterBottom>
                      リスク分析データがありません
                    </Typography>
                    <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                      保有銘柄を追加するとリスク分析が表示されます
                    </Typography>
                    <Button
                      variant="outlined"
                      startIcon={<AddIcon />}
                      onClick={() => setTransactionDialogOpen(true)}
                    >
                      取引追加
                    </Button>
                  </Paper>
                )
              )}

              {/* 最適化タブ */}
              {tabValue === 3 && selectedPortfolio && (
                portfolioHoldings.length > 0 ? (
                  <PortfolioOptimization 
                    portfolioId={selectedPortfolio.id}
                    onOptimizationComplete={(result) => {
                      console.log('最適化完了:', result);
                      // 必要に応じてポートフォリオデータを再読み込み
                      loadPortfolioDetails(selectedPortfolio.id);
                    }}
                  />
                ) : (
                  <Paper sx={{ p: 4, textAlign: 'center' }}>
                    <AssessmentIcon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
                    <Typography variant="h6" color="textSecondary" gutterBottom>
                      最適化データがありません
                    </Typography>
                    <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                      保有銘柄を追加するとポートフォリオ最適化が利用できます
                    </Typography>
                    <Button
                      variant="outlined"
                      startIcon={<AddIcon />}
                      onClick={() => setTransactionDialogOpen(true)}
                    >
                      取引追加
                    </Button>
                  </Paper>
                )
              )}

              {/* 取引履歴タブ */}
              {tabValue === 4 && (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    取引履歴
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    取引履歴機能は開発中です
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* ポートフォリオ作成ダイアログ */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>新しいポートフォリオ作成</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="ポートフォリオ名"
            value={newPortfolio.name}
            onChange={(e) => setNewPortfolio({...newPortfolio, name: e.target.value})}
            margin="normal"
          />
          <TextField
            fullWidth
            label="説明"
            value={newPortfolio.description}
            onChange={(e) => setNewPortfolio({...newPortfolio, description: e.target.value})}
            margin="normal"
            multiline
            rows={3}
          />
          <TextField
            fullWidth
            label="初期資本"
            type="number"
            value={newPortfolio.initialCapital}
            onChange={(e) => setNewPortfolio({...newPortfolio, initialCapital: Number(e.target.value)})}
            margin="normal"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>キャンセル</Button>
          <Button onClick={createPortfolio} variant="contained">作成</Button>
        </DialogActions>
      </Dialog>

      {/* 取引追加ダイアログ */}
      <Dialog 
        open={transactionDialogOpen} 
        onClose={() => {
          setTransactionDialogOpen(false);
          setSelectedCompany(null);
          setCompanySearchResults([]);
        }} 
        maxWidth="sm" 
        fullWidth
      >
        <DialogTitle>取引追加</DialogTitle>
        <DialogContent>
          <Autocomplete
            options={companySearchResults}
            getOptionLabel={(option) => `${option.symbol} - ${option.name}`}
            value={selectedCompany}
            onChange={(event, newValue) => {
              setSelectedCompany(newValue);
              setNewTransaction({
                ...newTransaction, 
                symbol: newValue ? newValue.symbol : ''
              });
            }}
            onInputChange={(event, newInputValue) => {
              if (newInputValue.length > 0) {
                searchCompanies(newInputValue);
              } else {
                setCompanySearchResults([]);
              }
            }}
            loading={searchLoading}
            renderInput={(params) => (
              <TextField
                {...params}
                fullWidth
                label="銘柄検索（コードまたは企業名）"
                placeholder="例：7203, トヨタ, AAPL, Apple"
                margin="normal"
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <>
                      {searchLoading ? <CircularProgress color="inherit" size={20} /> : null}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                }}
              />
            )}
            renderOption={(props, option) => (
              <Box component="li" {...props}>
                <Box>
                  <Typography variant="body2" fontWeight="bold">
                    {option.symbol}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    {option.name}
                  </Typography>
                </Box>
              </Box>
            )}
            noOptionsText="該当する企業が見つかりません"
            sx={{ mt: 1 }}
          />
          <FormControl fullWidth margin="normal">
            <InputLabel>取引種別</InputLabel>
            <Select
              value={newTransaction.transactionType}
              onChange={(e) => setNewTransaction({...newTransaction, transactionType: e.target.value})}
            >
              <MenuItem value="BUY">買い</MenuItem>
              <MenuItem value="SELL">売り</MenuItem>
              <MenuItem value="DIVIDEND">配当</MenuItem>
            </Select>
          </FormControl>
          <TextField
            fullWidth
            label="数量"
            type="number"
            value={newTransaction.quantity}
            onChange={(e) => setNewTransaction({...newTransaction, quantity: Number(e.target.value)})}
            margin="normal"
          />
          <TextField
            fullWidth
            label="価格"
            type="number"
            value={newTransaction.price}
            onChange={(e) => setNewTransaction({...newTransaction, price: Number(e.target.value)})}
            margin="normal"
          />
          <TextField
            fullWidth
            label="手数料"
            type="number"
            value={newTransaction.fees}
            onChange={(e) => setNewTransaction({...newTransaction, fees: Number(e.target.value)})}
            margin="normal"
          />
          <TextField
            fullWidth
            label="メモ"
            value={newTransaction.notes}
            onChange={(e) => setNewTransaction({...newTransaction, notes: e.target.value})}
            margin="normal"
            multiline
            rows={2}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setTransactionDialogOpen(false);
            setSelectedCompany(null);
            setCompanySearchResults([]);
          }}>
            キャンセル
          </Button>
          <Button onClick={addTransaction} variant="contained">追加</Button>
        </DialogActions>
      </Dialog>

      {/* 保有銘柄編集ダイアログ */}
      <Dialog open={editHoldingDialogOpen} onClose={() => setEditHoldingDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>保有銘柄編集</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            {selectedHolding && `${selectedHolding.symbol} - ${selectedHolding.companyName || selectedHolding.symbol}`}
          </Typography>
          <TextField
            fullWidth
            label="数量"
            type="number"
            value={editHoldingData.quantity}
            onChange={(e) => setEditHoldingData({...editHoldingData, quantity: Number(e.target.value)})}
            margin="normal"
            inputProps={{ min: 1 }}
          />
          <TextField
            fullWidth
            label="平均取得価格"
            type="number"
            value={editHoldingData.averageCost}
            onChange={(e) => setEditHoldingData({...editHoldingData, averageCost: Number(e.target.value)})}
            margin="normal"
            inputProps={{ min: 0.01, step: 0.01 }}
          />
          <TextField
            fullWidth
            label="メモ"
            value={editHoldingData.notes}
            onChange={(e) => setEditHoldingData({...editHoldingData, notes: e.target.value})}
            margin="normal"
            multiline
            rows={3}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditHoldingDialogOpen(false)}>キャンセル</Button>
          <Button onClick={updateHolding} variant="contained">更新</Button>
        </DialogActions>
      </Dialog>

      {/* 保有銘柄削除確認ダイアログ */}
      <Dialog open={deleteHoldingDialogOpen} onClose={() => setDeleteHoldingDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>保有銘柄削除</DialogTitle>
        <DialogContent>
          <Typography variant="body1">
            以下の保有銘柄を削除してもよろしいですか？
          </Typography>
          {selectedHolding && (
            <Box sx={{ mt: 2, p: 2, backgroundColor: 'grey.100', borderRadius: 1 }}>
              <Typography variant="body2">
                <strong>銘柄:</strong> {selectedHolding.symbol}
              </Typography>
              <Typography variant="body2">
                <strong>企業名:</strong> {selectedHolding.companyName || selectedHolding.symbol}
              </Typography>
              <Typography variant="body2">
                <strong>数量:</strong> {selectedHolding.quantity.toLocaleString()}
              </Typography>
              <Typography variant="body2">
                <strong>平均取得価格:</strong> {formatCurrency(selectedHolding.averageCost)}
              </Typography>
              <Typography variant="body2">
                <strong>投資額:</strong> {formatCurrency(selectedHolding.quantity * selectedHolding.averageCost)}
              </Typography>
            </Box>
          )}
          <Alert severity="warning" sx={{ mt: 2 }}>
            この操作は取り消せません。
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteHoldingDialogOpen(false)}>キャンセル</Button>
          <Button onClick={deleteHolding} variant="contained" color="error">削除</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PortfolioManagement;