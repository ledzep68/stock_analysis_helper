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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Alert,
  CircularProgress,
  Slider,
  Switch,
  FormControlLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  TuneOutlined as OptimizeIcon,
  TrendingUpOutlined as TrendingUpIcon,
  SecurityOutlined as SecurityIcon,
  BalanceOutlined as BalanceIcon,
  TimelineOutlined as TimelineIcon,
  ExpandMoreOutlined as ExpandMoreIcon,
  SaveOutlined as SaveIcon,
  PlayArrowOutlined as PlayIcon,
  HistoryOutlined as HistoryIcon,
  InfoOutlined as InfoIcon
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar
} from 'recharts';
import api from '../services/api';

interface OptimizationObjective {
  type: 'MAX_RETURN' | 'MIN_RISK' | 'MAX_SHARPE' | 'RISK_PARITY' | 'EQUAL_WEIGHT';
  riskTolerance: 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE';
  timeHorizon: 'SHORT' | 'MEDIUM' | 'LONG';
}

interface OptimizationConstraints {
  minWeight?: number;
  maxWeight?: number;
  maxSectorAllocation?: { [sector: string]: number };
  targetReturn?: number;
  maxRisk?: number;
  riskFreeRate?: number;
  rebalanceThreshold?: number;
}

interface OptimizedPortfolio {
  portfolioId: string;
  objective: OptimizationObjective;
  allocations: Array<{
    symbol: string;
    targetWeight: number;
    currentWeight: number;
    recommendedAction: 'BUY' | 'SELL' | 'HOLD';
    quantity: number;
    amount: number;
  }>;
  expectedReturn: number;
  expectedRisk: number;
  sharpeRatio: number;
  metrics: {
    diversificationRatio: number;
    concentrationIndex: number;
    trackingError: number;
    informationRatio: number;
  };
  rebalancingNeeded: boolean;
  totalRebalanceAmount: number;
  estimatedCosts: {
    tradingFees: number;
    marketImpact: number;
    totalCost: number;
  };
}

interface EfficientFrontierPoint {
  risk: number;
  return: number;
  sharpeRatio: number;
  allocations: { [symbol: string]: number };
}

interface OptimizationPreset {
  id: string;
  name: string;
  description: string;
  objectiveType: string;
  riskTolerance: string;
  timeHorizon: string;
  constraints: OptimizationConstraints;
  isDefault: boolean;
}

interface PortfolioOptimizationProps {
  portfolioId: string;
  onOptimizationComplete?: (result: OptimizedPortfolio) => void;
}

