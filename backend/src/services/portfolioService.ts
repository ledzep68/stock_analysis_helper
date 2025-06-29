import { db } from '../config/database';
import { APP_CONSTANTS } from '../utils/constants';
import { DatabaseHelper } from '../utils/database.helper';
import { ErrorHandler } from '../utils/error.handler';
import { PortfolioRefactoring } from '../utils/refactoring.helper';

export interface Portfolio {
  id: string;
  userId: string;
  name: string;
  description?: string;
  initialCapital: number;
  currency: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PortfolioHolding {
  id: string;
  portfolioId: string;
  symbol: string;
  companyName?: string;
  quantity: number;
  averageCost: number;
  purchaseDate: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PortfolioTransaction {
  id: string;
  portfolioId: string;
  symbol: string;
  transactionType: 'BUY' | 'SELL' | 'DIVIDEND';
  quantity: number;
  price: number;
  totalAmount: number;
  fees: number;
  transactionDate: Date;
  notes?: string;
  createdAt: Date;
}

export interface PortfolioSummary {
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

class PortfolioService {
  /**
   * ユーザーのポートフォリオ一覧取得
   */
  async getPortfoliosByUser(userId: string): Promise<Portfolio[]> {
    try {
      const rows = await db.all(`
        SELECT * FROM portfolios 
        WHERE user_id = ? AND is_active = true
        ORDER BY created_at DESC
      `, [userId]);

      return rows.map(this.mapRowToPortfolio);
    } catch (error) {
      ErrorHandler.logError('Get portfolios by user', error);
      throw error;
    }
  }

  /**
   * ポートフォリオ詳細取得
   */
  async getPortfolioById(portfolioId: string, userId: string): Promise<Portfolio | null> {
    try {
      const row = await db.get(`
        SELECT * FROM portfolios 
        WHERE id = ? AND user_id = ? AND is_active = true
      `, [portfolioId, userId]);

      return row ? this.mapRowToPortfolio(row) : null;
    } catch (error) {
      ErrorHandler.logError('Get portfolio by ID', error);
      throw error;
    }
  }

  /**
   * ポートフォリオ作成
   */
  async createPortfolio(
    userId: string,
    name: string,
    description?: string,
    initialCapital: number = 1000000,
    currency: string = 'JPY'
  ): Promise<Portfolio> {
    try {
      // リファクタリング済みバリデーション
      PortfolioRefactoring.validatePortfolioData({ name, initialCapital, currency });

      const portfolioId = PortfolioRefactoring.generateUniqueId('portfolio');
      const now = PortfolioRefactoring.formatDate(new Date());

      await db.run(`
        INSERT INTO portfolios (
          id, user_id, name, description, initial_capital, currency, 
          is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        portfolioId,
        userId,
        name.trim(),
        description?.trim() || null,
        initialCapital,
        currency,
        true,
        now,
        now
      ]);

      const portfolio = await this.getPortfolioById(portfolioId, userId);
      if (!portfolio) {
        throw new Error('Failed to create portfolio');
      }

      console.log(`📁 Portfolio created: ${name} (${portfolioId})`);
      return portfolio;
    } catch (error) {
      ErrorHandler.logError('Create portfolio', error);
      throw error;
    }
  }

  /**
   * ポートフォリオ更新
   */
  async updatePortfolio(
    portfolioId: string,
    userId: string,
    updates: Partial<Pick<Portfolio, 'name' | 'description'>>
  ): Promise<Portfolio | null> {
    try {
      const updateFields = [];
      const values = [];

      if (updates.name !== undefined) {
        updateFields.push('name = ?');
        values.push(updates.name);
      }

      if (updates.description !== undefined) {
        updateFields.push('description = ?');
        values.push(updates.description);
      }

      if (updateFields.length === 0) {
        const existing = await this.getPortfolioById(portfolioId, userId);
        return existing;
      }

      updateFields.push('updated_at = ?');
      values.push(new Date().toISOString());
      values.push(portfolioId, userId);

      await db.run(`
        UPDATE portfolios 
        SET ${updateFields.join(', ')}
        WHERE id = ? AND user_id = ? AND is_active = true
      `, values);

      return await this.getPortfolioById(portfolioId, userId);
    } catch (error) {
      ErrorHandler.logError('Update portfolio', error);
      throw error;
    }
  }

  /**
   * ポートフォリオ削除
   */
  async deletePortfolio(portfolioId: string, userId: string): Promise<boolean> {
    try {
      const result = await db.run(`
        UPDATE portfolios 
        SET is_active = false, updated_at = ?
        WHERE id = ? AND user_id = ? AND is_active = true
      `, [new Date().toISOString(), portfolioId, userId]);

      const success = result.changes > 0;
      if (success) {
        console.log(`🗑️ Portfolio deleted: ${portfolioId}`);
      }
      return success;
    } catch (error) {
      ErrorHandler.logError('Delete portfolio', error);
      throw error;
    }
  }

  /**
   * ポートフォリオ保有銘柄取得
   */
  async getPortfolioHoldings(portfolioId: string, userId: string): Promise<PortfolioHolding[]> {
    try {
      // ポートフォリオの存在確認
      const portfolio = await this.getPortfolioById(portfolioId, userId);
      if (!portfolio) {
        throw new Error('Portfolio not found');
      }

      const rows = await db.all(`
        SELECT * FROM portfolio_holdings 
        WHERE portfolio_id = ?
        ORDER BY created_at DESC
      `, [portfolioId]);

      // 保有銘柄に企業名を追加
      const holdingsWithCompanyNames = await Promise.all(
        rows.map(async (row) => {
          const holding = this.mapRowToHolding(row);
          holding.companyName = await this.getCompanyName(holding.symbol);
          return holding;
        })
      );

      return holdingsWithCompanyNames;
    } catch (error) {
      ErrorHandler.logError('Get portfolio holdings', error);
      throw error;
    }
  }

  /**
   * 銘柄取引追加
   */
  async addTransaction(
    portfolioId: string,
    userId: string,
    transaction: Omit<PortfolioTransaction, 'id' | 'portfolioId' | 'createdAt'>
  ): Promise<PortfolioTransaction> {
    try {
      // リファクタリング済みバリデーション
      PortfolioRefactoring.validateTransactionData({
        transactionType: transaction.transactionType,
        quantity: transaction.quantity,
        price: transaction.price,
        symbol: transaction.symbol
      });

      // ポートフォリオの存在確認
      const portfolio = await this.getPortfolioById(portfolioId, userId);
      if (!portfolio) {
        throw new Error('Portfolio not found');
      }

      return await DatabaseHelper.runTransaction(async () => {
        const transactionId = PortfolioRefactoring.generateUniqueId('transaction');
        const now = PortfolioRefactoring.formatDate(new Date());

        // 取引履歴追加
        await db.run(`
          INSERT INTO portfolio_transactions (
            id, portfolio_id, symbol, transaction_type, quantity, price,
            total_amount, fees, transaction_date, notes, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          transactionId,
          portfolioId,
          transaction.symbol,
          transaction.transactionType,
          transaction.quantity,
          transaction.price,
          transaction.totalAmount,
          transaction.fees,
          DatabaseHelper.formatDate(transaction.transactionDate),
          transaction.notes || null,
          now
        ]);

        // 保有銘柄更新
        await this.updateHoldings(portfolioId, transaction);

        const newTransaction: PortfolioTransaction = {
          id: transactionId,
          portfolioId,
          createdAt: new Date(),
          ...transaction
        };

        console.log(`💰 Transaction added: ${transaction.transactionType} ${transaction.quantity} ${transaction.symbol}`);
        return newTransaction;
      });
    } catch (error) {
      ErrorHandler.logError('Add transaction', error);
      throw error;
    }
  }

  /**
   * ポートフォリオサマリー取得
   */
  async getPortfolioSummary(portfolioId: string, userId: string): Promise<PortfolioSummary> {
    try {
      const portfolio = await this.getPortfolioById(portfolioId, userId);
      if (!portfolio) {
        throw new Error('Portfolio not found');
      }

      const holdings = await this.getPortfolioHoldings(portfolioId, userId);
      
      // 保有銘柄が空の場合の処理
      if (holdings.length === 0) {
        return {
          portfolio,
          totalValue: 0,
          totalCost: 0,
          unrealizedPnL: 0,
          realizedPnL: 0,
          totalReturn: 0,
          totalReturnPercent: 0,
          holdingsCount: 0,
          topHoldings: []
        };
      }
      
      // 現在価格取得（リアルタイム価格サービスから）
      const enrichedHoldings = await Promise.all(
        holdings.map(async (holding) => {
          const currentPrice = await this.getCurrentPrice(holding.symbol);
          const currentValue = holding.quantity * currentPrice;
          const costBasis = holding.quantity * holding.averageCost;

          return {
            ...holding,
            currentPrice,
            currentValue,
            costBasis,
            unrealizedPnL: currentValue - costBasis,
            unrealizedPnLPercent: costBasis > 0 ? ((currentValue - costBasis) / costBasis) * 100 : 0
          };
        })
      );

      const totalValue = enrichedHoldings.reduce((sum, h) => sum + h.currentValue, 0);
      const totalCost = enrichedHoldings.reduce((sum, h) => sum + h.costBasis, 0);
      const unrealizedPnL = totalValue - totalCost;

      // 実現損益取得
      const realizedPnL = await this.getRealizedPnL(portfolioId);

      const topHoldings = enrichedHoldings
        .sort((a, b) => b.currentValue - a.currentValue)
        .slice(0, 10)
        .map(h => ({
          symbol: h.symbol,
          companyName: h.companyName,
          quantity: h.quantity,
          currentValue: h.currentValue,
          allocation: totalValue > 0 ? (h.currentValue / totalValue) * 100 : 0
        }));

      return {
        portfolio,
        totalValue,
        totalCost,
        unrealizedPnL,
        realizedPnL,
        totalReturn: unrealizedPnL + realizedPnL,
        totalReturnPercent: totalCost > 0 ? ((unrealizedPnL + realizedPnL) / totalCost) * 100 : 0,
        holdingsCount: holdings.length,
        topHoldings
      };
    } catch (error) {
      ErrorHandler.logError('Get portfolio summary', error);
      throw error;
    }
  }

  /**
   * 保有銘柄更新
   */
  private async updateHoldings(
    portfolioId: string,
    transaction: Omit<PortfolioTransaction, 'id' | 'portfolioId' | 'createdAt'>
  ): Promise<void> {
    if (transaction.transactionType === 'DIVIDEND') {
      return; // 配当は保有数量に影響しない
    }

    const existingHolding = await db.get(`
      SELECT * FROM portfolio_holdings 
      WHERE portfolio_id = ? AND symbol = ?
    `, [portfolioId, transaction.symbol]);

    if (transaction.transactionType === 'BUY') {
      if (existingHolding) {
        // 既存保有の平均取得価格更新
        const newQuantity = existingHolding.quantity + transaction.quantity;
        const newAverageCost = (
          (existingHolding.quantity * existingHolding.average_cost) +
          (transaction.quantity * transaction.price)
        ) / newQuantity;

        await db.run(`
          UPDATE portfolio_holdings 
          SET quantity = ?, average_cost = ?, updated_at = ?
          WHERE id = ?
        `, [newQuantity, newAverageCost, new Date().toISOString(), existingHolding.id]);
      } else {
        // 新規保有追加
        const holdingId = PortfolioRefactoring.generateUniqueId('holding');
        const now = PortfolioRefactoring.formatDate(new Date());

        await db.run(`
          INSERT INTO portfolio_holdings (
            id, portfolio_id, symbol, quantity, average_cost, 
            purchase_date, notes, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          holdingId,
          portfolioId,
          transaction.symbol,
          transaction.quantity,
          transaction.price,
          DatabaseHelper.formatDate(transaction.transactionDate),
          transaction.notes || null,
          now,
          now
        ]);
      }
    } else if (transaction.transactionType === 'SELL') {
      if (!existingHolding || existingHolding.quantity < transaction.quantity) {
        throw new Error('Insufficient quantity to sell');
      }

      const newQuantity = existingHolding.quantity - transaction.quantity;
      if (newQuantity === 0) {
        // 全量売却 - 保有削除
        await db.run(`
          DELETE FROM portfolio_holdings WHERE id = ?
        `, [existingHolding.id]);
      } else {
        // 一部売却 - 数量更新
        await db.run(`
          UPDATE portfolio_holdings 
          SET quantity = ?, updated_at = ?
          WHERE id = ?
        `, [newQuantity, new Date().toISOString(), existingHolding.id]);
      }
    }
  }

  /**
   * 現在価格取得
   */
  private async getCurrentPrice(symbol: string): Promise<number> {
    try {
      // リアルタイム価格から取得
      const priceData = await db.get(`
        SELECT price FROM real_time_prices 
        WHERE symbol = ? 
        ORDER BY timestamp DESC 
        LIMIT 1
      `, [symbol]);

      return priceData ? priceData.price : 0;
    } catch (error) {
      console.warn(`Failed to get current price for ${symbol}:`, error);
      return 0;
    }
  }

  /**
   * 実現損益取得
   */
  private async getRealizedPnL(portfolioId: string): Promise<number> {
    try {
      const result = await db.get(`
        SELECT 
          SUM(CASE 
            WHEN transaction_type = 'SELL' 
            THEN total_amount - fees
            WHEN transaction_type = 'DIVIDEND'
            THEN total_amount
            ELSE 0
          END) as total_realized
        FROM portfolio_transactions 
        WHERE portfolio_id = ?
      `, [portfolioId]);

      return result?.total_realized || 0;
    } catch (error) {
      console.warn('Failed to get realized PnL:', error);
      return 0;
    }
  }

  /**
   * データベース行をPortfolioオブジェクトにマッピング
   */
  private mapRowToPortfolio(row: any): Portfolio {
    return {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      description: row.description,
      initialCapital: row.initial_capital,
      currency: row.currency,
      isActive: Boolean(row.is_active),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  /**
   * ポートフォリオに銘柄を直接追加
   */
  async addStockToPortfolio(
    portfolioId: string,
    userId: string,
    stockData: {
      symbol: string;
      quantity: number;
      averageCost: number;
      purchaseDate?: Date;
      notes?: string;
    }
  ): Promise<PortfolioHolding> {
    try {
      // ポートフォリオの存在確認
      const portfolio = await this.getPortfolioById(portfolioId, userId);
      if (!portfolio) {
        throw new Error('Portfolio not found');
      }

      // バリデーション
      if (!stockData.symbol || stockData.quantity <= 0 || stockData.averageCost <= 0) {
        throw new Error('Invalid stock data: symbol, quantity, and averageCost are required and must be positive');
      }

      // 既存保有確認
      const existingHolding = await db.get(`
        SELECT * FROM portfolio_holdings 
        WHERE portfolio_id = ? AND symbol = ?
      `, [portfolioId, stockData.symbol.toUpperCase()]);

      if (existingHolding) {
        throw new Error(`Stock ${stockData.symbol} already exists in portfolio. Use update instead.`);
      }

      const holdingId = PortfolioRefactoring.generateUniqueId('holding');
      const now = PortfolioRefactoring.formatDate(new Date());
      const purchaseDate = stockData.purchaseDate || new Date();

      await db.run(`
        INSERT INTO portfolio_holdings (
          id, portfolio_id, symbol, quantity, average_cost, 
          purchase_date, notes, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        holdingId,
        portfolioId,
        stockData.symbol.toUpperCase(),
        stockData.quantity,
        stockData.averageCost,
        DatabaseHelper.formatDate(purchaseDate),
        stockData.notes || null,
        now,
        now
      ]);

      const newHolding = await db.get(`
        SELECT * FROM portfolio_holdings WHERE id = ?
      `, [holdingId]);

      console.log(`📈 Stock added to portfolio: ${stockData.symbol} (${stockData.quantity} shares)`);
      const holding = this.mapRowToHolding(newHolding);
      holding.companyName = await this.getCompanyName(holding.symbol);
      return holding;
    } catch (error) {
      ErrorHandler.logError('Add stock to portfolio', error);
      throw error;
    }
  }

  /**
   * ポートフォリオから銘柄を直接削除
   */
  async removeStockFromPortfolio(
    portfolioId: string,
    userId: string,
    symbol: string
  ): Promise<boolean> {
    try {
      // ポートフォリオの存在確認
      const portfolio = await this.getPortfolioById(portfolioId, userId);
      if (!portfolio) {
        throw new Error('Portfolio not found');
      }

      // 保有銘柄の存在確認
      const holding = await db.get(`
        SELECT * FROM portfolio_holdings 
        WHERE portfolio_id = ? AND symbol = ?
      `, [portfolioId, symbol.toUpperCase()]);

      if (!holding) {
        throw new Error(`Stock ${symbol} not found in portfolio`);
      }

      await db.run(`
        DELETE FROM portfolio_holdings 
        WHERE portfolio_id = ? AND symbol = ?
      `, [portfolioId, symbol.toUpperCase()]);

      const success = true;
      if (success) {
        console.log(`📉 Stock removed from portfolio: ${symbol}`);
      }
      return success;
    } catch (error) {
      ErrorHandler.logError('Remove stock from portfolio', error);
      throw error;
    }
  }

  /**
   * 保有銘柄の数量・価格を直接更新
   */
  async updateStockHolding(
    portfolioId: string,
    userId: string,
    symbol: string,
    updates: {
      quantity?: number;
      averageCost?: number;
      notes?: string;
    }
  ): Promise<PortfolioHolding | null> {
    try {
      // ポートフォリオの存在確認
      const portfolio = await this.getPortfolioById(portfolioId, userId);
      if (!portfolio) {
        throw new Error('Portfolio not found');
      }

      // 保有銘柄の存在確認
      const holding = await db.get(`
        SELECT * FROM portfolio_holdings 
        WHERE portfolio_id = ? AND symbol = ?
      `, [portfolioId, symbol.toUpperCase()]);

      if (!holding) {
        throw new Error(`Stock ${symbol} not found in portfolio`);
      }

      const updateFields = [];
      const values = [];

      if (updates.quantity !== undefined) {
        if (updates.quantity <= 0) {
          throw new Error('Quantity must be positive');
        }
        updateFields.push('quantity = ?');
        values.push(updates.quantity);
      }

      if (updates.averageCost !== undefined) {
        if (updates.averageCost <= 0) {
          throw new Error('Average cost must be positive');
        }
        updateFields.push('average_cost = ?');
        values.push(updates.averageCost);
      }

      if (updates.notes !== undefined) {
        updateFields.push('notes = ?');
        values.push(updates.notes);
      }

      if (updateFields.length === 0) {
        return this.mapRowToHolding(holding);
      }

      updateFields.push('updated_at = ?');
      values.push(new Date().toISOString());
      values.push(holding.id);

      await db.run(`
        UPDATE portfolio_holdings 
        SET ${updateFields.join(', ')}
        WHERE id = ?
      `, values);

      const updatedHolding = await db.get(`
        SELECT * FROM portfolio_holdings WHERE id = ?
      `, [holding.id]);

      console.log(`📊 Stock holding updated: ${symbol}`);
      const updatedHoldingObject = this.mapRowToHolding(updatedHolding);
      updatedHoldingObject.companyName = await this.getCompanyName(updatedHoldingObject.symbol);
      return updatedHoldingObject;
    } catch (error) {
      ErrorHandler.logError('Update stock holding', error);
      throw error;
    }
  }

  /**
   * 企業検索（銘柄コードまたは企業名）
   */
  async searchCompanies(query: string): Promise<Array<{symbol: string; name: string}>> {
    try {
      const searchTerm = query.trim().toUpperCase();
      
      // まずcompaniesテーブルから検索
      const results = await db.all(`
        SELECT symbol, name FROM companies 
        WHERE UPPER(symbol) LIKE ? OR UPPER(name) LIKE ?
        LIMIT 20
      `, [`%${searchTerm}%`, `%${searchTerm}%`]);

      // データベースに結果がない場合、内蔵マッピングから検索
      if (results.length === 0) {
        const companyNameMap: { [key: string]: string } = {
          '7203': 'トヨタ自動車',
          '9984': 'ソフトバンクグループ',
          '6758': 'ソニーグループ',
          '4689': 'Zホールディングス',
          '8306': '三菱UFJフィナンシャル・グループ',
          '9433': 'KDDI',
          '7267': 'ホンダ',
          '6861': 'キーエンス',
          '9432': '日本電信電話',
          '8035': '東京エレクトロン',
          'AAPL': 'Apple Inc.',
          'GOOGL': 'Alphabet Inc.',
          'MSFT': 'Microsoft Corporation',
          'TSLA': 'Tesla, Inc.',
          'AMZN': 'Amazon.com, Inc.'
        };

        const filteredResults = Object.entries(companyNameMap)
          .filter(([symbol, name]) => 
            symbol.includes(searchTerm) || 
            name.toUpperCase().includes(searchTerm)
          )
          .map(([symbol, name]) => ({ symbol, name }));

        return filteredResults;
      }

      return results.map((row: any) => ({
        symbol: row.symbol,
        name: row.name
      }));
    } catch (error) {
      console.warn(`Failed to search companies for "${query}":`, error);
      return [];
    }
  }

  /**
   * 企業名取得
   */
  private async getCompanyName(symbol: string): Promise<string> {
    try {
      // まずcompaniesテーブルから取得を試みる
      const company = await db.get(`
        SELECT name FROM companies 
        WHERE symbol = ?
      `, [symbol]);

      if (company) {
        return company.name;
      }

      // なければ、簡易的な企業名マッピングを使用
      const companyNameMap: { [key: string]: string } = {
        '7203': 'トヨタ自動車',
        '9984': 'ソフトバンクグループ',
        '6758': 'ソニーグループ',
        '4689': 'Zホールディングス',
        '8306': '三菱UFJフィナンシャル・グループ',
        '9433': 'KDDI',
        '7267': 'ホンダ',
        '6861': 'キーエンス',
        '9432': '日本電信電話',
        '8035': '東京エレクトロン',
        'AAPL': 'Apple Inc.',
        'GOOGL': 'Alphabet Inc.',
        'MSFT': 'Microsoft Corporation',
        'TSLA': 'Tesla, Inc.',
        'AMZN': 'Amazon.com, Inc.'
      };

      return companyNameMap[symbol] || symbol;
    } catch (error) {
      console.warn(`Failed to get company name for ${symbol}:`, error);
      return symbol;
    }
  }

  /**
   * データベース行をPortfolioHoldingオブジェクトにマッピング
   */
  private mapRowToHolding(row: any): PortfolioHolding {
    return {
      id: row.id,
      portfolioId: row.portfolio_id,
      symbol: row.symbol,
      quantity: row.quantity,
      averageCost: row.average_cost,
      purchaseDate: new Date(row.purchase_date),
      notes: row.notes,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }
}

export const portfolioService = new PortfolioService();