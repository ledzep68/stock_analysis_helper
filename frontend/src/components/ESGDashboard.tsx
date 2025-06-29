import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  LinearProgress,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider
} from '@mui/material';
import {
  AccountBalance as EcoIcon,
  People as PeopleIcon,
  AccountBalance as GovernanceIcon,
  Warning as WarningIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  BarChart,
  Bar
} from 'recharts';
import { api } from '../services/api';

interface ESGScores {
  environmental: number;
  social: number;
  governance: number;
  total: number;
  grade: string;
}

interface RiskAssessment {
  totalRiskScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  keyRisks: string[];
  mitigationStrategies: string;
}

interface TrendData {
  year: number;
  totalScore: number;
  grade: string;
}

interface KeyMetrics {
  carbonIntensity?: number;
  renewableEnergyRatio?: number;
  employeeSatisfaction?: number;
  boardIndependence?: number;
  diversityScore?: number;
}

interface ESGDashboardData {
  symbol: string;
  companyName: string;
  lastUpdated: string;
  currentScores: ESGScores;
  riskAssessment: RiskAssessment;
  trend: TrendData[];
  keyMetrics: KeyMetrics;
  recommendations: string;
}

interface ESGDashboardProps {
  symbol: string;
}

const ESGDashboard: React.FC<ESGDashboardProps> = ({ symbol }) => {
  const [data, setData] = useState<ESGDashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    if (symbol) {
      fetchESGDashboard();
    }
  }, [symbol]);

  const fetchESGDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get(`/esg/${symbol}/dashboard`);
      
      if (response.data.success) {
        setData(response.data.data);
      } else {
        setError(response.data.error || 'ESGデータの取得に失敗しました');
      }
    } catch (err: any) {
      console.error('ESGダッシュボード取得エラー:', err);
      setError('ESGダッシュボードの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number): string => {
    if (score >= 80) return '#4caf50'; // Green
    if (score >= 60) return '#ff9800'; // Orange
    if (score >= 40) return '#f44336'; // Red
    return '#9e9e9e'; // Gray
  };

  const getGradeColor = (grade: string): 'success' | 'warning' | 'error' | 'default' => {
    if (['AAA', 'AA', 'A'].includes(grade)) return 'success';
    if (['BBB', 'BB'].includes(grade)) return 'warning';
    if (['B', 'CCC'].includes(grade)) return 'error';
    return 'default';
  };

  const getRiskLevelColor = (level: string): 'success' | 'warning' | 'error' | 'default' => {
    switch (level) {
      case 'LOW': return 'success';
      case 'MEDIUM': return 'warning';
      case 'HIGH': return 'error';
      case 'CRITICAL': return 'error';
      default: return 'default';
    }
  };

  const getRiskIcon = (level: string) => {
    switch (level) {
      case 'LOW': return <CheckCircleIcon color="success" />;
      case 'MEDIUM': return <InfoIcon color="warning" />;
      case 'HIGH': return <WarningIcon color="error" />;
      case 'CRITICAL': return <ErrorIcon color="error" />;
      default: return <InfoIcon />;
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
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

  if (!data) {
    return (
      <Alert severity="info" sx={{ m: 2 }}>
        ESGデータが見つかりません
      </Alert>
    );
  }

  const radarData = [
    {
      subject: '環境',
      score: data.currentScores.environmental,
      fullMark: 100
    },
    {
      subject: '社会',
      score: data.currentScores.social,
      fullMark: 100
    },
    {
      subject: 'ガバナンス',
      score: data.currentScores.governance,
      fullMark: 100
    }
  ];

  return (
    <Box sx={{ p: 2 }}>
      {/* ヘッダー */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h4" gutterBottom>
            ESG評価ダッシュボード
          </Typography>
          <Typography variant="h6" color="primary">
            {data.companyName} ({data.symbol})
          </Typography>
          <Typography variant="body2" color="text.secondary">
            最終更新: {new Date(data.lastUpdated).toLocaleDateString('ja-JP')}
          </Typography>
        </CardContent>
      </Card>

      {/* メインスコア表示 */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <EcoIcon color="success" sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h6">環境スコア</Typography>
              <Typography variant="h4" sx={{ color: getScoreColor(data.currentScores.environmental), mb: 1 }}>
                {Math.round(data.currentScores.environmental)}
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={data.currentScores.environmental} 
                sx={{ height: 8, borderRadius: 4 }}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <PeopleIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h6">社会スコア</Typography>
              <Typography variant="h4" sx={{ color: getScoreColor(data.currentScores.social), mb: 1 }}>
                {Math.round(data.currentScores.social)}
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={data.currentScores.social} 
                sx={{ height: 8, borderRadius: 4 }}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <GovernanceIcon color="secondary" sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h6">ガバナンススコア</Typography>
              <Typography variant="h4" sx={{ color: getScoreColor(data.currentScores.governance), mb: 1 }}>
                {Math.round(data.currentScores.governance)}
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={data.currentScores.governance} 
                sx={{ height: 8, borderRadius: 4 }}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h6">総合スコア</Typography>
              <Typography variant="h3" sx={{ color: getScoreColor(data.currentScores.total), mb: 1 }}>
                {Math.round(data.currentScores.total)}
              </Typography>
              <Chip 
                label={data.currentScores.grade} 
                color={getGradeColor(data.currentScores.grade)}
                sx={{ fontSize: '1.1rem', py: 2, px: 1 }}
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* タブ切り替え */}
      <Card>
        <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
          <Tab label="概要" />
          <Tab label="リスク分析" />
          <Tab label="トレンド" />
          <Tab label="キーメトリクス" />
        </Tabs>

        <CardContent>
          {/* 概要タブ */}
          {activeTab === 0 && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  ESGスコア分布
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="subject" />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} />
                    <Radar
                      name="ESGスコア"
                      dataKey="score"
                      stroke="#8884d8"
                      fill="#8884d8"
                      fillOpacity={0.6}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  改善提案
                </Typography>
                <Alert severity="info" sx={{ mb: 2 }}>
                  {data.recommendations}
                </Alert>

                <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                  スコア詳細
                </Typography>
                <TableContainer component={Paper}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>カテゴリー</TableCell>
                        <TableCell align="right">スコア</TableCell>
                        <TableCell align="right">進捗</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      <TableRow>
                        <TableCell>環境 (E)</TableCell>
                        <TableCell align="right">{Math.round(data.currentScores.environmental)}</TableCell>
                        <TableCell align="right">
                          <LinearProgress 
                            variant="determinate" 
                            value={data.currentScores.environmental} 
                            sx={{ width: 100 }}
                          />
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>社会 (S)</TableCell>
                        <TableCell align="right">{Math.round(data.currentScores.social)}</TableCell>
                        <TableCell align="right">
                          <LinearProgress 
                            variant="determinate" 
                            value={data.currentScores.social} 
                            sx={{ width: 100 }}
                          />
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>ガバナンス (G)</TableCell>
                        <TableCell align="right">{Math.round(data.currentScores.governance)}</TableCell>
                        <TableCell align="right">
                          <LinearProgress 
                            variant="determinate" 
                            value={data.currentScores.governance} 
                            sx={{ width: 100 }}
                          />
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </Grid>
            </Grid>
          )}

          {/* リスク分析タブ */}
          {activeTab === 1 && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Box display="flex" alignItems="center" mb={2}>
                      {getRiskIcon(data.riskAssessment.riskLevel)}
                      <Typography variant="h6" sx={{ ml: 1 }}>
                        リスクレベル
                      </Typography>
                    </Box>
                    
                    <Chip 
                      label={data.riskAssessment.riskLevel}
                      color={getRiskLevelColor(data.riskAssessment.riskLevel)}
                      sx={{ mb: 2 }}
                    />
                    
                    <Typography variant="body2" color="text.secondary">
                      総合リスクスコア: {Math.round(data.riskAssessment.totalRiskScore)}
                    </Typography>
                    
                    <LinearProgress 
                      variant="determinate" 
                      value={data.riskAssessment.totalRiskScore} 
                      color={data.riskAssessment.totalRiskScore > 75 ? 'error' : 
                             data.riskAssessment.totalRiskScore > 50 ? 'warning' : 'success'}
                      sx={{ mt: 1, height: 8, borderRadius: 4 }}
                    />
                  </CardContent>
                </Card>

                <Card sx={{ mt: 2 }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      主要リスク要因
                    </Typography>
                    <List>
                      {data.riskAssessment.keyRisks.map((risk, index) => (
                        <ListItem key={index}>
                          <ListItemIcon>
                            <WarningIcon color="warning" />
                          </ListItemIcon>
                          <ListItemText primary={risk} />
                        </ListItem>
                      ))}
                    </List>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      リスク軽減戦略
                    </Typography>
                    <Alert severity="info">
                      {data.riskAssessment.mitigationStrategies}
                    </Alert>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}

          {/* トレンドタブ */}
          {activeTab === 2 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                ESGスコアの推移
              </Typography>
              
              {data.trend.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={data.trend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="year" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="totalScore" 
                      stroke="#8884d8" 
                      strokeWidth={3}
                      name="総合ESGスコア"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <Alert severity="info">
                  トレンド分析用の履歴データが不足しています
                </Alert>
              )}

              <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                年次ESG評価
              </Typography>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>年度</TableCell>
                      <TableCell align="right">総合スコア</TableCell>
                      <TableCell align="center">グレード</TableCell>
                      <TableCell align="center">トレンド</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.trend.map((item, index) => {
                      const prevScore = index < data.trend.length - 1 ? data.trend[index + 1].totalScore : null;
                      const trend = prevScore ? (item.totalScore > prevScore ? 'up' : 
                                                item.totalScore < prevScore ? 'down' : 'same') : 'none';
                      
                      return (
                        <TableRow key={item.year}>
                          <TableCell>{item.year}</TableCell>
                          <TableCell align="right">{Math.round(item.totalScore)}</TableCell>
                          <TableCell align="center">
                            <Chip 
                              label={item.grade} 
                              color={getGradeColor(item.grade)}
                              size="small"
                            />
                          </TableCell>
                          <TableCell align="center">
                            {trend === 'up' && <TrendingUpIcon color="success" />}
                            {trend === 'down' && <TrendingDownIcon color="error" />}
                            {trend === 'same' && '-'}
                            {trend === 'none' && '-'}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {/* キーメトリクスタブ */}
          {activeTab === 3 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                主要ESG指標
              </Typography>
              
              <Grid container spacing={3}>
                {Object.entries(data.keyMetrics).map(([key, value]) => {
                  if (value === undefined || value === null) return null;
                  
                  const metricNames: {[key: string]: string} = {
                    carbonIntensity: '炭素集約度',
                    renewableEnergyRatio: '再生可能エネルギー比率',
                    employeeSatisfaction: '従業員満足度',
                    boardIndependence: '取締役独立性',
                    diversityScore: 'ダイバーシティスコア'
                  };
                  
                  return (
                    <Grid item xs={12} sm={6} md={4} key={key}>
                      <Card>
                        <CardContent sx={{ textAlign: 'center' }}>
                          <Typography variant="subtitle1" gutterBottom>
                            {metricNames[key] || key}
                          </Typography>
                          <Typography variant="h4" sx={{ color: getScoreColor(value), mb: 1 }}>
                            {Math.round(value)}
                            {key === 'renewableEnergyRatio' || key === 'employeeSatisfaction' || 
                             key === 'boardIndependence' || key === 'diversityScore' ? '%' : ''}
                          </Typography>
                          <LinearProgress 
                            variant="determinate" 
                            value={value} 
                            sx={{ height: 6, borderRadius: 3 }}
                          />
                        </CardContent>
                      </Card>
                    </Grid>
                  );
                })}
              </Grid>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default ESGDashboard;