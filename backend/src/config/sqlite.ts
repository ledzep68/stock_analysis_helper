import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';

export class SQLiteDatabase {
  private db: sqlite3.Database | null = null;
  private dbPath: string;

  constructor() {
    // CommonJS環境での__dirnameの代替
    const dbDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    this.dbPath = path.join(dbDir, 'stock_analysis.db');
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          console.error('Error opening database:', err);
          reject(err);
        } else {
          console.log('Connected to SQLite database');
          resolve();
        }
      });
    });
  }

  async query(sql: string, params: any[] = []): Promise<any> {
    if (!this.db) {
      throw new Error('Database not connected');
    }

    return new Promise((resolve, reject) => {
      if (sql.trim().toUpperCase().startsWith('SELECT')) {
        this.db!.all(sql, params, (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve({ rows });
          }
        });
      } else {
        this.db!.run(sql, params, function(err) {
          if (err) {
            reject(err);
          } else {
            resolve({ 
              rowCount: this.changes,
              lastID: this.lastID 
            });
          }
        });
      }
    });
  }

  async testConnection(): Promise<void> {
    try {
      await this.query('SELECT 1 as test');
      console.log('Database connection test successful');
    } catch (error) {
      console.error('Database connection test failed:', error);
      throw error;
    }
  }

  async close(): Promise<void> {
    if (this.db) {
      return new Promise((resolve, reject) => {
        this.db!.close((err) => {
          if (err) {
            reject(err);
          } else {
            console.log('Database connection closed');
            resolve();
          }
        });
      });
    }
  }

  async initializeTables(): Promise<void> {
    const tables = [
      // Users table
      `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        display_name TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_login DATETIME,
        is_active BOOLEAN DEFAULT true
      )`,

      // Companies table
      `CREATE TABLE IF NOT EXISTS companies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        symbol TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        sector TEXT,
        industry TEXT,
        market_cap REAL,
        current_price REAL,
        price_change REAL,
        change_percentage REAL,
        volume INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Stock prices table
      `CREATE TABLE IF NOT EXISTS stock_prices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        symbol TEXT NOT NULL,
        date DATE NOT NULL,
        open_price REAL,
        high_price REAL,
        low_price REAL,
        close_price REAL NOT NULL,
        volume INTEGER,
        adjusted_close REAL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(symbol, date)
      )`,

      // Favorites table
      `CREATE TABLE IF NOT EXISTS favorites (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        symbol TEXT NOT NULL,
        notes TEXT,
        price_alert_target REAL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(user_id, symbol)
      )`,

      // User settings table
      `CREATE TABLE IF NOT EXISTS user_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER UNIQUE NOT NULL,
        display_currency TEXT DEFAULT 'JPY',
        language TEXT DEFAULT 'ja',
        theme TEXT DEFAULT 'light',
        default_analysis_type TEXT DEFAULT 'comprehensive',
        notification_preferences TEXT DEFAULT '{}',
        dashboard_layout TEXT DEFAULT '{}',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`,

      // Technical analysis cache table
      `CREATE TABLE IF NOT EXISTS technical_analysis_cache (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        symbol TEXT UNIQUE NOT NULL,
        analysis_data TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Price alerts table
      `CREATE TABLE IF NOT EXISTS price_alerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        symbol TEXT NOT NULL,
        alert_type TEXT NOT NULL CHECK (alert_type IN ('price_above', 'price_below', 'percent_change', 'volume_spike', 'technical_signal')),
        target_value REAL,
        current_value REAL,
        is_active BOOLEAN DEFAULT true,
        triggered_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`,

      // Alert history table
      `CREATE TABLE IF NOT EXISTS alert_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        alert_id INTEGER NOT NULL,
        triggered_value REAL,
        message TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (alert_id) REFERENCES price_alerts(id) ON DELETE CASCADE
      )`,

      // User technical settings table
      `CREATE TABLE IF NOT EXISTS user_technical_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER UNIQUE NOT NULL,
        indicator_preferences TEXT DEFAULT '{"sma": [20, 50, 200], "ema": [12, 26], "rsi": {"period": 14, "overbought": 70, "oversold": 30}, "macd": {"fast": 12, "slow": 26, "signal": 9}, "bollinger": {"period": 20, "stdDev": 2}, "stochastic": {"period": 14, "smooth": 3}}',
        chart_preferences TEXT DEFAULT '{"theme": "light", "candlestick": true, "volume": true, "indicators": ["sma", "volume"]}',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`
    ];

    for (const table of tables) {
      await this.query(table);
    }

    // Create indexes
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_stock_prices_symbol_date ON stock_prices(symbol, date DESC)',
      'CREATE INDEX IF NOT EXISTS idx_stock_prices_date ON stock_prices(date DESC)',
      'CREATE INDEX IF NOT EXISTS idx_technical_cache_symbol ON technical_analysis_cache(symbol)',
      'CREATE INDEX IF NOT EXISTS idx_price_alerts_user ON price_alerts(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_price_alerts_symbol ON price_alerts(symbol)',
      'CREATE INDEX IF NOT EXISTS idx_price_alerts_active ON price_alerts(is_active)',
      'CREATE INDEX IF NOT EXISTS idx_alert_history_alert ON alert_history(alert_id)',
      'CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_companies_symbol ON companies(symbol)'
    ];

    for (const index of indexes) {
      await this.query(index);
    }

    console.log('Database tables and indexes created successfully');
  }

  async seedData(): Promise<void> {
    // Insert sample companies
    const sampleCompanies = [
      ['AAPL', 'Apple Inc.', 'Technology', 'Consumer Electronics', 3000000000000, 175.50, 2.30, 1.33, 50000000],
      ['MSFT', 'Microsoft Corporation', 'Technology', 'Software', 2800000000000, 378.85, -1.15, -0.30, 25000000],
      ['GOOGL', 'Alphabet Inc.', 'Technology', 'Internet Content & Information', 1700000000000, 138.21, 0.85, 0.62, 28000000],
      ['TSLA', 'Tesla, Inc.', 'Consumer Cyclical', 'Auto Manufacturers', 800000000000, 248.50, 5.20, 2.14, 85000000],
      ['7203', 'トヨタ自動車', 'Consumer Cyclical', 'Auto Manufacturers', 25000000000000, 2850, 15, 0.53, 12000000],
      ['6758', 'ソニーグループ', 'Technology', 'Consumer Electronics', 12000000000000, 12450, -85, -0.68, 8500000],
      ['9984', 'ソフトバンクグループ', 'Technology', 'Telecom Services', 8000000000000, 5890, 45, 0.77, 15000000]
    ];

    for (const company of sampleCompanies) {
      try {
        await this.query(
          'INSERT OR IGNORE INTO companies (symbol, name, sector, industry, market_cap, current_price, price_change, change_percentage, volume) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          company
        );
      } catch (error) {
        console.warn(`Failed to insert company ${company[0]}:`, error);
      }
    }

    // Insert sample price data
    const today = new Date();
    const symbols = ['AAPL', 'MSFT', 'GOOGL', 'TSLA', '7203', '6758', '9984'];
    
    for (const symbol of symbols) {
      for (let i = 0; i < 100; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        
        const basePrice = symbol === '7203' ? 2850 : symbol === '6758' ? 12450 : symbol === '9984' ? 5890 : 150;
        const volatility = 0.02;
        const randomChange = (Math.random() - 0.5) * volatility;
        const price = basePrice * (1 + randomChange);
        
        const open = price * (1 + (Math.random() - 0.5) * 0.01);
        const close = price * (1 + (Math.random() - 0.5) * 0.01);
        const high = Math.max(open, close) * (1 + Math.random() * 0.02);
        const low = Math.min(open, close) * (1 - Math.random() * 0.02);
        const volume = Math.floor(Math.random() * 50000000) + 10000000;

        try {
          await this.query(
            'INSERT OR IGNORE INTO stock_prices (symbol, date, open_price, high_price, low_price, close_price, volume, adjusted_close) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [symbol, date.toISOString().split('T')[0], open, high, low, close, volume, close]
          );
        } catch (error) {
          console.warn(`Failed to insert price data for ${symbol} on ${date}:`, error);
        }
      }
    }

    console.log('Sample data seeded successfully');
  }
}

// Singleton instance
export const sqliteDb = new SQLiteDatabase();