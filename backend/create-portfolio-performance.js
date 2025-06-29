const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'stock_analysis.db');
const db = new sqlite3.Database(dbPath);

const performanceSQL = `
-- ポートフォリオパフォーマンス履歴テーブル
CREATE TABLE IF NOT EXISTS portfolio_performance (
    id TEXT PRIMARY KEY,
    portfolio_id TEXT NOT NULL,
    date TEXT NOT NULL,
    total_value REAL NOT NULL,
    total_cost REAL NOT NULL,
    unrealized_pnl REAL NOT NULL,
    realized_pnl REAL DEFAULT 0,
    daily_return REAL,
    cumulative_return REAL,
    benchmark_return REAL,
    sharpe_ratio REAL,
    volatility REAL,
    max_drawdown REAL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (portfolio_id) REFERENCES portfolios(id) ON DELETE CASCADE
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_portfolio_performance_portfolio_id ON portfolio_performance(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_performance_date ON portfolio_performance(date);
`;

async function createPerformanceData() {
  const statements = performanceSQL.split(';').filter(stmt => stmt.trim().length > 0);
  
  for (const statement of statements) {
    await new Promise((resolve, reject) => {
      db.run(statement, (err) => {
        if (err) {
          console.error('Error executing statement:', err);
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }
  
  // サンプルパフォーマンスデータを生成
  const portfolioIds = ['portfolio_1', 'portfolio_2'];
  const today = new Date();
  
  for (const portfolioId of portfolioIds) {
    let baseValue = portfolioId === 'portfolio_1' ? 5000000 : 3000000;
    let totalCost = baseValue;
    
    for (let i = 30; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      // ランダムな日次リターン（-2%から+2%）
      const dailyReturn = (Math.random() - 0.5) * 0.04;
      baseValue = baseValue * (1 + dailyReturn);
      
      const unrealizedPnl = baseValue - totalCost;
      const cumulativeReturn = (baseValue - totalCost) / totalCost * 100;
      
      const id = `perf_${portfolioId}_${i}`;
      const dateStr = date.toISOString().split('T')[0];
      
      await new Promise((resolve, reject) => {
        db.run(`
          INSERT OR IGNORE INTO portfolio_performance (
            id, portfolio_id, date, total_value, total_cost, unrealized_pnl, 
            realized_pnl, daily_return, cumulative_return, benchmark_return, 
            sharpe_ratio, volatility, max_drawdown, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          id, portfolioId, dateStr, baseValue, totalCost, unrealizedPnl,
          0, dailyReturn * 100, cumulativeReturn, dailyReturn * 100 * 0.8,
          1.2, 15.5, 5.2, new Date().toISOString()
        ], (err) => {
          if (err) {
            console.error('Error inserting performance data:', err);
            reject(err);
          } else {
            resolve();
          }
        });
      });
    }
  }
  
  console.log('✅ Portfolio performance data created successfully');
  db.close();
}

createPerformanceData().catch(console.error);