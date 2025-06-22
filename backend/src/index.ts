import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import companiesRouter from './routes/companies';
import favoritesRouter from './routes/favorites';
import analysisRouter from './routes/analysis';
import industryRouter from './routes/industry';
import settingsRouter from './routes/settings';
import authRouter from './routes/auth';
import technicalRouter from './routes/technical';
import alertsRouter from './routes/alerts';
import reportsRouter from './routes/reports';
import notificationsRouter from './routes/notifications';
import apiStatsRouter from './routes/apiStats';
import apiLimitsRouter from './routes/apiLimits';
import enhancedAnalysisRouter from './routes/enhanced-analysis';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5003;

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "fonts.googleapis.com"],
      fontSrc: ["'self'", "fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "http://localhost:5000", "http://localhost:5001", "http://localhost:5002", "http://localhost:5003", "https://query1.finance.yahoo.com", "https://www.alphavantage.co"],
      objectSrc: ["'none'"],
      mediaSrc: ["'none'"],
      frameSrc: ["'none'"],
      frameAncestors: ["'none'"],
      formAction: ["'self'"],
      baseUri: ["'self'"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// CORS設定の強化
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.ALLOWED_ORIGINS?.split(',') || ['https://your-domain.com']
    : ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));

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

app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' })); // リクエストサイズ制限

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'StockAnalysis Helper API is running' });
});

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

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});