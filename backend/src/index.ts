import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
// Import essential routes first
import authRouter from './routes/auth';
import portfolioRouter from './routes/portfolio';
import companiesRouter from './routes/companies';
import favoritesRouter from './routes/favorites';
import analysisRouter from './routes/analysis';
import settingsRouter from './routes/settings';

// Temporarily comment out other route imports for debugging
/*
import industryRouter from './routes/industry';
import technicalRouter from './routes/technical';
import alertsRouter from './routes/alerts';
import reportsRouter from './routes/reports';
import notificationsRouter from './routes/notifications';
import apiStatsRouter from './routes/apiStats';
import apiLimitsRouter from './routes/apiLimits';
import enhancedAnalysisRouter from './routes/enhanced-analysis';
import chartDataRouter from './routes/chartData';
import websocketRouter from './routes/websocket';
import priceAlertsRouter from './routes/priceAlerts';
import performanceRouter from './routes/performance';
import optimizationRouter from './routes/optimization';
import esgRouter from './routes/esg';
*/
// import { WebSocketService } from './services/webSocketService';
// import { dataPersistenceService } from './services/dataPersistenceService';
// import { performanceMonitoringService } from './services/performanceMonitoringService';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5555;

// HTTPサーバー作成
const server = createServer(app);

// Temporarily disable helmet for debugging
// app.use(helmet({...}));

// Simplified CORS for debugging
app.use(cors());

// レート制限の実装
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分間
  max: 100, // 一般的なリクエスト上限
  message: {
    success: false,
    error: 'Too many requests. Please try again later.',
    timestamp: new Date().toISOString()
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// API専用のより厳しい制限 (テスト用に緩和)
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1分間
  max: 200, // API呼び出し上限 (テスト用に増加)
  message: {
    success: false,
    error: 'API rate limit exceeded. Please wait before making more requests.',
    timestamp: new Date().toISOString()
  }
});

// app.use(generalLimiter);  // テスト用に無効化
// app.use('/api/', apiLimiter);  // テスト用に無効化

// app.use(morgan('combined'));  // Temporarily disable logging
app.use(express.json({ limit: '10mb' })); // リクエストサイズ制限

// パフォーマンス監視ミドルウェア - 一時的に無効化
// app.use(performanceMonitoringService.createMiddleware());

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'StockAnalysis Helper API is running' });
});

// Temporarily disable all database-dependent routes for debugging
/*
app.use('/api/auth', authRouter);
app.use('/api/companies', companiesRouter);
app.use('/api/favorites', favoritesRouter);
app.use('/api/analysis', analysisRouter);
app.use('/api/industry', industryRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/technical', technicalRouter);
app.use('/api/alerts', alertsRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/api-manager', apiStatsRouter);
app.use('/api/limits', apiLimitsRouter);
app.use('/api/enhanced-analysis', enhancedAnalysisRouter);
app.use('/api/chart-data', chartDataRouter);
app.use('/api/websocket', websocketRouter);
app.use('/api/price-alerts', priceAlertsRouter);
app.use('/api/performance', performanceRouter);
app.use('/api/portfolio', portfolioRouter);
app.use('/api/optimization', optimizationRouter);
app.use('/api/esg', esgRouter);
*/

// Enable essential routes for debugging
app.use('/api/auth', authRouter);
app.use('/api/portfolio', portfolioRouter);
app.use('/api/companies', companiesRouter);
app.use('/api/favorites', favoritesRouter);
app.use('/api/analysis', analysisRouter);
app.use('/api/settings', settingsRouter);

// ヘルスチェックルート
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.get('/', (req, res) => {
  res.json({ message: 'Stock Analysis Helper API', version: '1.0.0' });
});

// プロセス終了時のハンドリング
process.on('uncaughtException', (error) => {
  console.error('🚨 Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('🚨 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// サーバー開始
server.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📊 Performance monitoring enabled`);
  console.log(`🔗 Connect to http://localhost:${PORT}`);
  
  // サーバー起動後にサービスを初期化（非同期） - 一時的に無効化
  console.log('🔧 Heavy services disabled for debugging');
}).on('error', (error) => {
  console.error('🚨 Server failed to start:', error);
  process.exit(1);
});