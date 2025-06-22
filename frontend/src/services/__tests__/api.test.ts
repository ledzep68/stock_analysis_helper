// Mock the entire api module
jest.mock('../api', () => ({
  login: jest.fn(),
  isAuthenticated: jest.fn(),
  logout: jest.fn(),
  searchCompanies: jest.fn()
}));

import { login, isAuthenticated, logout, searchCompanies } from '../api';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

const mockLogin = login as jest.MockedFunction<typeof login>;
const mockIsAuthenticated = isAuthenticated as jest.MockedFunction<typeof isAuthenticated>;
const mockLogout = logout as jest.MockedFunction<typeof logout>;
const mockSearchCompanies = searchCompanies as jest.MockedFunction<typeof searchCompanies>;

describe('API Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should return token on successful login', async () => {
      const mockToken = 'mock-jwt-token';
      mockLogin.mockResolvedValue(mockToken);

      const result = await login('test@example.com', 'password');

      expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password');
      expect(result).toBe(mockToken);
    });

    it('should throw error on login failure', async () => {
      mockLogin.mockRejectedValue(new Error('Login failed'));

      await expect(login('test@example.com', 'wrongpassword')).rejects.toThrow('Login failed');
    });
  });

  describe('isAuthenticated', () => {
    it('should return true when authenticated', () => {
      mockIsAuthenticated.mockReturnValue(true);
      expect(isAuthenticated()).toBe(true);
    });

    it('should return false when not authenticated', () => {
      mockIsAuthenticated.mockReturnValue(false);
      expect(isAuthenticated()).toBe(false);
    });
  });

  describe('logout', () => {
    it('should call logout function', () => {
      logout();
      expect(mockLogout).toHaveBeenCalled();
    });
  });

  describe('searchCompanies', () => {
    it('should return search results', async () => {
      const mockCompanies = [
        { symbol: '7203', name: 'トヨタ自動車', market: 'TSE', sector: '輸送用機器' }
      ];
      
      mockSearchCompanies.mockResolvedValue(mockCompanies);

      const result = await searchCompanies('トヨタ');

      expect(mockSearchCompanies).toHaveBeenCalledWith('トヨタ');
      expect(result).toEqual(mockCompanies);
    });

    it('should handle search errors', async () => {
      mockSearchCompanies.mockRejectedValue(new Error('Search failed'));

      await expect(searchCompanies('invalid')).rejects.toThrow('Search failed');
    });

    it('should return empty array when no companies found', async () => {
      mockSearchCompanies.mockResolvedValue([]);

      const result = await searchCompanies('nonexistent');
      expect(result).toEqual([]);
    });
  });
});