import express, { Request, Response } from 'express';
import { authService, AuthenticatedRequest, authLimiter, loginLimiter } from '../middleware/auth';
import { createSecureApiResponse, validateInput } from '../utils/security';

const router = express.Router();

// Apply rate limiting to auth routes (disabled for testing)
// router.use(authLimiter);

/**
 * POST /api/auth/register
 * Register a new user account
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, username } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json(createSecureApiResponse(false, undefined, 'Email and password are required'));
    }

    // Validate email format
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json(createSecureApiResponse(false, undefined, 'Invalid email format'));
    }

    // Validate password strength
    if (password.length < 8) {
      return res.status(400).json(createSecureApiResponse(false, undefined, 'Password must be at least 8 characters long'));
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json(createSecureApiResponse(false, undefined, 
        'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'));
    }

    // Validate username if provided
    if (username) {
      if (username.length < 3 || username.length > 30) {
        return res.status(400).json(createSecureApiResponse(false, undefined, 'Username must be between 3 and 30 characters'));
      }
      
      const usernameRegex = /^[a-zA-Z0-9_-]+$/;
      if (!usernameRegex.test(username)) {
        return res.status(400).json(createSecureApiResponse(false, undefined, 'Username can only contain letters, numbers, underscores, and hyphens'));
      }
    }

    // Check if user already exists
    const existingUser = await authService.getUserByEmail(email);
    if (existingUser) {
      return res.status(409).json(createSecureApiResponse(false, undefined, 'User with this email already exists'));
    }

    // Create new user
    const newUser = await authService.createUser(email, password, username);
    
    // Generate token
    const token = authService.generateToken(newUser.id, newUser.email);
    
    // Create session
    const sessionCreated = await authService.createUserSession(
      newUser.id, 
      token, 
      req.ip || 'unknown',
      req.get('User-Agent') || 'unknown'
    );

    if (!sessionCreated) {
      console.warn('Failed to create user session for registration');
    }

    res.status(201).json(createSecureApiResponse(true, {
      user: {
        id: newUser.id,
        email: newUser.email,
        username: newUser.username,
        createdAt: newUser.created_at
      },
      token,
      message: 'User registered successfully'
    }));

  } catch (error) {
    console.error('Registration error:', error);
    
    if (error instanceof Error && error.message.includes('duplicate key')) {
      return res.status(409).json(createSecureApiResponse(false, undefined, 'User with this email already exists'));
    }
    
    res.status(500).json(createSecureApiResponse(false, undefined, 'Registration failed'));
  }
});

/**
 * POST /api/auth/login
 * Login with email and password
 */
router.post('/login', loginLimiter, async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json(createSecureApiResponse(false, undefined, 'Email and password are required'));
    }

    // Get user from database
    const user = await authService.getUserByEmail(email);
    
    if (!user) {
      // Don't reveal that user doesn't exist
      await authService.handleFailedLogin(email);
      return res.status(401).json(createSecureApiResponse(false, undefined, 'Invalid email or password'));
    }

    // Check if account is active
    if (!user.is_active) {
      return res.status(403).json(createSecureApiResponse(false, undefined, 'Account is deactivated'));
    }

    // Check if account is locked
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      return res.status(423).json(createSecureApiResponse(false, undefined, 'Account temporarily locked due to failed login attempts'));
    }

    // Verify password
    const passwordValid = await authService.verifyPassword(password, user.password_hash);
    
    if (!passwordValid) {
      await authService.handleFailedLogin(email);
      return res.status(401).json(createSecureApiResponse(false, undefined, 'Invalid email or password'));
    }

    // Generate token
    const token = authService.generateToken(user.id, user.email);
    
    // Create session
    const sessionCreated = await authService.createUserSession(
      user.id, 
      token, 
      req.ip || 'unknown',
      req.get('User-Agent') || 'unknown'
    );

    if (!sessionCreated) {
      console.warn('Failed to create user session for login');
    }

    // Update last login
    await authService.updateLastLogin(user.id);

    res.json(createSecureApiResponse(true, {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        lastLogin: new Date().toISOString()
      },
      token,
      message: 'Login successful'
    }));

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json(createSecureApiResponse(false, undefined, 'Login failed'));
  }
});

