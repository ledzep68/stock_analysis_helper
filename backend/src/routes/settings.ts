import express, { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { userSettingsService, UpdateSettingsRequest } from '../services/userSettingsService';
import { createSecureApiResponse } from '../utils/security';

const router = express.Router();

// Rate limiting for settings endpoints
const settingsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 settings requests per 15 minutes per IP
  message: createSecureApiResponse(false, undefined, 'Too many settings requests, please try again later'),
  standardHeaders: true,
  legacyHeaders: false,
});

router.use(settingsLimiter);

// Temporary user ID helper (same as favorites)
const getTempUserId = (req: Request): string => {
  return 'temp-user-' + (req.ip || 'unknown').replace(/[^a-zA-Z0-9]/g, '');
};

/**
 * GET /api/settings
 * Get current user settings
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = getTempUserId(req);
    
    const settings = await userSettingsService.getUserSettings(userId);
    
    if (!settings) {
      return res.status(404).json(createSecureApiResponse(false, undefined, 'User settings not found'));
    }

    res.json(createSecureApiResponse(true, {
      settings,
      lastUpdated: settings.updatedAt,
      version: '1.0'
    }));
    
  } catch (error) {
    console.error('Get user settings error:', error);
    res.status(500).json(createSecureApiResponse(false, undefined, 'Failed to retrieve user settings'));
  }
});

/**
 * PUT /api/settings
 * Update user settings
 */
router.put('/', async (req: Request, res: Response) => {
  try {
    const userId = getTempUserId(req);
    const updates: UpdateSettingsRequest = req.body;

    if (!updates || typeof updates !== 'object') {
      return res.status(400).json(createSecureApiResponse(false, undefined, 'Invalid settings data'));
    }

    const updatedSettings = await userSettingsService.updateUserSettings(userId, updates);
    
    if (!updatedSettings) {
      return res.status(400).json(createSecureApiResponse(false, undefined, 'Failed to update settings'));
    }

    res.json(createSecureApiResponse(true, {
      settings: updatedSettings,
      message: 'Settings updated successfully',
      lastUpdated: updatedSettings.updatedAt
    }));
    
  } catch (error) {
    console.error('Update user settings error:', error);
    res.status(500).json(createSecureApiResponse(false, undefined, 'Failed to update user settings'));
  }
});

/**
 * POST /api/settings/reset
 * Reset user settings to defaults
 */
router.post('/reset', async (req: Request, res: Response) => {
  try {
    const userId = getTempUserId(req);
    
    const defaultSettings = await userSettingsService.resetUserSettings(userId);
    
    res.json(createSecureApiResponse(true, {
      settings: defaultSettings,
      message: 'Settings reset to defaults',
      resetAt: new Date().toISOString()
    }));
    
  } catch (error) {
    console.error('Reset user settings error:', error);
    res.status(500).json(createSecureApiResponse(false, undefined, 'Failed to reset user settings'));
  }
});

/**
 * GET /api/settings/export
 * Export user settings
 */
