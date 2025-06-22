import jwt, { SignOptions } from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { Request, Response, NextFunction } from 'express';
import db from '../config/database';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    username?: string;
  };
}

export interface TokenPayload {
  userId: string;
  email: string;
  iat: number;
  exp: number;
}

export class AuthService {
  private readonly jwtSecret: string;
  private readonly jwtExpiry: string;
  private readonly saltRounds: number;

  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || 'fallback-secret-for-development-only';
    this.jwtExpiry = process.env.JWT_EXPIRY || '24h';
    this.saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12');
    
    if (process.env.NODE_ENV === 'production' && this.jwtSecret === 'fallback-secret-for-development-only') {
      console.error('WARNING: Using fallback JWT secret in production! Set JWT_SECRET environment variable.');
    }
  }

  async hashPassword(password: string): Promise<string> {
    try {
      return await bcrypt.hash(password, this.saltRounds);
    } catch (error) {
      console.error('Error hashing password:', error);
      throw new Error('Failed to hash password');
    }
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      return await bcrypt.compare(password, hash);
    } catch (error) {
      console.error('Error verifying password:', error);
      return false;
    }
  }

  generateToken(userId: string, email: string): string {
    try {
      const payload = { userId, email };
      return jwt.sign(payload, this.jwtSecret, { 
        expiresIn: this.jwtExpiry,
        issuer: 'stock-analysis-helper',
        audience: 'stock-analysis-users'
      } as SignOptions);
    } catch (error) {
      console.error('Error generating JWT token:', error);
      throw new Error('Failed to generate authentication token');
    }
  }

  verifyToken(token: string): TokenPayload | null {
    try {
      const decoded = jwt.verify(token, this.jwtSecret, {
        issuer: 'stock-analysis-helper',
        audience: 'stock-analysis-users'
      }) as TokenPayload;
      
      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        console.log('Token expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        console.log('Invalid token');
      } else {
        console.error('Token verification error:', error);
      }
      return null;
    }
  }

  async createUserSession(userId: string, token: string, ipAddress: string, userAgent: string): Promise<boolean> {
    try {
      // Hash the token for storage (additional security layer)
      const tokenHash = await this.hashPassword(token);
      
      const query = `
        INSERT INTO user_sessions (user_id, token_hash, expires_at, ip_address, user_agent)
        VALUES ($1, $2, $3, $4, $5)
      `;
      
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now
      
      await db.query(query, [userId, tokenHash, expiresAt, ipAddress, userAgent]);
      return true;
    } catch (error) {
      console.error('Error creating user session:', error);
      return false;
    }
  }

  async invalidateUserSession(userId: string, token: string): Promise<boolean> {
    try {
      const query = `
        UPDATE user_sessions 
        SET is_active = false 
        WHERE user_id = $1 AND is_active = true
      `;
      
      await db.query(query, [userId]);
      return true;
    } catch (error) {
      console.error('Error invalidating user session:', error);
      return false;
    }
  }

  async cleanupExpiredSessions(): Promise<void> {
    try {
      const query = `
        DELETE FROM user_sessions 
        WHERE expires_at < CURRENT_TIMESTAMP OR is_active = false
      `;
      
      const result = await db.query(query);
      console.log(`Cleaned up ${result.rowCount} expired sessions`);
    } catch (error) {
      console.error('Error cleaning up expired sessions:', error);
    }
  }

  async getUserByEmail(email: string): Promise<any> {
    try {
      const query = `
        SELECT id, email, password_hash, username, is_active, failed_login_attempts, locked_until
        FROM users 
        WHERE email = $1
      `;
      
      const result = await db.query(query, [email.toLowerCase()]);
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      console.error('Error getting user by email:', error);
      return null;
    }
  }

  async createUser(email: string, password: string, username?: string): Promise<any> {
    try {
      const hashedPassword = await this.hashPassword(password);
      
      const query = `
        INSERT INTO users (email, password_hash, username)
        VALUES ($1, $2, $3)
        RETURNING id, email, username, created_at
      `;
      
      const result = await db.query(query, [email.toLowerCase(), hashedPassword, username]);
      return result.rows[0];
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  async updateLastLogin(userId: string): Promise<void> {
    try {
      const query = `
        UPDATE users 
        SET last_login = CURRENT_TIMESTAMP, failed_login_attempts = 0
        WHERE id = $1
      `;
      
      await db.query(query, [userId]);
    } catch (error) {
      console.error('Error updating last login:', error);
    }
  }

  async handleFailedLogin(email: string): Promise<void> {
    try {
      const query = `
        UPDATE users 
        SET 
          failed_login_attempts = failed_login_attempts + 1,
          locked_until = CASE 
            WHEN failed_login_attempts >= 4 THEN CURRENT_TIMESTAMP + INTERVAL '30 minutes'
            ELSE locked_until
          END
        WHERE email = $1
      `;
      
      await db.query(query, [email.toLowerCase()]);
    } catch (error) {
      console.error('Error handling failed login:', error);
    }
  }
}

export const authService = new AuthService();

// Middleware to authenticate JWT tokens
export const authenticateToken = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ 
        success: false, 
        error: 'Access token required',
        timestamp: new Date().toISOString()
      });
    }

    const decoded = authService.verifyToken(token);
    
    if (!decoded) {
      return res.status(403).json({ 
        success: false, 
        error: 'Invalid or expired token',
        timestamp: new Date().toISOString()
      });
    }

    // Get user from database to ensure they still exist and are active
    const user = await authService.getUserByEmail(decoded.email);
    
    if (!user || !user.is_active) {
      return res.status(403).json({ 
        success: false, 
        error: 'User account not found or inactive',
        timestamp: new Date().toISOString()
      });
    }

    // Check if user is locked
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      return res.status(423).json({ 
        success: false, 
        error: 'Account temporarily locked due to failed login attempts',
        timestamp: new Date().toISOString()
      });
    }

    req.user = {
      id: user.id,
      email: user.email,
      username: user.username
    };

    next();
  } catch (error) {
    console.error('Authentication middleware error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Authentication service error',
      timestamp: new Date().toISOString()
    });
  }
};

// Middleware to optionally authenticate (for public endpoints that benefit from user context)
export const optionalAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = authService.verifyToken(token);
      
      if (decoded) {
        const user = await authService.getUserByEmail(decoded.email);
        
        if (user && user.is_active && (!user.locked_until || new Date(user.locked_until) <= new Date())) {
          req.user = {
            id: user.id,
            email: user.email,
            username: user.username
          };
        }
      }
    }

    next();
  } catch (error) {
    console.error('Optional auth middleware error:', error);
    // Don't fail the request, just continue without user context
    next();
  }
};

// Middleware for admin-only routes (future use)
export const requireAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  // For Phase 2, we'll implement basic admin check
  // In Phase 3, this would check user roles from database
  next();
};

// Rate limiting for auth endpoints
import rateLimit from 'express-rate-limit';

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // 50 attempts per 15 minutes (increased for testing)
  message: {
    success: false,
    error: 'Too many authentication attempts. Please try again later.',
    timestamp: new Date().toISOString()
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
});

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // 50 login attempts per 15 minutes (increased for testing)
  message: {
    success: false,
    error: 'Too many login attempts. Please try again later.',
    timestamp: new Date().toISOString()
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});