const PortfolioOptimization: React.FC<PortfolioOptimizationProps> = ({
  portfolioId,
  onOptimizationComplete
}) => {
  // State管理
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 最適化設定
  const [objective, setObjective] = useState<OptimizationObjective>({
    type: 'MAX_SHARPE',
    riskTolerance: 'MODERATE',
    timeHorizon: 'MEDIUM'
  });
  const [constraints, setConstraints] = useState<OptimizationConstraints>({
    minWeight: 0.01,
    maxWeight: 0.35,
    maxRisk: 0.25,
    riskFreeRate: 0.02,
    rebalanceThreshold: 0.05
  });

  // 結果データ
  const [optimizedPortfolio, setOptimizedPortfolio] = useState<OptimizedPortfolio | null>(null);
  const [efficientFrontier, setEfficientFrontier] = useState<EfficientFrontierPoint[]>([]);
  const [optimizationHistory, setOptimizationHistory] = useState<any[]>([]);
  const [presets, setPresets] = useState<OptimizationPreset[]>([]);

  // ダイアログ状態
  const [optimizeDialogOpen, setOptimizeDialogOpen] = useState(false);
  const [presetDialogOpen, setPresetDialogOpen] = useState(false);
  const [frontierDialogOpen, setFrontierDialogOpen] = useState(false);

  // 新プリセット作成
  const [newPreset, setNewPreset] = useState({
    name: '',
    description: '',
    constraints: { ...constraints }
  });

  useEffect(() => {
    loadPresets();
    loadOptimizationHistory();
  }, [portfolioId]);

  const loadPresets = async () => {
    try {
      const response = await api.get('/optimization/presets');
      if (response.data.success) {
        setPresets(response.data.data.presets);
      }
    } catch (error) {
      console.error('Failed to load presets:', error);
    }
  };

  const loadOptimizationHistory = async () => {
    try {
      const response = await api.get(`/optimization/${portfolioId}/history?limit=20`);
      if (response.data.success) {
        setOptimizationHistory(response.data.data.optimizations);
      }
    } catch (error) {
      console.error('Failed to load optimization history:', error);
    }
  };

  const executeOptimization = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.post(`/optimization/${portfolioId}/optimize`, {
        objective,
        constraints
      });

      if (response.data.success) {
        const result = response.data.data.optimizedPortfolio;
        setOptimizedPortfolio(result);
        await loadOptimizationHistory();
        setOptimizeDialogOpen(false);
        
        if (onOptimizationComplete) {
          onOptimizationComplete(result);
        }
      }
    } catch (error: any) {
      setError(error.response?.data?.error || '最適化の実行に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const calculateEfficientFrontier = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.get(`/optimization/${portfolioId}/efficient-frontier`, {
        params: {
          pointCount: 25,
          constraints: JSON.stringify(constraints)
        }
      });

      if (response.data.success) {
        setEfficientFrontier(response.data.data.frontierPoints);
        setFrontierDialogOpen(true);
      }
    } catch (error: any) {
      setError(error.response?.data?.error || '効率的フロンティア計算に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const applyPreset = (preset: OptimizationPreset) => {
    setObjective({
      type: preset.objectiveType as any,
      riskTolerance: preset.riskTolerance as any,
      timeHorizon: preset.timeHorizon as any
    });
    setConstraints(preset.constraints);
  };

  const saveAsPreset = async () => {
    try {
      const response = await api.post('/optimization/presets', {
        name: newPreset.name,
        description: newPreset.description,
        objectiveType: objective.type,
        riskTolerance: objective.riskTolerance,
        timeHorizon: objective.timeHorizon,
        constraints: newPreset.constraints
      });

      if (response.data.success) {
        await loadPresets();
        setPresetDialogOpen(false);
        setNewPreset({ name: '', description: '', constraints: { ...constraints } });
      }
    } catch (error: any) {
      setError(error.response?.data?.error || 'プリセットの保存に失敗しました');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  const getObjectiveColor = (type: string) => {
    const colors = {
      MAX_RETURN: '#ff6b6b',
      MIN_RISK: '#4ecdc4',
      MAX_SHARPE: '#45b7d1',
      RISK_PARITY: '#96ceb4',
      EQUAL_WEIGHT: '#ffeaa7'
    };
    return colors[type as keyof typeof colors] || '#666';
  };

  const getActionColor = (action: string) => {
    const colors = {
      BUY: 'success',
      SELL: 'error',
      HOLD: 'default'
    };
    return colors[action as keyof typeof colors] || 'default';
  };

  const CHART_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

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
          ポートフォリオ最適化
        </Typography>
        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            startIcon={<TimelineIcon />}
            onClick={calculateEfficientFrontier}
            disabled={loading}
          >
            効率的フロンティア
          </Button>
          <Button
            variant="contained"
            startIcon={<OptimizeIcon />}
            onClick={() => setOptimizeDialogOpen(true)}
            disabled={loading}
          >
            最適化実行
          </Button>
        </Box>
      </Box>

      {/* メインタブ */}
      <Card>
        <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
          <Tab label="最適化設定" />
          <Tab label="最適化結果" />
          <Tab label="リバランス提案" />
          <Tab label="履歴・プリセット" />
        </Tabs>

        <CardContent>
          {/* 最適化設定タブ */}
          {tabValue === 0 && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  最適化目標
                </Typography>
                
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>最適化タイプ</InputLabel>
                  <Select
                    value={objective.type}
                    onChange={(e) => setObjective({ ...objective, type: e.target.value as any })}
                  >
                    <MenuItem value="MAX_RETURN">リターン最大化</MenuItem>
                    <MenuItem value="MIN_RISK">リスク最小化</MenuItem>
                    <MenuItem value="MAX_SHARPE">シャープレシオ最大化</MenuItem>
                    <MenuItem value="RISK_PARITY">リスクパリティ</MenuItem>
                    <MenuItem value="EQUAL_WEIGHT">等配分</MenuItem>
                  </Select>
                </FormControl>

                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>リスク許容度</InputLabel>
                  <Select
                    value={objective.riskTolerance}
                    onChange={(e) => setObjective({ ...objective, riskTolerance: e.target.value as any })}
                  >
                    <MenuItem value="CONSERVATIVE">保守的</MenuItem>
                    <MenuItem value="MODERATE">中程度</MenuItem>
                    <MenuItem value="AGGRESSIVE">積極的</MenuItem>
                  </Select>
                </FormControl>

                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>投資期間</InputLabel>
                  <Select
                    value={objective.timeHorizon}
                    onChange={(e) => setObjective({ ...objective, timeHorizon: e.target.value as any })}
                  >
                    <MenuItem value="SHORT">短期（1年未満）</MenuItem>
                    <MenuItem value="MEDIUM">中期（1-5年）</MenuItem>
                    <MenuItem value="LONG">長期（5年以上）</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  制約条件
                </Typography>

                <Box sx={{ mb: 3 }}>
                  <Typography gutterBottom>
                    最小配分比率: {(constraints.minWeight! * 100).toFixed(1)}%
                  </Typography>
                  <Slider
                    value={constraints.minWeight! * 100}
                    onChange={(e, value) => setConstraints({ 
                      ...constraints, 
                      minWeight: (value as number) / 100 
                    })}
                    min={0}
                    max={10}
                    step={0.1}
                    valueLabelDisplay="auto"
                    valueLabelFormat={(value) => `${value}%`}
                  />
                </Box>

                <Box sx={{ mb: 3 }}>
                  <Typography gutterBottom>
                    最大配分比率: {(constraints.maxWeight! * 100).toFixed(1)}%
                  </Typography>
                  <Slider
                    value={constraints.maxWeight! * 100}
                    onChange={(e, value) => setConstraints({ 
                      ...constraints, 
                      maxWeight: (value as number) / 100 
                    })}
                    min={10}
                    max={50}
                    step={1}
                    valueLabelDisplay="auto"
                    valueLabelFormat={(value) => `${value}%`}
                  />
                </Box>

                <Box sx={{ mb: 3 }}>
                  <Typography gutterBottom>
                    最大リスク: {(constraints.maxRisk! * 100).toFixed(1)}%
                  </Typography>
                  <Slider
                    value={constraints.maxRisk! * 100}
                    onChange={(e, value) => setConstraints({ 
                      ...constraints, 
                      maxRisk: (value as number) / 100 
                    })}
                    min={5}
                    max={50}
                    step={1}
                    valueLabelDisplay="auto"
                    valueLabelFormat={(value) => `${value}%`}
                  />
                </Box>

                <TextField
                  fullWidth
                  label="無リスク利子率 (%)"
                  type="number"
                  value={(constraints.riskFreeRate! * 100).toFixed(2)}
                  onChange={(e) => setConstraints({ 
                    ...constraints, 
                    riskFreeRate: parseFloat(e.target.value) / 100 
                  })}
                  sx={{ mb: 2 }}
                />
              </Grid>

              <Grid item xs={12}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mt={2}>
                  <Button
                    variant="outlined"
                    onClick={() => setPresetDialogOpen(true)}
                    startIcon={<SaveIcon />}
                  >
                    プリセットとして保存
                  </Button>
                  
                  <Box display="flex" gap={2}>
                    {presets.filter(p => p.isDefault).slice(0, 3).map((preset) => (
                      <Chip
                        key={preset.id}
                        label={preset.name}
                        onClick={() => applyPreset(preset)}
                        color="primary"
                        variant="outlined"
                        clickable
                      />
                    ))}
                  </Box>
                </Box>
              </Grid>
            </Grid>
          )}

          {/* 最適化結果タブ */}
          {tabValue === 1 && optimizedPortfolio && (
            <Grid container spacing={3}>
              {/* サマリーカード */}
              <Grid item xs={12} md={4}>
                <Card variant="outlined">
                  <CardContent>
                    <Box display="flex" alignItems="center" mb={2}>
                      <TrendingUpIcon color="primary" sx={{ mr: 1 }} />
                      <Typography variant="h6">期待リターン</Typography>
                    </Box>
                    <Typography variant="h4" color="primary">
                      {formatPercent(optimizedPortfolio.expectedReturn)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={4}>
                <Card variant="outlined">
                  <CardContent>
                    <Box display="flex" alignItems="center" mb={2}>
                      <SecurityIcon color="warning" sx={{ mr: 1 }} />
                      <Typography variant="h6">期待リスク</Typography>
                    </Box>
                    <Typography variant="h4" color="warning.main">
                      {formatPercent(optimizedPortfolio.expectedRisk)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={4}>
                <Card variant="outlined">
                  <CardContent>
                    <Box display="flex" alignItems="center" mb={2}>
                      <BalanceIcon color="success" sx={{ mr: 1 }} />
                      <Typography variant="h6">シャープレシオ</Typography>
                    </Box>
                    <Typography variant="h4" color="success.main">
                      {optimizedPortfolio.sharpeRatio.toFixed(3)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              {/* 配分チャート */}
              <Grid item xs={12} md={8}>
                <Typography variant="h6" gutterBottom>
                  最適配分
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={optimizedPortfolio.allocations.map(alloc => ({
                        name: alloc.symbol,
                        value: alloc.targetWeight,
                        currentValue: alloc.currentWeight
                      }))}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value.toFixed(1)}%`}
                    >
                      {optimizedPortfolio.allocations.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Grid>

              {/* メトリクス */}
              <Grid item xs={12} md={4}>
                <Typography variant="h6" gutterBottom>
                  最適化メトリクス
                </Typography>
                <Box>
                  <Typography variant="body2" color="textSecondary">
                    分散化比率: {optimizedPortfolio.metrics.diversificationRatio.toFixed(3)}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    集中度指数: {optimizedPortfolio.metrics.concentrationIndex.toFixed(3)}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    トラッキングエラー: {optimizedPortfolio.metrics.trackingError.toFixed(2)}%
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    情報比率: {optimizedPortfolio.metrics.informationRatio.toFixed(3)}
                  </Typography>
                </Box>

                <Box mt={2}>
                  <Typography variant="subtitle2" gutterBottom>
                    推定取引コスト
                  </Typography>
                  <Typography variant="body2">
                    取引手数料: {formatCurrency(optimizedPortfolio.estimatedCosts.tradingFees)}
                  </Typography>
                  <Typography variant="body2">
                    マーケットインパクト: {formatCurrency(optimizedPortfolio.estimatedCosts.marketImpact)}
                  </Typography>
                  <Typography variant="body2" fontWeight="bold">
                    合計コスト: {formatCurrency(optimizedPortfolio.estimatedCosts.totalCost)}
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          )}

          {/* リバランス提案タブ */}
          {tabValue === 2 && optimizedPortfolio && (
            <Box>
              <Typography variant="h6" gutterBottom>
                リバランス提案
                {optimizedPortfolio.rebalancingNeeded && (
                  <Chip label="リバランス推奨" color="warning" size="small" sx={{ ml: 2 }} />
                )}
              </Typography>

              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>銘柄</TableCell>
                      <TableCell align="right">現在配分</TableCell>
                      <TableCell align="right">目標配分</TableCell>
                      <TableCell align="center">推奨アクション</TableCell>
                      <TableCell align="right">取引金額</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {optimizedPortfolio.allocations.map((allocation) => (
                      <TableRow key={allocation.symbol}>
                        <TableCell>{allocation.symbol}</TableCell>
                        <TableCell align="right">{allocation.currentWeight.toFixed(1)}%</TableCell>
                        <TableCell align="right">{allocation.targetWeight.toFixed(1)}%</TableCell>
                        <TableCell align="center">
                          <Chip
                            label={allocation.recommendedAction}
                            color={getActionColor(allocation.recommendedAction) as any}
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="right">
                          {allocation.recommendedAction !== 'HOLD' && formatCurrency(allocation.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              <Box mt={3} display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="subtitle1">
                  総リバランス金額: {formatCurrency(optimizedPortfolio.totalRebalanceAmount)}
                </Typography>
                <Button
                  variant="contained"
                  color="primary"
                  disabled={!optimizedPortfolio.rebalancingNeeded}
                >
                  リバランス実行
                </Button>
              </Box>
            </Box>
          )}

          {/* 履歴・プリセットタブ */}
          {tabValue === 3 && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  最適化履歴
                </Typography>
                {optimizationHistory.map((optimization, index) => (
                  <Card key={optimization.id} variant="outlined" sx={{ mb: 2 }}>
                    <CardContent>
                      <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Box>
                          <Typography variant="subtitle1">
                            {optimization.objective_type}
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            {new Date(optimization.created_at).toLocaleDateString('ja-JP')}
                          </Typography>
                        </Box>
                        <Box textAlign="right">
                          <Typography variant="body2">
                            リターン: {formatPercent(optimization.expected_return)}
                          </Typography>
                          <Typography variant="body2">
                            リスク: {formatPercent(optimization.expected_risk)}
                          </Typography>
                          <Typography variant="body2">
                            シャープ: {optimization.sharpe_ratio.toFixed(3)}
                          </Typography>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  プリセット管理
                </Typography>
                {presets.map((preset) => (
                  <Card key={preset.id} variant="outlined" sx={{ mb: 2 }}>
                    <CardContent>
                      <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Box>
                          <Typography variant="subtitle1">
                            {preset.name}
                            {preset.isDefault && (
                              <Chip label="デフォルト" size="small" sx={{ ml: 1 }} />
                            )}
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            {preset.description}
                          </Typography>
                          <Typography variant="caption">
                            {preset.objectiveType} / {preset.riskTolerance}
                          </Typography>
                        </Box>
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => applyPreset(preset)}
                        >
                          適用
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Grid>
            </Grid>
          )}
        </CardContent>
      </Card>

      {/* 最適化実行ダイアログ */}
      <Dialog open={optimizeDialogOpen} onClose={() => setOptimizeDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>ポートフォリオ最適化実行</DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            以下の設定でポートフォリオを最適化しますか？
          </Typography>
          
          <Box mt={2}>
            <Typography variant="subtitle2">最適化目標:</Typography>
            <Chip 
              label={objective.type} 
              color="primary" 
              sx={{ backgroundColor: getObjectiveColor(objective.type) }} 
            />
          </Box>
          
          <Box mt={1}>
            <Typography variant="subtitle2">リスク許容度: {objective.riskTolerance}</Typography>
            <Typography variant="subtitle2">投資期間: {objective.timeHorizon}</Typography>
          </Box>

          <Alert severity="info" sx={{ mt: 2 }}>
            最適化には数秒から数分かかる場合があります。
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOptimizeDialogOpen(false)}>キャンセル</Button>
          <Button 
            onClick={executeOptimization} 
            variant="contained" 
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : <PlayIcon />}
          >
            実行
          </Button>
        </DialogActions>
      </Dialog>

      {/* プリセット保存ダイアログ */}
      <Dialog open={presetDialogOpen} onClose={() => setPresetDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>プリセットとして保存</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="プリセット名"
            value={newPreset.name}
            onChange={(e) => setNewPreset({ ...newPreset, name: e.target.value })}
            margin="normal"
          />
          <TextField
            fullWidth
            label="説明"
            value={newPreset.description}
            onChange={(e) => setNewPreset({ ...newPreset, description: e.target.value })}
            margin="normal"
            multiline
            rows={3}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPresetDialogOpen(false)}>キャンセル</Button>
          <Button onClick={saveAsPreset} variant="contained">保存</Button>
        </DialogActions>
      </Dialog>

      {/* 効率的フロンティアダイアログ */}
      <Dialog open={frontierDialogOpen} onClose={() => setFrontierDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>効率的フロンティア</DialogTitle>
        <DialogContent>
          <ResponsiveContainer width="100%" height={400}>
            <ScatterChart data={efficientFrontier}>
              <CartesianGrid />
              <XAxis dataKey="risk" name="リスク" unit="%" />
              <YAxis dataKey="return" name="リターン" unit="%" />
              <RechartsTooltip 
                cursor={{ strokeDasharray: '3 3' }}
                formatter={(value, name) => [
                  `${value}%`, 
                  name === 'return' ? 'リターン' : name === 'risk' ? 'リスク' : 'シャープレシオ'
                ]}
              />
              <Scatter fill="#8884d8" />
            </ScatterChart>
          </ResponsiveContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFrontierDialogOpen(false)}>閉じる</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PortfolioOptimization;