router.get('/export', async (req: Request, res: Response) => {
  try {
    const userId = getTempUserId(req);
    
    const exportData = await userSettingsService.exportUserSettings(userId);
    
    // Set headers for file download
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="stock-analysis-settings-${Date.now()}.json"`);
    
    res.json(createSecureApiResponse(true, {
      exportData,
      exportInfo: {
        userId: userId.substring(0, 8) + '***', // Partially masked for privacy
        exportedAt: new Date().toISOString(),
        version: '1.0',
        dataTypes: ['preferences', 'dashboard', 'analysis'],
        excludedData: ['notifications', 'privacy'] // Sensitive data excluded
      }
    }));
    
  } catch (error) {
    console.error('Export user settings error:', error);
    res.status(500).json(createSecureApiResponse(false, undefined, 'Failed to export user settings'));
  }
});

/**
 * POST /api/settings/import
 * Import user settings
 */
router.post('/import', async (req: Request, res: Response) => {
  try {
    const userId = getTempUserId(req);
    const { importData } = req.body;

    if (!importData) {
      return res.status(400).json(createSecureApiResponse(false, undefined, 'Import data is required'));
    }

    const importedSettings = await userSettingsService.importUserSettings(userId, importData);
    
    if (!importedSettings) {
      return res.status(400).json(createSecureApiResponse(false, undefined, 'Failed to import settings'));
    }

    res.json(createSecureApiResponse(true, {
      settings: importedSettings,
      message: 'Settings imported successfully',
      importInfo: {
        importedAt: new Date().toISOString(),
        dataTypes: Object.keys(importData),
        preservedSettings: ['notifications', 'privacy'] // These are not overwritten
      }
    }));
    
  } catch (error) {
    console.error('Import user settings error:', error);
    
    if (error instanceof Error && error.message.includes('Invalid import data')) {
      return res.status(400).json(createSecureApiResponse(false, undefined, 'Invalid import data format'));
    }
    
    res.status(500).json(createSecureApiResponse(false, undefined, 'Failed to import user settings'));
  }
});

/**
 * GET /api/settings/preferences
 * Get only user preferences
 */
router.get('/preferences', async (req: Request, res: Response) => {
  try {
    const userId = getTempUserId(req);
    
    const settings = await userSettingsService.getUserSettings(userId);
    
    if (!settings) {
      return res.status(404).json(createSecureApiResponse(false, undefined, 'User preferences not found'));
    }

    res.json(createSecureApiResponse(true, {
      preferences: settings.preferences,
      lastUpdated: settings.updatedAt
    }));
    
  } catch (error) {
    console.error('Get user preferences error:', error);
    res.status(500).json(createSecureApiResponse(false, undefined, 'Failed to retrieve user preferences'));
  }
});

/**
 * PUT /api/settings/preferences
 * Update only user preferences
 */
router.put('/preferences', async (req: Request, res: Response) => {
  try {
    const userId = getTempUserId(req);
    const { preferences } = req.body;

    if (!preferences || typeof preferences !== 'object') {
      return res.status(400).json(createSecureApiResponse(false, undefined, 'Invalid preferences data'));
    }

    const updatedSettings = await userSettingsService.updateUserSettings(userId, { preferences });
    
    if (!updatedSettings) {
      return res.status(400).json(createSecureApiResponse(false, undefined, 'Failed to update preferences'));
    }

    res.json(createSecureApiResponse(true, {
      preferences: updatedSettings.preferences,
      message: 'Preferences updated successfully',
      lastUpdated: updatedSettings.updatedAt
    }));
    
  } catch (error) {
    console.error('Update user preferences error:', error);
    res.status(500).json(createSecureApiResponse(false, undefined, 'Failed to update user preferences'));
  }
});

/**
 * GET /api/settings/notifications
 * Get notification settings
 */
router.get('/notifications', async (req: Request, res: Response) => {
  try {
    const userId = getTempUserId(req);
    
    const settings = await userSettingsService.getUserSettings(userId);
    
    if (!settings) {
      return res.status(404).json(createSecureApiResponse(false, undefined, 'Notification settings not found'));
    }

    res.json(createSecureApiResponse(true, {
      notifications: settings.notifications,
      lastUpdated: settings.updatedAt
    }));
    
  } catch (error) {
    console.error('Get notification settings error:', error);
    res.status(500).json(createSecureApiResponse(false, undefined, 'Failed to retrieve notification settings'));
  }
});

/**
 * PUT /api/settings/notifications
 * Update notification settings
 */
router.put('/notifications', async (req: Request, res: Response) => {
  try {
    const userId = getTempUserId(req);
    const { notifications } = req.body;

    if (!notifications || typeof notifications !== 'object') {
      return res.status(400).json(createSecureApiResponse(false, undefined, 'Invalid notifications data'));
    }

    const updatedSettings = await userSettingsService.updateUserSettings(userId, { notifications });
    
    if (!updatedSettings) {
      return res.status(400).json(createSecureApiResponse(false, undefined, 'Failed to update notifications'));
    }

    res.json(createSecureApiResponse(true, {
      notifications: updatedSettings.notifications,
      message: 'Notification settings updated successfully',
      lastUpdated: updatedSettings.updatedAt
    }));
    
  } catch (error) {
    console.error('Update notification settings error:', error);
    res.status(500).json(createSecureApiResponse(false, undefined, 'Failed to update notification settings'));
  }
});

/**
 * GET /api/settings/dashboard
 * Get dashboard settings
 */
router.get('/dashboard', async (req: Request, res: Response) => {
  try {
    const userId = getTempUserId(req);
    
    const settings = await userSettingsService.getUserSettings(userId);
    
    if (!settings) {
      return res.status(404).json(createSecureApiResponse(false, undefined, 'Dashboard settings not found'));
    }

    res.json(createSecureApiResponse(true, {
      dashboard: settings.dashboard,
      lastUpdated: settings.updatedAt
    }));
    
  } catch (error) {
    console.error('Get dashboard settings error:', error);
    res.status(500).json(createSecureApiResponse(false, undefined, 'Failed to retrieve dashboard settings'));
  }
});

/**
 * PUT /api/settings/dashboard
 * Update dashboard settings
 */
router.put('/dashboard', async (req: Request, res: Response) => {
  try {
    const userId = getTempUserId(req);
    const { dashboard } = req.body;

    if (!dashboard || typeof dashboard !== 'object') {
      return res.status(400).json(createSecureApiResponse(false, undefined, 'Invalid dashboard data'));
    }

    const updatedSettings = await userSettingsService.updateUserSettings(userId, { dashboard });
    
    if (!updatedSettings) {
      return res.status(400).json(createSecureApiResponse(false, undefined, 'Failed to update dashboard settings'));
    }

    res.json(createSecureApiResponse(true, {
      dashboard: updatedSettings.dashboard,
      message: 'Dashboard settings updated successfully',
      lastUpdated: updatedSettings.updatedAt
    }));
    
  } catch (error) {
    console.error('Update dashboard settings error:', error);
    res.status(500).json(createSecureApiResponse(false, undefined, 'Failed to update dashboard settings'));
  }
});

export default router;