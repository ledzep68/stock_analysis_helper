import db from '../config/database';
import { createSecureApiResponse, sanitizeObject } from '../utils/security';

export interface UserSettings {
  userId: string;
  preferences: {
    displayCurrency: 'USD' | 'JPY' | 'EUR';
    language: 'ja' | 'en';
    theme: 'light' | 'dark' | 'auto';
    dateFormat: 'YYYY-MM-DD' | 'MM/DD/YYYY' | 'DD/MM/YYYY';
    timeZone: string;
    numberFormat: 'comma' | 'space' | 'period';
    decimalPlaces: number;
  };
  notifications: {
    priceAlerts: boolean;
    newsUpdates: boolean;
    weeklyReports: boolean;
    emailNotifications: boolean;
    pushNotifications: boolean;
    alertFrequency: 'immediate' | 'daily' | 'weekly';
  };
  dashboard: {
    defaultView: 'overview' | 'favorites' | 'analysis';
    chartsDefaultPeriod: '1D' | '1W' | '1M' | '3M' | '6M' | '1Y' | '5Y';
    showAdvancedMetrics: boolean;
    favoriteMetrics: string[];
    layoutPreferences: {
      compactMode: boolean;
      showSidebar: boolean;
      gridDensity: 'comfortable' | 'compact' | 'spacious';
    };
  };
  analysis: {
    defaultAnalysisType: 'basic' | 'detailed' | 'professional';
    includeIndustryComparison: boolean;
    includeDCFAnalysis: boolean;
    riskTolerance: 'conservative' | 'moderate' | 'aggressive';
    investmentHorizon: 'short' | 'medium' | 'long';
    preferredAnalysisMetrics: string[];
  };
  privacy: {
    shareAnalytics: boolean;
    allowTracking: boolean;
    dataRetentionDays: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateSettingsRequest {
  preferences?: Partial<UserSettings['preferences']>;
  notifications?: Partial<UserSettings['notifications']>;
  dashboard?: Partial<UserSettings['dashboard']>;
  analysis?: Partial<UserSettings['analysis']>;
  privacy?: Partial<UserSettings['privacy']>;
}

export class UserSettingsService {

  async getUserSettings(userId: string): Promise<UserSettings | null> {
    try {
      const query = `
        SELECT settings, created_at, updated_at
        FROM user_settings
        WHERE user_id = $1
      `;

      const result = await db.query(query, [userId]);
      
      if (result.rows.length === 0) {
        // Return default settings if none exist
        return this.createDefaultSettings(userId);
      }

      const row = result.rows[0];
      const settings = row.settings;

      return {
        userId,
        preferences: settings.preferences || this.getDefaultPreferences(),
        notifications: settings.notifications || this.getDefaultNotifications(),
        dashboard: settings.dashboard || this.getDefaultDashboard(),
        analysis: settings.analysis || this.getDefaultAnalysis(),
        privacy: settings.privacy || this.getDefaultPrivacy(),
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at)
      };

    } catch (error) {
      console.error('Error getting user settings:', error);
      throw error;
    }
  }

  async updateUserSettings(userId: string, updates: UpdateSettingsRequest): Promise<UserSettings | null> {
    try {
      // Get current settings
      const currentSettings = await this.getUserSettings(userId);
      if (!currentSettings) {
        throw new Error('User settings not found');
      }

      // Validate updates
      const validatedUpdates = this.validateSettingsUpdates(updates);

      // Merge updates with current settings
      const newSettings = {
        preferences: { ...currentSettings.preferences, ...validatedUpdates.preferences },
        notifications: { ...currentSettings.notifications, ...validatedUpdates.notifications },
        dashboard: { ...currentSettings.dashboard, ...validatedUpdates.dashboard },
        analysis: { ...currentSettings.analysis, ...validatedUpdates.analysis },
        privacy: { ...currentSettings.privacy, ...validatedUpdates.privacy }
      };

      // Update in database
      const updateQuery = `
        INSERT INTO user_settings (user_id, settings, created_at, updated_at)
        VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT (user_id)
        DO UPDATE SET
          settings = $2,
          updated_at = CURRENT_TIMESTAMP
        RETURNING created_at, updated_at
      `;

      const result = await db.query(updateQuery, [userId, JSON.stringify(newSettings)]);
      
      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];

      return {
        userId,
        ...newSettings,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at)
      };

    } catch (error) {
      console.error('Error updating user settings:', error);
      throw error;
    }
  }

  async resetUserSettings(userId: string): Promise<UserSettings> {
    try {
      const defaultSettings = this.createDefaultSettings(userId);
      
      const deleteQuery = `
        DELETE FROM user_settings WHERE user_id = $1
      `;
      
      await db.query(deleteQuery, [userId]);
      
      // Create new default settings
      return await this.updateUserSettings(userId, {
        preferences: defaultSettings.preferences,
        notifications: defaultSettings.notifications,
        dashboard: defaultSettings.dashboard,
        analysis: defaultSettings.analysis,
        privacy: defaultSettings.privacy
      }) as UserSettings;

    } catch (error) {
      console.error('Error resetting user settings:', error);
      throw error;
    }
  }

  async exportUserSettings(userId: string): Promise<any> {
    try {
      const settings = await this.getUserSettings(userId);
      if (!settings) {
        throw new Error('User settings not found');
      }

      // Remove sensitive data for export
      const exportData = {
        preferences: settings.preferences,
        dashboard: settings.dashboard,
        analysis: settings.analysis,
        exportedAt: new Date().toISOString(),
        version: '1.0'
      };

      return sanitizeObject(exportData);

    } catch (error) {
      console.error('Error exporting user settings:', error);
      throw error;
    }
  }

  async importUserSettings(userId: string, importData: any): Promise<UserSettings | null> {
    try {
      // Validate import data structure
      if (!this.validateImportData(importData)) {
        throw new Error('Invalid import data format');
      }

      const updates: UpdateSettingsRequest = {
        preferences: importData.preferences,
        dashboard: importData.dashboard,
        analysis: importData.analysis
      };

      return await this.updateUserSettings(userId, updates);

    } catch (error) {
      console.error('Error importing user settings:', error);
      throw error;
    }
  }

  private createDefaultSettings(userId: string): UserSettings {
    return {
      userId,
      preferences: this.getDefaultPreferences(),
      notifications: this.getDefaultNotifications(),
      dashboard: this.getDefaultDashboard(),
      analysis: this.getDefaultAnalysis(),
      privacy: this.getDefaultPrivacy(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  private getDefaultPreferences() {
    return {
      displayCurrency: 'JPY' as const,
      language: 'ja' as const,
      theme: 'light' as const,
      dateFormat: 'YYYY-MM-DD' as const,
      timeZone: 'Asia/Tokyo',
      numberFormat: 'comma' as const,
      decimalPlaces: 2
    };
  }

  private getDefaultNotifications() {
    return {
      priceAlerts: true,
      newsUpdates: false,
      weeklyReports: true,
      emailNotifications: false,
      pushNotifications: false,
      alertFrequency: 'daily' as const
    };
  }

  private getDefaultDashboard() {
    return {
      defaultView: 'overview' as const,
      chartsDefaultPeriod: '1M' as const,
      showAdvancedMetrics: false,
      favoriteMetrics: ['peRatio', 'roe', 'dividendYield', 'marketCap'],
      layoutPreferences: {
        compactMode: false,
        showSidebar: true,
        gridDensity: 'comfortable' as const
      }
    };
  }

  private getDefaultAnalysis() {
    return {
      defaultAnalysisType: 'basic' as const,
      includeIndustryComparison: true,
      includeDCFAnalysis: false,
      riskTolerance: 'moderate' as const,
      investmentHorizon: 'medium' as const,
      preferredAnalysisMetrics: ['peRatio', 'pbRatio', 'roe', 'roa', 'dividendYield', 'debtToEquity']
    };
  }

  private getDefaultPrivacy() {
    return {
      shareAnalytics: false,
      allowTracking: false,
      dataRetentionDays: 365
    };
  }

  private validateSettingsUpdates(updates: UpdateSettingsRequest): UpdateSettingsRequest {
    const validated: UpdateSettingsRequest = {};

    // Validate preferences
    if (updates.preferences) {
      validated.preferences = {};
      
      if (updates.preferences.displayCurrency && ['USD', 'JPY', 'EUR'].includes(updates.preferences.displayCurrency)) {
        validated.preferences.displayCurrency = updates.preferences.displayCurrency;
      }
      
      if (updates.preferences.language && ['ja', 'en'].includes(updates.preferences.language)) {
        validated.preferences.language = updates.preferences.language;
      }
      
      if (updates.preferences.theme && ['light', 'dark', 'auto'].includes(updates.preferences.theme)) {
        validated.preferences.theme = updates.preferences.theme;
      }
      
      if (updates.preferences.dateFormat && ['YYYY-MM-DD', 'MM/DD/YYYY', 'DD/MM/YYYY'].includes(updates.preferences.dateFormat)) {
        validated.preferences.dateFormat = updates.preferences.dateFormat;
      }
      
      if (updates.preferences.timeZone && typeof updates.preferences.timeZone === 'string' && updates.preferences.timeZone.length < 50) {
        validated.preferences.timeZone = updates.preferences.timeZone;
      }
      
      if (updates.preferences.numberFormat && ['comma', 'space', 'period'].includes(updates.preferences.numberFormat)) {
        validated.preferences.numberFormat = updates.preferences.numberFormat;
      }
      
      if (updates.preferences.decimalPlaces && Number.isInteger(updates.preferences.decimalPlaces) && 
          updates.preferences.decimalPlaces >= 0 && updates.preferences.decimalPlaces <= 6) {
        validated.preferences.decimalPlaces = updates.preferences.decimalPlaces;
      }
    }

    // Validate notifications
    if (updates.notifications) {
      validated.notifications = {};
      
      if (typeof updates.notifications.priceAlerts === 'boolean') {
        validated.notifications.priceAlerts = updates.notifications.priceAlerts;
      }
      
      if (typeof updates.notifications.newsUpdates === 'boolean') {
        validated.notifications.newsUpdates = updates.notifications.newsUpdates;
      }
      
      if (typeof updates.notifications.weeklyReports === 'boolean') {
        validated.notifications.weeklyReports = updates.notifications.weeklyReports;
      }
      
      if (typeof updates.notifications.emailNotifications === 'boolean') {
        validated.notifications.emailNotifications = updates.notifications.emailNotifications;
      }
      
      if (typeof updates.notifications.pushNotifications === 'boolean') {
        validated.notifications.pushNotifications = updates.notifications.pushNotifications;
      }
      
      if (updates.notifications.alertFrequency && ['immediate', 'daily', 'weekly'].includes(updates.notifications.alertFrequency)) {
        validated.notifications.alertFrequency = updates.notifications.alertFrequency;
      }
    }

    // Validate dashboard settings
    if (updates.dashboard) {
      validated.dashboard = {};
      
      if (updates.dashboard.defaultView && ['overview', 'favorites', 'analysis'].includes(updates.dashboard.defaultView)) {
        validated.dashboard.defaultView = updates.dashboard.defaultView;
      }
      
      if (updates.dashboard.chartsDefaultPeriod && ['1D', '1W', '1M', '3M', '6M', '1Y', '5Y'].includes(updates.dashboard.chartsDefaultPeriod)) {
        validated.dashboard.chartsDefaultPeriod = updates.dashboard.chartsDefaultPeriod;
      }
      
      if (typeof updates.dashboard.showAdvancedMetrics === 'boolean') {
        validated.dashboard.showAdvancedMetrics = updates.dashboard.showAdvancedMetrics;
      }
      
      if (Array.isArray(updates.dashboard.favoriteMetrics) && updates.dashboard.favoriteMetrics.length <= 10) {
        validated.dashboard.favoriteMetrics = updates.dashboard.favoriteMetrics.filter(metric => 
          typeof metric === 'string' && metric.length < 50
        );
      }
      
      if (updates.dashboard.layoutPreferences) {
        validated.dashboard.layoutPreferences = {
          compactMode: false,
          showSidebar: true,
          gridDensity: 'comfortable' as 'comfortable' | 'compact' | 'spacious'
        };
        
        if (typeof updates.dashboard.layoutPreferences.compactMode === 'boolean') {
          validated.dashboard.layoutPreferences!.compactMode = updates.dashboard.layoutPreferences.compactMode;
        }
        
        if (typeof updates.dashboard.layoutPreferences.showSidebar === 'boolean') {
          validated.dashboard.layoutPreferences!.showSidebar = updates.dashboard.layoutPreferences.showSidebar;
        }
        
        if (updates.dashboard.layoutPreferences.gridDensity && ['comfortable', 'compact', 'spacious'].includes(updates.dashboard.layoutPreferences.gridDensity)) {
          validated.dashboard.layoutPreferences!.gridDensity = updates.dashboard.layoutPreferences.gridDensity;
        }
      }
    }

    // Validate analysis settings
    if (updates.analysis) {
      validated.analysis = {};
      
      if (updates.analysis.defaultAnalysisType && ['basic', 'detailed', 'professional'].includes(updates.analysis.defaultAnalysisType)) {
        validated.analysis.defaultAnalysisType = updates.analysis.defaultAnalysisType;
      }
      
      if (typeof updates.analysis.includeIndustryComparison === 'boolean') {
        validated.analysis.includeIndustryComparison = updates.analysis.includeIndustryComparison;
      }
      
      if (typeof updates.analysis.includeDCFAnalysis === 'boolean') {
        validated.analysis.includeDCFAnalysis = updates.analysis.includeDCFAnalysis;
      }
      
      if (updates.analysis.riskTolerance && ['conservative', 'moderate', 'aggressive'].includes(updates.analysis.riskTolerance)) {
        validated.analysis.riskTolerance = updates.analysis.riskTolerance;
      }
      
      if (updates.analysis.investmentHorizon && ['short', 'medium', 'long'].includes(updates.analysis.investmentHorizon)) {
        validated.analysis.investmentHorizon = updates.analysis.investmentHorizon;
      }
      
      if (Array.isArray(updates.analysis.preferredAnalysisMetrics) && updates.analysis.preferredAnalysisMetrics.length <= 15) {
        validated.analysis.preferredAnalysisMetrics = updates.analysis.preferredAnalysisMetrics.filter(metric => 
          typeof metric === 'string' && metric.length < 50
        );
      }
    }

    // Validate privacy settings
    if (updates.privacy) {
      validated.privacy = {};
      
      if (typeof updates.privacy.shareAnalytics === 'boolean') {
        validated.privacy.shareAnalytics = updates.privacy.shareAnalytics;
      }
      
      if (typeof updates.privacy.allowTracking === 'boolean') {
        validated.privacy.allowTracking = updates.privacy.allowTracking;
      }
      
      if (updates.privacy.dataRetentionDays && Number.isInteger(updates.privacy.dataRetentionDays) && 
          updates.privacy.dataRetentionDays >= 30 && updates.privacy.dataRetentionDays <= 3650) {
        validated.privacy.dataRetentionDays = updates.privacy.dataRetentionDays;
      }
    }

    return validated;
  }

  private validateImportData(data: any): boolean {
    if (!data || typeof data !== 'object') {
      return false;
    }

    // Check for required structure
    if (data.preferences && typeof data.preferences !== 'object') {
      return false;
    }

    if (data.dashboard && typeof data.dashboard !== 'object') {
      return false;
    }

    if (data.analysis && typeof data.analysis !== 'object') {
      return false;
    }

    return true;
  }
}

export const userSettingsService = new UserSettingsService();