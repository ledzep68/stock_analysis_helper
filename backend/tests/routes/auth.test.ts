import request from 'supertest';
import express from 'express';
import authRouter from '../../src/routes/auth';

// Mock the auth service
jest.mock('../../src/services/authService', () => ({
  authService: {
    login: jest.fn(),
    register: jest.fn(),
    verifyToken: jest.fn(),
    generateToken: jest.fn()
  }
}));

import { authService } from '../../src/services/authService';

const mockAuthService = authService as jest.Mocked<typeof authService>;

describe('Auth Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/auth', authRouter);
    jest.clearAllMocks();
  });

  describe('POST /api/auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      const mockToken = 'mock-jwt-token';
      const mockUser = { id: '1', email: 'test@example.com' };
      
      mockAuthService.login.mockResolvedValue({
        success: true,
        token: mockToken,
        user: mockUser
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        token: mockToken,
        user: mockUser,
        timestamp: expect.any(String)
      });
      expect(mockAuthService.login).toHaveBeenCalledWith('test@example.com', 'password123');
    });

    it('should return 401 for invalid credentials', async () => {
      mockAuthService.login.mockResolvedValue({
        success: false,
        error: 'Invalid credentials'
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        success: false,
        error: 'Invalid credentials',
        timestamp: expect.any(String)
      });
    });

    it('should return 400 for missing email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          password: 'password123'
        });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        error: 'Email and password are required',
        timestamp: expect.any(String)
      });
    });

    it('should return 400 for missing password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com'
        });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        error: 'Email and password are required',
        timestamp: expect.any(String)
      });
    });

    it('should handle server errors', async () => {
      mockAuthService.login.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        error: 'Internal server error',
        timestamp: expect.any(String)
      });
    });
  });

  describe('POST /api/auth/register', () => {
    it('should register successfully with valid data', async () => {
      const mockUser = { id: '1', email: 'newuser@example.com' };
      const mockToken = 'mock-jwt-token';
      
      mockAuthService.register.mockResolvedValue({
        success: true,
        user: mockUser,
        token: mockToken
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'newuser@example.com',
          password: 'password123',
          name: 'New User'
        });

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        success: true,
        user: mockUser,
        token: mockToken,
        timestamp: expect.any(String)
      });
      expect(mockAuthService.register).toHaveBeenCalledWith('newuser@example.com', 'password123', 'New User');
    });

    it('should return 400 for invalid email format', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'invalid-email',
          password: 'password123',
          name: 'User'
        });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        error: 'Invalid email format',
        timestamp: expect.any(String)
      });
    });

    it('should return 400 for weak password', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'user@example.com',
          password: '123',
          name: 'User'
        });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        error: 'Password must be at least 6 characters long',
        timestamp: expect.any(String)
      });
    });

    it('should return 409 for existing user', async () => {
      mockAuthService.register.mockResolvedValue({
        success: false,
        error: 'User already exists'
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'existing@example.com',
          password: 'password123',
          name: 'User'
        });

      expect(response.status).toBe(409);
      expect(response.body).toEqual({
        success: false,
        error: 'User already exists',
        timestamp: expect.any(String)
      });
    });
  });

  describe('POST /api/auth/verify', () => {
    it('should verify valid token', async () => {
      const mockUser = { id: '1', email: 'test@example.com' };
      mockAuthService.verifyToken.mockResolvedValue({
        success: true,
        user: mockUser
      });

      const response = await request(app)
        .post('/api/auth/verify')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        user: mockUser,
        timestamp: expect.any(String)
      });
    });

    it('should return 401 for invalid token', async () => {
      mockAuthService.verifyToken.mockResolvedValue({
        success: false,
        error: 'Invalid token'
      });

      const response = await request(app)
        .post('/api/auth/verify')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        success: false,
        error: 'Invalid token',
        timestamp: expect.any(String)
      });
    });

    it('should return 401 for missing token', async () => {
      const response = await request(app)
        .post('/api/auth/verify');

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        success: false,
        error: 'Authorization token required',
        timestamp: expect.any(String)
      });
    });
  });
});