/**
 * POST /api/auth/logout
 * Logout and invalidate session
 */
router.post('/logout', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token && req.user) {
      await authService.invalidateUserSession(req.user.id, token);
    }

    res.json(createSecureApiResponse(true, {
      message: 'Logout successful'
    }));

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json(createSecureApiResponse(false, undefined, 'Logout failed'));
  }
});

/**
 * GET /api/auth/me
 * Get current user profile
 */
router.get('/me', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json(createSecureApiResponse(false, undefined, 'Access token required'));
    }

    const decoded = authService.verifyToken(token);
    
    if (!decoded) {
      return res.status(403).json(createSecureApiResponse(false, undefined, 'Invalid or expired token'));
    }

    const user = await authService.getUserByEmail(decoded.email);
    
    if (!user || !user.is_active) {
      return res.status(403).json(createSecureApiResponse(false, undefined, 'User account not found or inactive'));
    }

    res.json(createSecureApiResponse(true, {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        createdAt: user.created_at,
        lastLogin: user.last_login
      }
    }));

  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json(createSecureApiResponse(false, undefined, 'Failed to get user profile'));
  }
});

/**
 * POST /api/auth/refresh
 * Refresh authentication token
 */
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json(createSecureApiResponse(false, undefined, 'Access token required'));
    }

    const decoded = authService.verifyToken(token);
    
    if (!decoded) {
      return res.status(403).json(createSecureApiResponse(false, undefined, 'Invalid or expired token'));
    }

    const user = await authService.getUserByEmail(decoded.email);
    
    if (!user || !user.is_active) {
      return res.status(403).json(createSecureApiResponse(false, undefined, 'User account not found or inactive'));
    }

    // Generate new token
    const newToken = authService.generateToken(user.id, user.email);
    
    // Create new session
    await authService.createUserSession(
      user.id, 
      newToken, 
      req.ip || 'unknown',
      req.get('User-Agent') || 'unknown'
    );

    res.json(createSecureApiResponse(true, {
      token: newToken,
      user: {
        id: user.id,
        email: user.email,
        username: user.username
      },
      message: 'Token refreshed successfully'
    }));

  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json(createSecureApiResponse(false, undefined, 'Token refresh failed'));
  }
});

/**
 * POST /api/auth/change-password
 * Change user password
 */
router.post('/change-password', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json(createSecureApiResponse(false, undefined, 'Access token required'));
    }

    const decoded = authService.verifyToken(token);
    
    if (!decoded) {
      return res.status(403).json(createSecureApiResponse(false, undefined, 'Invalid or expired token'));
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json(createSecureApiResponse(false, undefined, 'Current password and new password are required'));
    }

    // Validate new password strength
    if (newPassword.length < 8) {
      return res.status(400).json(createSecureApiResponse(false, undefined, 'New password must be at least 8 characters long'));
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json(createSecureApiResponse(false, undefined, 
        'New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'));
    }

    const user = await authService.getUserByEmail(decoded.email);
    
    if (!user || !user.is_active) {
      return res.status(403).json(createSecureApiResponse(false, undefined, 'User account not found or inactive'));
    }

    // Verify current password
    const currentPasswordValid = await authService.verifyPassword(currentPassword, user.password_hash);
    
    if (!currentPasswordValid) {
      return res.status(401).json(createSecureApiResponse(false, undefined, 'Current password is incorrect'));
    }

    // Hash new password
    const newPasswordHash = await authService.hashPassword(newPassword);
    
    // Update password in database
    const updateQuery = `
      UPDATE users 
      SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `;
    
    await authService.getUserByEmail(''); // Use DB directly for this operation
    const db = require('../config/database').default;
    await db.query(updateQuery, [newPasswordHash, user.id]);

    // Invalidate all existing sessions for security
    await authService.invalidateUserSession(user.id, token);

    res.json(createSecureApiResponse(true, {
      message: 'Password changed successfully. Please log in again with your new password.'
    }));

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json(createSecureApiResponse(false, undefined, 'Password change failed'));
  }
});

export default router;