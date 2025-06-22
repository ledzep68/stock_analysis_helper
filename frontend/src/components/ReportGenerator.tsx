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
  Grid,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  CircularProgress,
  Alert,
  RadioGroup,
  FormControlLabel,
  Radio,
  FormLabel,
  Divider,
  LinearProgress
} from '@mui/material';
import {
  PictureAsPdf as PdfIcon,
  TableChart as CsvIcon,
  Assessment as ReportIcon,
  Download as DownloadIcon,
  Preview as PreviewIcon,
  History as HistoryIcon,
  TrendingUp,
  BarChart,
  ShowChart,
  Business,
  TableChart
} from '@mui/icons-material';
import { api } from '../services/api';

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  sections: string[];
  estimatedPages: string;
}

interface ReportPreview {
  reportType: string;
  symbol: string;
  estimatedSections: string[];
  dataAvailability: {
    companyInfo: boolean;
    financialData: boolean;
    technicalData: boolean;
    historicalPrices: boolean;
  };
  estimatedGenerationTime: string;
  fileSize: string;
}

interface ReportHistory {
  id: number;
  report_type: string;
  symbol: string;
  generated_at: string;
  file_size: string;
  status: string;
}

export const ReportGenerator: React.FC = () => {
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [history, setHistory] = useState<ReportHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [preview, setPreview] = useState<ReportPreview | null>(null);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [formData, setFormData] = useState({
    symbol: '',
    reportType: 'comprehensive',
    format: 'pdf'
  });

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await api.get('/reports/templates');
      setTemplates(response.data.data);
    } catch (err) {
      setError('テンプレートの取得に失敗しました');
      console.error('Fetch templates error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const response = await api.get('/reports/history');
      setHistory(response.data.data);
    } catch (err) {
      console.error('Fetch history error:', err);
    }
  };

  const generatePreview = async () => {
    try {
      if (!formData.symbol) {
        setError('銘柄コードを入力してください');
        return;
      }

      setLoading(true);
      const response = await api.post(`/reports/preview/${formData.symbol}`, {
        reportType: formData.reportType
      });

      setPreview(response.data.data);
      setPreviewDialogOpen(true);
    } catch (err) {
      setError('プレビューの生成に失敗しました');
      console.error('Generate preview error:', err);
    } finally {
      setLoading(false);
    }
  };

  const generateReport = async () => {
    try {
      if (!formData.symbol) {
        setError('銘柄コードを入力してください');
        return;
      }

      setLoading(true);
      setGenerationProgress(0);

      // Simulate progress
      const progressInterval = setInterval(() => {
        setGenerationProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 500);

      let response;
      if (formData.reportType === 'portfolio') {
        response = await api.post('/reports/portfolio', {
          format: formData.format
        }, {
          responseType: 'blob'
        });
      } else {
        response = await api.post(`/reports/company/${formData.symbol}`, {
          reportType: formData.reportType,
          format: formData.format
        }, {
          responseType: 'blob'
        });
      }

      clearInterval(progressInterval);
      setGenerationProgress(100);

      // Create download link
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const extension = formData.format === 'pdf' ? 'pdf' : formData.format === 'excel' ? 'xlsx' : 'csv';
      const filename = formData.reportType === 'portfolio' 
        ? `portfolio_report.${extension}`
        : `${formData.symbol}_${formData.reportType}_report.${extension}`;
      
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setGenerateDialogOpen(false);
      setFormData({ symbol: '', reportType: 'comprehensive', format: 'pdf' });
    } catch (err) {
      setError('レポートの生成に失敗しました');
      console.error('Generate report error:', err);
    } finally {
      setLoading(false);
      setGenerationProgress(0);
    }
  };

  const getTemplateIcon = (type: string) => {
    switch (type) {
      case 'comprehensive': return <ReportIcon />;
      case 'technical': return <ShowChart />;
      case 'fundamental': return <BarChart />;
      case 'portfolio': return <Business />;
      default: return <ReportIcon />;
    }
  };

  const getTemplateColor = (type: string) => {
    switch (type) {
      case 'comprehensive': return 'primary';
      case 'technical': return 'secondary';
      case 'fundamental': return 'success';
      case 'portfolio': return 'warning';
      default: return 'default';
    }
  };

  const openHistoryDialog = async () => {
    await fetchHistory();
    setHistoryDialogOpen(true);
  };

  if (loading && templates.length === 0) {
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
            レポート生成
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
              startIcon={<ReportIcon />}
              onClick={() => setGenerateDialogOpen(true)}
            >
              レポート作成
            </Button>
          </Box>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Typography variant="h6" gutterBottom>
          利用可能なテンプレート
        </Typography>

        <Grid container spacing={3}>
          {templates.map((template) => (
            <Grid item xs={12} md={6} key={template.id}>
              <Paper sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
                <Box display="flex" alignItems="center" mb={2}>
                  {getTemplateIcon(template.id)}
                  <Typography variant="h6" sx={{ ml: 1, flexGrow: 1 }}>
                    {template.name}
                  </Typography>
                  <Chip 
                    label={template.estimatedPages}
                    size="small"
                    color={getTemplateColor(template.id) as any}
                  />
                </Box>
                
                <Typography variant="body2" color="text.secondary" paragraph>
                  {template.description}
                </Typography>

                <Typography variant="subtitle2" gutterBottom>
                  含まれるセクション:
                </Typography>
                <List dense>
                  {template.sections.map((section, index) => (
                    <ListItem key={index} sx={{ py: 0 }}>
                      <ListItemIcon sx={{ minWidth: 20 }}>
                        <TrendingUp fontSize="small" />
                      </ListItemIcon>
                      <ListItemText 
                        primary={section}
                        primaryTypographyProps={{ variant: 'body2' }}
                      />
                    </ListItem>
                  ))}
                </List>

                <Box mt="auto">
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={() => {
                      setFormData({ ...formData, reportType: template.id });
                      setGenerateDialogOpen(true);
                    }}
                  >
                    このテンプレートを使用
                  </Button>
                </Box>
              </Paper>
            </Grid>
          ))}
        </Grid>

        {/* Generate Report Dialog */}
        <Dialog open={generateDialogOpen} onClose={() => setGenerateDialogOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>レポートを生成</DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 1 }}>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth margin="normal">
                    <InputLabel>レポートタイプ</InputLabel>
                    <Select
                      value={formData.reportType}
                      onChange={(e) => setFormData({ ...formData, reportType: e.target.value })}
                    >
                      {templates.map((template) => (
                        <MenuItem key={template.id} value={template.id}>
                          {template.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  {formData.reportType !== 'portfolio' && (
                    <TextField
                      fullWidth
                      label="銘柄コード"
                      value={formData.symbol}
                      onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
                      margin="normal"
                      placeholder="例: 7203, AAPL"
                    />
                  )}

                  <FormControl component="fieldset" margin="normal">
                    <FormLabel component="legend">出力形式</FormLabel>
                    <RadioGroup
                      row
                      value={formData.format}
                      onChange={(e) => setFormData({ ...formData, format: e.target.value })}
                    >
                      <FormControlLabel
                        value="pdf"
                        control={<Radio />}
                        label={
                          <Box display="flex" alignItems="center">
                            <PdfIcon sx={{ mr: 1 }} />
                            PDF
                          </Box>
                        }
                      />
                      <FormControlLabel
                        value="csv"
                        control={<Radio />}
                        label={
                          <Box display="flex" alignItems="center">
                            <CsvIcon sx={{ mr: 1 }} />
                            CSV
                          </Box>
                        }
                      />
                      <FormControlLabel
                        value="excel"
                        control={<Radio />}
                        label={
                          <Box display="flex" alignItems="center">
                            <TableChart sx={{ mr: 1 }} />
                            Excel
                          </Box>
                        }
                      />
                    </RadioGroup>
                  </FormControl>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                    <Typography variant="subtitle2" gutterBottom>
                      選択されたテンプレート
                    </Typography>
                    {templates.find(t => t.id === formData.reportType) && (
                      <>
                        <Typography variant="body2" paragraph>
                          {templates.find(t => t.id === formData.reportType)?.description}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          推定ページ数: {templates.find(t => t.id === formData.reportType)?.estimatedPages}
                        </Typography>
                      </>
                    )}
                  </Paper>
                </Grid>
              </Grid>

              {loading && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" gutterBottom>
                    レポートを生成中... ({generationProgress}%)
                  </Typography>
                  <LinearProgress variant="determinate" value={generationProgress} />
                </Box>
              )}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setGenerateDialogOpen(false)} disabled={loading}>
              キャンセル
            </Button>
            <Button 
              onClick={generatePreview} 
              disabled={loading || (!formData.symbol && formData.reportType !== 'portfolio')}
              startIcon={<PreviewIcon />}
            >
              プレビュー
            </Button>
            <Button 
              onClick={generateReport} 
              variant="contained" 
              disabled={loading || (!formData.symbol && formData.reportType !== 'portfolio')}
              startIcon={<DownloadIcon />}
            >
              生成・ダウンロード
            </Button>
          </DialogActions>
        </Dialog>

        {/* Preview Dialog */}
        <Dialog open={previewDialogOpen} onClose={() => setPreviewDialogOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>レポートプレビュー</DialogTitle>
          <DialogContent>
            {preview && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  {preview.symbol} - {preview.reportType}
                </Typography>
                
                <Divider sx={{ my: 2 }} />

                <Typography variant="subtitle2" gutterBottom>
                  含まれるセクション:
                </Typography>
                <List>
                  {preview.estimatedSections.map((section, index) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        <TrendingUp />
                      </ListItemIcon>
                      <ListItemText primary={section} />
                    </ListItem>
                  ))}
                </List>

                <Divider sx={{ my: 2 }} />

                <Typography variant="subtitle2" gutterBottom>
                  データ利用可能性:
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Chip 
                      label="企業情報" 
                      color={preview.dataAvailability.companyInfo ? 'success' : 'error'} 
                      size="small" 
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <Chip 
                      label="財務データ" 
                      color={preview.dataAvailability.financialData ? 'success' : 'error'} 
                      size="small" 
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <Chip 
                      label="テクニカルデータ" 
                      color={preview.dataAvailability.technicalData ? 'success' : 'error'} 
                      size="small" 
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <Chip 
                      label="価格履歴" 
                      color={preview.dataAvailability.historicalPrices ? 'success' : 'error'} 
                      size="small" 
                    />
                  </Grid>
                </Grid>

                <Box mt={2}>
                  <Typography variant="body2" color="text.secondary">
                    推定生成時間: {preview.estimatedGenerationTime}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    推定ファイルサイズ: {preview.fileSize}
                  </Typography>
                </Box>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPreviewDialogOpen(false)}>閉じる</Button>
            <Button onClick={generateReport} variant="contained" startIcon={<DownloadIcon />}>
              生成・ダウンロード
            </Button>
          </DialogActions>
        </Dialog>

        {/* History Dialog */}
        <Dialog open={historyDialogOpen} onClose={() => setHistoryDialogOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>レポート履歴</DialogTitle>
          <DialogContent>
            <List>
              {history.map((item) => (
                <ListItem key={item.id}>
                  <ListItemIcon>
                    <ReportIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary={`${item.symbol} - ${item.report_type}`}
                    secondary={`生成日: ${new Date(item.generated_at).toLocaleString('ja-JP')} | サイズ: ${item.file_size}`}
                  />
                  <Chip
                    label={item.status}
                    color={item.status === 'completed' ? 'success' : 'warning'}
                    size="small"
                  />
                </ListItem>
              ))}
              {history.length === 0 && (
                <ListItem>
                  <ListItemText
                    primary="履歴がありません"
                    secondary="レポートを生成すると、ここに履歴が表示されます"
                  />
                </ListItem>
              )}
            </List>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setHistoryDialogOpen(false)}>閉じる</Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </Card>
  );
};