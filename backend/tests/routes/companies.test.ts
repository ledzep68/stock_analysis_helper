import request from 'supertest';
import express from 'express';
import companiesRouter from '../../src/routes/companies';
import { authenticateToken } from '../../src/middleware/auth';

// Mock the middleware
jest.mock('../../src/middleware/auth', () => ({
  authenticateToken: jest.fn((req, res, next) => {
    req.user = { id: '1', email: 'test@example.com' };
    next();
  })
}));

// Mock the database service
jest.mock('../../src/config/sqlite', () => ({
  db: {
    all: jest.fn(),
    get: jest.fn(),
    run: jest.fn()
  }
}));

import { db } from '../../src/config/sqlite';

const mockDb = db as jest.Mocked<typeof db>;

describe('Companies Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/companies', companiesRouter);
    jest.clearAllMocks();
  });

  describe('GET /api/companies/search', () => {
    it('should search companies by query', async () => {
      const mockCompanies = [
        {
          symbol: '7203',
          name: 'トヨタ自動車',
          market: 'TSE',
          sector: '輸送用機器',
          industry: '自動車・輸送機器'
        },
        {
          symbol: '7201',
          name: '日産自動車',
          market: 'TSE',
          sector: '輸送用機器',
          industry: '自動車・輸送機器'
        }
      ];

      mockDb.all.mockResolvedValue(mockCompanies);

      const response = await request(app)
        .get('/api/companies/search?q=トヨタ')
        .set('Authorization', 'Bearer mock-token');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        companies: mockCompanies,
        total: 2,
        timestamp: expect.any(String)
      });
    });

    it('should return empty results for no matches', async () => {
      mockDb.all.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/companies/search?q=nonexistent')
        .set('Authorization', 'Bearer mock-token');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        companies: [],
        total: 0,
        timestamp: expect.any(String)
      });
    });

    it('should return 400 for missing query parameter', async () => {
      const response = await request(app)
        .get('/api/companies/search')
        .set('Authorization', 'Bearer mock-token');

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        error: 'Search query is required',
        timestamp: expect.any(String)
      });
    });

    it('should return 400 for short query', async () => {
      const response = await request(app)
        .get('/api/companies/search?q=a')
        .set('Authorization', 'Bearer mock-token');

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        error: 'Search query must be at least 2 characters long',
        timestamp: expect.any(String)
      });
    });

    it('should handle database errors', async () => {
      mockDb.all.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/companies/search?q=トヨタ')
        .set('Authorization', 'Bearer mock-token');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        error: 'Failed to search companies',
        timestamp: expect.any(String)
      });
    });
  });

  describe('GET /api/companies/:symbol', () => {
    it('should get company by symbol', async () => {
      const mockCompany = {
        symbol: '7203',
        name: 'トヨタ自動車',
        market: 'TSE',
        sector: '輸送用機器',
        industry: '自動車・輸送機器',
        description: 'Japanese automotive manufacturer'
      };

      mockDb.get.mockResolvedValue(mockCompany);

      const response = await request(app)
        .get('/api/companies/7203')
        .set('Authorization', 'Bearer mock-token');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        company: mockCompany,
        timestamp: expect.any(String)
      });
    });

    it('should return 404 for non-existent company', async () => {
      mockDb.get.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/companies/INVALID')
        .set('Authorization', 'Bearer mock-token');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        success: false,
        error: 'Company not found',
        timestamp: expect.any(String)
      });
    });

    it('should validate symbol format', async () => {
      const response = await request(app)
        .get('/api/companies/invalid-symbol-format')
        .set('Authorization', 'Bearer mock-token');

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        error: 'Invalid symbol format',
        timestamp: expect.any(String)
      });
    });
  });

  describe('GET /api/companies/:symbol/financial', () => {
    it('should get financial data for company', async () => {
      const mockFinancialData = {
        symbol: '7203',
        price: 2500,
        change: 50,
        changePercent: 2.04,
        volume: 1000000,
        marketCap: 25000000000,
        pe: 12.5,
        eps: 200,
        dividendYield: 0.025,
        week52High: 2800,
        week52Low: 2000,
        previousClose: 2450
      };

      // Mock the hybrid API service
      jest.doMock('../../src/services/hybridApiService', () => ({
        hybridApiService: {
          getFinancialData: jest.fn().mockResolvedValue(mockFinancialData)
        }
      }));

      const response = await request(app)
        .get('/api/companies/7203/financial')
        .set('Authorization', 'Bearer mock-token');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        data: mockFinancialData,
        timestamp: expect.any(String)
      });
    });

    it('should handle API errors', async () => {
      jest.doMock('../../src/services/hybridApiService', () => ({
        hybridApiService: {
          getFinancialData: jest.fn().mockRejectedValue(new Error('API Error'))
        }
      }));

      const response = await request(app)
        .get('/api/companies/7203/financial')
        .set('Authorization', 'Bearer mock-token');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        error: 'Failed to fetch financial data',
        timestamp: expect.any(String)
      });
    });
  });

  describe('Authentication', () => {
    it('should require authentication for all routes', async () => {
      // Mock authentication failure
      (authenticateToken as jest.Mock).mockImplementation((req, res, next) => {
        res.status(401).json({ error: 'Unauthorized' });
      });

      const response = await request(app)
        .get('/api/companies/search?q=トヨタ');

      expect(response.status).toBe(401);
    });
  });
});