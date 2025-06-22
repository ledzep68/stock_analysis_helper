import { sqliteDb } from '../config/sqlite';
import { validateSymbol, createSecureApiResponse } from '../utils/security';

export interface UserFavorite {
  id: string;
  userId: string;
  symbol: string;
  companyName?: string;
  industry?: string;
  sector?: string;
  addedAt: Date;
  notes?: string;
  priceAlertEnabled: boolean;
  targetPrice?: number;
  alertType?: 'above' | 'below' | 'change';
}

export interface AddFavoriteRequest {
  userId: string;
  symbol: string;
  notes?: string;
  priceAlertEnabled?: boolean;
  targetPrice?: number;
  alertType?: 'above' | 'below' | 'change';
}

export class FavoritesService {
  
  async addFavorite(request: AddFavoriteRequest): Promise<UserFavorite | null> {
    try {
      // Validate symbol
      const validSymbol = validateSymbol(request.symbol);
      if (!validSymbol) {
        throw new Error('Invalid symbol format');
      }

      // Validate target price if provided
      if (request.targetPrice !== undefined && (request.targetPrice <= 0 || !isFinite(request.targetPrice))) {
        throw new Error('Invalid target price');
      }

      // Validate alert type if provided
      if (request.alertType && !['above', 'below', 'change'].includes(request.alertType)) {
        throw new Error('Invalid alert type');
      }

      // Check if company exists
      const companyExists = await this.checkCompanyExists(validSymbol);
      if (!companyExists) {
        throw new Error('Company not found');
      }

      const insertQuery = `
        INSERT OR REPLACE INTO favorites (
          user_id, symbol, notes, price_alert_enabled, target_price, alert_type
        )
        VALUES (?, ?, ?, ?, ?, ?)
      `;

      const values = [
        request.userId,
        validSymbol,
        request.notes || null,
        request.priceAlertEnabled ? 1 : 0,
        request.targetPrice || null,
        request.alertType || null
      ];

      const result = await sqliteDb.query(insertQuery, values);
      
      // Get the inserted/updated favorite
      const selectQuery = 'SELECT * FROM favorites WHERE user_id = ? AND symbol = ?';
      const favoriteResult = await sqliteDb.query(selectQuery, [request.userId, validSymbol]);
      const favorite = favoriteResult.rows[0];
      
      if (!favorite) {
        return null;
      }

      return this.mapRowToFavorite(favorite);
      
    } catch (error) {
      console.error('Error adding favorite:', error);
      throw error;
    }
  }

  async removeFavorite(userId: string, symbol: string): Promise<boolean> {
    try {
      const validSymbol = validateSymbol(symbol);
      if (!validSymbol) {
        throw new Error('Invalid symbol format');
      }

      const deleteQuery = `
        DELETE FROM favorites 
        WHERE user_id = ? AND symbol = ?
      `;

      const result = await sqliteDb.query(deleteQuery, [userId, validSymbol]);
      return result.rowCount > 0;
      
    } catch (error) {
      console.error('Error removing favorite:', error);
      throw error;
    }
  }

  async getUserFavorites(userId: string): Promise<UserFavorite[]> {
    try {
      const query = `
        SELECT 
          f.*,
          c.name as company_name,
          c.industry,
          c.sector
        FROM favorites f
        LEFT JOIN companies c ON f.symbol = c.symbol
        WHERE f.user_id = ?
        ORDER BY f.created_at DESC
      `;

      const result = await sqliteDb.query(query, [userId]);
      const favorites = result.rows || [];
      return favorites.map(this.mapRowToFavorite);
      
    } catch (error) {
      console.error('Error getting user favorites:', error);
      throw error;
    }
  }

  async getFavoriteDetails(userId: string, symbol: string): Promise<UserFavorite | null> {
    try {
      const validSymbol = validateSymbol(symbol);
      if (!validSymbol) {
        throw new Error('Invalid symbol format');
      }

      const query = `
        SELECT 
          f.*,
          c.name as company_name,
          c.industry,
          c.sector
        FROM favorites f
        JOIN companies c ON f.symbol = c.symbol
        WHERE f.user_id = ? AND f.symbol = ?
      `;

      const result = await sqliteDb.query(query, [userId, validSymbol]);
      const favorite = result.rows[0];
      
      if (!favorite) {
        return null;
      }

      return this.mapRowToFavorite(favorite);
      
    } catch (error) {
      console.error('Error getting favorite details:', error);
      throw error;
    }
  }

  async updateFavoriteNotes(userId: string, symbol: string, notes: string): Promise<boolean> {
    try {
      const validSymbol = validateSymbol(symbol);
      if (!validSymbol) {
        throw new Error('Invalid symbol format');
      }

      // Validate notes length
      if (notes.length > 1000) {
        throw new Error('Notes too long');
      }

      const updateQuery = `
        UPDATE favorites 
        SET notes = ?, updated_at = datetime('now')
        WHERE user_id = ? AND symbol = ?
      `;

      const result = await sqliteDb.query(updateQuery, [notes, userId, validSymbol]);
      return result.rowCount > 0;
      
    } catch (error) {
      console.error('Error updating favorite notes:', error);
      throw error;
    }
  }

  async updatePriceAlert(
    userId: string, 
    symbol: string, 
    enabled: boolean, 
    targetPrice?: number, 
    alertType?: 'above' | 'below' | 'change'
  ): Promise<boolean> {
    try {
      const validSymbol = validateSymbol(symbol);
      if (!validSymbol) {
        throw new Error('Invalid symbol format');
      }

      if (enabled) {
        if (!targetPrice || targetPrice <= 0 || !isFinite(targetPrice)) {
          throw new Error('Valid target price required when enabling alerts');
        }
        if (!alertType || !['above', 'below', 'change'].includes(alertType)) {
          throw new Error('Valid alert type required when enabling alerts');
        }
      }

      const updateQuery = `
        UPDATE favorites 
        SET 
          price_alert_enabled = ?,
          target_price = ?,
          alert_type = ?,
          updated_at = datetime('now')
        WHERE user_id = ? AND symbol = ?
      `;

      const values = [
        enabled ? 1 : 0,
        enabled ? targetPrice : null,
        enabled ? alertType : null,
        userId,
        validSymbol
      ];

      const result = await sqliteDb.query(updateQuery, values);
      return result.rowCount > 0;
      
    } catch (error) {
      console.error('Error updating price alert:', error);
      throw error;
    }
  }

  private async checkCompanyExists(symbol: string): Promise<boolean> {
    try {
      const query = 'SELECT 1 FROM companies WHERE symbol = ? LIMIT 1';
      const result = await sqliteDb.query(query, [symbol]);
      const company = result.rows[0];
      return !!company;
    } catch (error) {
      console.error('Error checking company existence:', error);
      return false;
    }
  }

  private mapRowToFavorite(row: any): UserFavorite {
    return {
      id: row.id,
      userId: row.user_id,
      symbol: row.symbol,
      companyName: row.company_name || `${row.symbol} (企業名取得中...)`,
      industry: row.industry,
      sector: row.sector,
      addedAt: new Date(row.created_at),
      notes: row.notes,
      priceAlertEnabled: !!row.price_alert_enabled,
      targetPrice: row.target_price,
      alertType: row.alert_type
    };
  }
}

export const favoritesService = new FavoritesService();