import express, { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { favoritesService, AddFavoriteRequest } from '../services/favoritesService';
import { validateInput, createSecureApiResponse } from '../utils/security';
import { authenticateToken } from '../middleware/auth';

interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email: string;
  };
}

const router = express.Router();

// Rate limiting for favorites endpoints
const favoritesLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // 50 requests per 15 minutes per IP
  message: createSecureApiResponse(false, undefined, 'Too many favorites requests, please try again later'),
  standardHeaders: true,
  legacyHeaders: false,
});

router.use(favoritesLimiter);
router.use(authenticateToken);

/**
 * GET /api/favorites
 * Get all favorites for the current user
 */
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json(createSecureApiResponse(false, undefined, 'User not authenticated'));
    }
    
    const favorites = await favoritesService.getUserFavorites(userId.toString());
    
    res.json(createSecureApiResponse(true, {
      favorites,
      count: favorites.length
    }));
    
  } catch (error) {
    console.error('Get favorites error:', error);
    res.status(500).json(createSecureApiResponse(false, undefined, 'Failed to retrieve favorites'));
  }
});

/**
 * POST /api/favorites
 * Add a company to favorites
 */
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json(createSecureApiResponse(false, undefined, 'User not authenticated'));
    }
    const { symbol, notes, priceAlertEnabled, targetPrice, alertType } = req.body;

    if (!symbol || typeof symbol !== 'string') {
      return res.status(400).json(createSecureApiResponse(false, undefined, 'Symbol is required'));
    }

    // Validate notes if provided
    if (notes && (typeof notes !== 'string' || notes.length > 1000)) {
      return res.status(400).json(createSecureApiResponse(false, undefined, 'Invalid notes format or too long'));
    }

    // Validate price alert parameters if enabled
    if (priceAlertEnabled) {
      if (!targetPrice || typeof targetPrice !== 'number' || targetPrice <= 0) {
        return res.status(400).json(createSecureApiResponse(false, undefined, 'Valid target price required for price alerts'));
      }
      if (!alertType || !['above', 'below', 'change'].includes(alertType)) {
        return res.status(400).json(createSecureApiResponse(false, undefined, 'Valid alert type required for price alerts'));
      }
    }

    const request: AddFavoriteRequest = {
      userId: userId.toString(),
      symbol: symbol.toUpperCase().trim(),
      notes: notes?.trim(),
      priceAlertEnabled: !!priceAlertEnabled,
      targetPrice: priceAlertEnabled ? targetPrice : undefined,
      alertType: priceAlertEnabled ? alertType : undefined
    };

    const favorite = await favoritesService.addFavorite(request);
    
    if (!favorite) {
      return res.status(400).json(createSecureApiResponse(false, undefined, 'Failed to add favorite'));
    }

    res.status(201).json(createSecureApiResponse(true, { favorite }));
    
  } catch (error) {
    console.error('Add favorite error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('Invalid symbol')) {
        return res.status(400).json(createSecureApiResponse(false, undefined, 'Invalid symbol format'));
      }
      if (error.message.includes('Company not found')) {
        return res.status(404).json(createSecureApiResponse(false, undefined, 'Company not found in database'));
      }
    }
    
    res.status(500).json(createSecureApiResponse(false, undefined, 'Failed to add favorite'));
  }
});

/**
 * GET /api/favorites/:symbol
 * Get details for a specific favorite
 */
router.get('/:symbol', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json(createSecureApiResponse(false, undefined, 'User not authenticated'));
    }
    const { symbol } = req.params;

    if (!symbol) {
      return res.status(400).json(createSecureApiResponse(false, undefined, 'Symbol parameter is required'));
    }

    const favorite = await favoritesService.getFavoriteDetails(userId.toString(), symbol);
    
    if (!favorite) {
      return res.status(404).json(createSecureApiResponse(false, undefined, 'Favorite not found'));
    }

    res.json(createSecureApiResponse(true, { favorite }));
    
  } catch (error) {
    console.error('Get favorite details error:', error);
    res.status(500).json(createSecureApiResponse(false, undefined, 'Failed to retrieve favorite details'));
  }
});

/**
 * PUT /api/favorites/:symbol/notes
 * Update notes for a favorite
 */
router.put('/:symbol/notes', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json(createSecureApiResponse(false, undefined, 'User not authenticated'));
    }
    const { symbol } = req.params;
    const { notes } = req.body;

    if (!symbol) {
      return res.status(400).json(createSecureApiResponse(false, undefined, 'Symbol parameter is required'));
    }

    if (typeof notes !== 'string') {
      return res.status(400).json(createSecureApiResponse(false, undefined, 'Notes must be a string'));
    }

    const success = await favoritesService.updateFavoriteNotes(userId.toString(), symbol, notes);
    
    if (!success) {
      return res.status(404).json(createSecureApiResponse(false, undefined, 'Favorite not found'));
    }

    res.json(createSecureApiResponse(true, { message: 'Notes updated successfully' }));
    
  } catch (error) {
    console.error('Update favorite notes error:', error);
    res.status(500).json(createSecureApiResponse(false, undefined, 'Failed to update notes'));
  }
});

/**
 * PUT /api/favorites/:symbol/alert
 * Update price alert settings for a favorite
 */
router.put('/:symbol/alert', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json(createSecureApiResponse(false, undefined, 'User not authenticated'));
    }
    const { symbol } = req.params;
    const { enabled, targetPrice, alertType } = req.body;

    if (!symbol) {
      return res.status(400).json(createSecureApiResponse(false, undefined, 'Symbol parameter is required'));
    }

    if (typeof enabled !== 'boolean') {
      return res.status(400).json(createSecureApiResponse(false, undefined, 'Enabled must be a boolean'));
    }

    const success = await favoritesService.updatePriceAlert(userId.toString(), symbol, enabled, targetPrice, alertType);
    
    if (!success) {
      return res.status(404).json(createSecureApiResponse(false, undefined, 'Favorite not found'));
    }

    res.json(createSecureApiResponse(true, { message: 'Price alert updated successfully' }));
    
  } catch (error) {
    console.error('Update price alert error:', error);
    
    if (error instanceof Error && error.message.includes('required when enabling')) {
      return res.status(400).json(createSecureApiResponse(false, undefined, error.message));
    }
    
    res.status(500).json(createSecureApiResponse(false, undefined, 'Failed to update price alert'));
  }
});

/**
 * DELETE /api/favorites/:symbol
 * Remove a company from favorites
 */
router.delete('/:symbol', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json(createSecureApiResponse(false, undefined, 'User not authenticated'));
    }
    const { symbol } = req.params;

    if (!symbol) {
      return res.status(400).json(createSecureApiResponse(false, undefined, 'Symbol parameter is required'));
    }

    const success = await favoritesService.removeFavorite(userId.toString(), symbol);
    
    if (!success) {
      return res.status(404).json(createSecureApiResponse(false, undefined, 'Favorite not found'));
    }

    res.json(createSecureApiResponse(true, { message: 'Favorite removed successfully' }));
    
  } catch (error) {
    console.error('Remove favorite error:', error);
    res.status(500).json(createSecureApiResponse(false, undefined, 'Failed to remove favorite'));
  }
});

export default router;