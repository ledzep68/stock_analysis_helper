import { sqliteDb } from '../src/config/sqlite';

interface CompanyData {
  symbol: string;
  name: string;
  sector: string;
  industry: string;
  marketCap: number;
  currentPrice: number;
  priceChange: number;
  changePercentage: number;
  volume: number;
  eps?: number;
  dividendYield?: number;
}

async function seedExtendedData() {
  try {
    await sqliteDb.connect();
    console.log('Connected to SQLite database');

    // Extended company data
    const companies: CompanyData[] = [
      // US Tech Giants
      { symbol: 'AAPL', name: 'Apple Inc.', sector: 'Technology', industry: 'Consumer Electronics', marketCap: 3000000000000, currentPrice: 175.50, priceChange: 2.30, changePercentage: 1.33, volume: 50000000, eps: 6.05, dividendYield: 0.5 },
      { symbol: 'MSFT', name: 'Microsoft Corporation', sector: 'Technology', industry: 'Software', marketCap: 2800000000000, currentPrice: 378.85, priceChange: -1.15, changePercentage: -0.30, volume: 25000000, eps: 11.48, dividendYield: 0.7 },
      { symbol: 'GOOGL', name: 'Alphabet Inc.', sector: 'Technology', industry: 'Internet Content', marketCap: 1700000000000, currentPrice: 138.21, priceChange: 0.85, changePercentage: 0.62, volume: 28000000, eps: 5.84, dividendYield: 0 },
      { symbol: 'AMZN', name: 'Amazon.com Inc.', sector: 'Consumer Cyclical', industry: 'E-Commerce', marketCap: 1600000000000, currentPrice: 155.33, priceChange: 2.45, changePercentage: 1.60, volume: 45000000, eps: 2.90, dividendYield: 0 },
      { symbol: 'META', name: 'Meta Platforms Inc.', sector: 'Technology', industry: 'Social Media', marketCap: 900000000000, currentPrice: 352.16, priceChange: 5.20, changePercentage: 1.50, volume: 20000000, eps: 14.87, dividendYield: 0 },
      { symbol: 'TSLA', name: 'Tesla, Inc.', sector: 'Consumer Cyclical', industry: 'Auto Manufacturers', marketCap: 800000000000, currentPrice: 248.50, priceChange: 5.20, changePercentage: 2.14, volume: 85000000, eps: 3.62, dividendYield: 0 },
      { symbol: 'NVDA', name: 'NVIDIA Corporation', sector: 'Technology', industry: 'Semiconductors', marketCap: 1100000000000, currentPrice: 445.87, priceChange: 8.45, changePercentage: 1.93, volume: 40000000, eps: 1.19, dividendYield: 0.03 },
      
      // Japanese Major Companies
      { symbol: '7203', name: 'トヨタ自動車', sector: 'Consumer Cyclical', industry: 'Auto Manufacturers', marketCap: 35000000000000, currentPrice: 2850, priceChange: 15, changePercentage: 0.53, volume: 12000000, eps: 245.5, dividendYield: 2.3 },
      { symbol: '6758', name: 'ソニーグループ', sector: 'Technology', industry: 'Consumer Electronics', marketCap: 15000000000000, currentPrice: 12450, priceChange: -85, changePercentage: -0.68, volume: 8500000, eps: 623.4, dividendYield: 0.6 },
      { symbol: '9984', name: 'ソフトバンクグループ', sector: 'Technology', industry: 'Telecom Services', marketCap: 9000000000000, currentPrice: 5890, priceChange: 45, changePercentage: 0.77, volume: 15000000, eps: -285.2, dividendYield: 0.7 },
      { symbol: '8306', name: '三菱UFJフィナンシャル・グループ', sector: 'Financial', industry: 'Banks', marketCap: 14000000000000, currentPrice: 1156, priceChange: 12, changePercentage: 1.05, volume: 25000000, eps: 89.7, dividendYield: 3.2 },
      { symbol: '6861', name: 'キーエンス', sector: 'Technology', industry: 'Scientific Instruments', marketCap: 16000000000000, currentPrice: 65890, priceChange: -320, changePercentage: -0.48, volume: 500000, eps: 1456.3, dividendYield: 0.2 },
      { symbol: '4063', name: '信越化学工業', sector: 'Basic Materials', industry: 'Chemicals', marketCap: 8000000000000, currentPrice: 5543, priceChange: 78, changePercentage: 1.43, volume: 2500000, eps: 456.2, dividendYield: 2.0 },
      { symbol: '9983', name: 'ファーストリテイリング', sector: 'Consumer Cyclical', industry: 'Apparel Retail', marketCap: 10000000000000, currentPrice: 38950, priceChange: 250, changePercentage: 0.65, volume: 800000, eps: 1589.3, dividendYield: 1.1 },
      { symbol: '7974', name: '任天堂', sector: 'Communication Services', industry: 'Electronic Gaming', marketCap: 9500000000000, currentPrice: 7256, priceChange: -45, changePercentage: -0.62, volume: 3000000, eps: 389.5, dividendYield: 2.5 },
      
      // Additional Japanese companies
      { symbol: '6501', name: '日立製作所', sector: 'Industrials', industry: 'Diversified Industrials', marketCap: 10500000000000, currentPrice: 10850, priceChange: 125, changePercentage: 1.17, volume: 5000000, eps: 712.5, dividendYield: 1.4 },
      { symbol: '8267', name: 'イオン', sector: 'Consumer Defensive', industry: 'Retail', marketCap: 3000000000000, currentPrice: 3545, priceChange: -28, changePercentage: -0.78, volume: 4500000, eps: 125.8, dividendYield: 1.0 },
      { symbol: '2914', name: 'JT（日本たばこ産業）', sector: 'Consumer Defensive', industry: 'Tobacco', marketCap: 7500000000000, currentPrice: 3890, priceChange: 35, changePercentage: 0.91, volume: 6000000, eps: 234.5, dividendYield: 4.8 },
      { symbol: '9432', name: '日本電信電話（NTT）', sector: 'Communication Services', industry: 'Telecom Services', marketCap: 15500000000000, currentPrice: 178.2, priceChange: 1.5, changePercentage: 0.85, volume: 18000000, eps: 12.3, dividendYield: 3.0 },
      { symbol: '9433', name: 'KDDI', sector: 'Communication Services', industry: 'Telecom Services', marketCap: 10000000000000, currentPrice: 4523, priceChange: -15, changePercentage: -0.33, volume: 5500000, eps: 289.7, dividendYield: 3.2 },
      
      // US Financial
      { symbol: 'JPM', name: 'JPMorgan Chase & Co.', sector: 'Financial', industry: 'Banks', marketCap: 500000000000, currentPrice: 165.35, priceChange: 1.85, changePercentage: 1.13, volume: 12000000, eps: 15.88, dividendYield: 2.4 },
      { symbol: 'BAC', name: 'Bank of America Corp', sector: 'Financial', industry: 'Banks', marketCap: 300000000000, currentPrice: 37.85, priceChange: 0.45, changePercentage: 1.20, volume: 35000000, eps: 3.19, dividendYield: 2.3 },
      { symbol: 'V', name: 'Visa Inc.', sector: 'Financial', industry: 'Payment Processing', marketCap: 550000000000, currentPrice: 265.43, priceChange: 3.20, changePercentage: 1.22, volume: 8000000, eps: 8.28, dividendYield: 0.7 },
      
      // Healthcare
      { symbol: 'JNJ', name: 'Johnson & Johnson', sector: 'Healthcare', industry: 'Pharmaceuticals', marketCap: 450000000000, currentPrice: 172.26, priceChange: -0.85, changePercentage: -0.49, volume: 7500000, eps: 10.37, dividendYield: 2.7 },
      { symbol: 'PFE', name: 'Pfizer Inc.', sector: 'Healthcare', industry: 'Pharmaceuticals', marketCap: 280000000000, currentPrice: 49.38, priceChange: 0.28, changePercentage: 0.57, volume: 25000000, eps: 3.85, dividendYield: 3.2 },
      { symbol: 'UNH', name: 'UnitedHealth Group', sector: 'Healthcare', industry: 'Health Insurance', marketCap: 520000000000, currentPrice: 545.87, priceChange: 4.65, changePercentage: 0.86, volume: 3500000, eps: 23.86, dividendYield: 1.2 }
    ];

    // Insert or update companies
    for (const company of companies) {
      try {
        await sqliteDb.query(
          `INSERT OR REPLACE INTO companies 
           (symbol, name, sector, industry, market_cap, current_price, price_change, change_percentage, volume) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            company.symbol,
            company.name,
            company.sector,
            company.industry,
            company.marketCap,
            company.currentPrice,
            company.priceChange,
            company.changePercentage,
            company.volume
          ]
        );
        console.log(`Inserted/Updated company: ${company.symbol} - ${company.name}`);
      } catch (error) {
        console.error(`Failed to insert company ${company.symbol}:`, error);
      }
    }

    // Generate extended price history (180 days)
    const today = new Date();
    
    for (const company of companies) {
      console.log(`Generating 180-day price history for ${company.symbol}...`);
      
      for (let i = 0; i < 180; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        
        // Generate realistic price movements
        const dayChange = (Math.random() - 0.5) * 0.04; // ±2% daily change
        const basePrice = company.currentPrice * (1 + dayChange * (i / 30)); // Gradual trend
        
        const open = basePrice * (1 + (Math.random() - 0.5) * 0.02);
        const close = basePrice * (1 + (Math.random() - 0.5) * 0.02);
        const high = Math.max(open, close) * (1 + Math.random() * 0.01);
        const low = Math.min(open, close) * (1 - Math.random() * 0.01);
        const volume = company.volume * (0.8 + Math.random() * 0.4); // 80%-120% of average

        try {
          await sqliteDb.query(
            `INSERT OR IGNORE INTO stock_prices 
             (symbol, date, open_price, high_price, low_price, close_price, volume, adjusted_close) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              company.symbol,
              date.toISOString().split('T')[0],
              Math.round(open * 100) / 100,
              Math.round(high * 100) / 100,
              Math.round(low * 100) / 100,
              Math.round(close * 100) / 100,
              Math.floor(volume),
              Math.round(close * 100) / 100
            ]
          );
        } catch (error) {
          console.warn(`Failed to insert price data for ${company.symbol} on ${date}:`, error);
        }
      }
    }

    console.log('Extended data seeding completed successfully!');
    
    // Verify data
    const countResult = await sqliteDb.query('SELECT COUNT(*) as count FROM companies');
    console.log(`Total companies in database: ${countResult.rows[0].count}`);
    
    const priceCountResult = await sqliteDb.query('SELECT COUNT(*) as count FROM stock_prices');
    console.log(`Total price records in database: ${priceCountResult.rows[0].count}`);
    
  } catch (error) {
    console.error('Error seeding extended data:', error);
  } finally {
    await sqliteDb.close();
  }
}

// Run the seeding
seedExtendedData().catch(console.error);