import { Server } from 'socket.io';
import { createServer } from 'http';
import { WebSocketService } from '../webSocketService';
import { realTimePriceService } from '../realTimePriceService';

// Mock dependencies
jest.mock('../realTimePriceService');
jest.mock('../../middleware/auth', () => ({
  authenticateSocketToken: jest.fn()
}));

const mockRealTimePriceService = realTimePriceService as jest.Mocked<typeof realTimePriceService>;

describe('WebSocketService', () => {
  let httpServer: any;
  let webSocketService: WebSocketService;
  let mockSocket: any;

  beforeEach(() => {
    httpServer = createServer();
    webSocketService = new WebSocketService(httpServer);
    
    // Mock socket
    mockSocket = {
      id: 'mock-socket-id',
      user: { id: '1', email: 'test@test.com' },
      join: jest.fn(),
      leave: jest.fn(),
      emit: jest.fn(),
      on: jest.fn(),
      disconnect: jest.fn(),
      handshake: {
        auth: { token: 'mock-token' }
      }
    };

    jest.clearAllMocks();
  });

  afterEach(() => {
    if (webSocketService) {
      // Clean up any intervals
      (webSocketService as any).stopPriceUpdateBroadcast();
    }
  });

  describe('constructor', () => {
    it('should initialize WebSocket service with Socket.IO server', () => {
      expect(webSocketService).toBeDefined();
      expect((webSocketService as any).io).toBeInstanceOf(Server);
    });
  });

  describe('handleConnection', () => {
    it('should handle new client connection', () => {
      const handleConnection = (webSocketService as any).handleConnection.bind(webSocketService);
      
      handleConnection(mockSocket);

      expect(mockSocket.emit).toHaveBeenCalledWith('connected', {
        message: 'WebSocket connection established',
        clientId: mockSocket.id,
        timestamp: expect.any(String)
      });
    });

    it('should set up socket event listeners', () => {
      const handleConnection = (webSocketService as any).handleConnection.bind(webSocketService);
      
      handleConnection(mockSocket);

      expect(mockSocket.on).toHaveBeenCalledWith('subscribe', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('unsubscribe', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('ping', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
    });
  });

  describe('handleSubscription', () => {
    it('should subscribe client to symbols', () => {
      const handleSubscription = (webSocketService as any).handleSubscription.bind(webSocketService);
      const symbols = ['7203', '9984'];

      handleSubscription(mockSocket, { symbols });

      expect(mockSocket.join).toHaveBeenCalledWith('symbol:7203');
      expect(mockSocket.join).toHaveBeenCalledWith('symbol:9984');
      expect(mockSocket.emit).toHaveBeenCalledWith('subscribed', {
        symbols,
        timestamp: expect.any(String)
      });
    });

    it('should handle invalid subscription data', () => {
      const handleSubscription = (webSocketService as any).handleSubscription.bind(webSocketService);

      handleSubscription(mockSocket, { symbols: null });

      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        message: 'Invalid subscription data',
        timestamp: expect.any(String)
      });
    });
  });

  describe('handleUnsubscription', () => {
    it('should unsubscribe client from symbols', () => {
      const handleUnsubscription = (webSocketService as any).handleUnsubscription.bind(webSocketService);
      const symbols = ['7203', '9984'];

      handleUnsubscription(mockSocket, { symbols });

      expect(mockSocket.leave).toHaveBeenCalledWith('symbol:7203');
      expect(mockSocket.leave).toHaveBeenCalledWith('symbol:9984');
      expect(mockSocket.emit).toHaveBeenCalledWith('unsubscribed', {
        symbols,
        timestamp: expect.any(String)
      });
    });
  });

  describe('broadcastPriceUpdates', () => {
    it('should broadcast price updates to subscribed clients', async () => {
      const mockPriceUpdate = {
        symbol: '7203',
        price: 2500,
        change: 50,
        changePercent: 2.0,
        volume: 1000000,
        timestamp: new Date(),
        source: 'mock' as const
      };

      mockRealTimePriceService.getPriceUpdate.mockResolvedValue(mockPriceUpdate);
      
      // Mock the io.to method
      const mockTo = {
        emit: jest.fn()
      };
      (webSocketService as any).io.to = jest.fn().mockReturnValue(mockTo);

      // Add a symbol to active subscriptions
      (webSocketService as any).clients.set(mockSocket.id, {
        socket: mockSocket,
        user: mockSocket.user,
        subscriptions: new Set(['7203'])
      });

      await (webSocketService as any).broadcastPriceUpdates();

      expect(mockRealTimePriceService.getPriceUpdate).toHaveBeenCalledWith('7203');
      expect((webSocketService as any).io.to).toHaveBeenCalledWith('symbol:7203');
      expect(mockTo.emit).toHaveBeenCalledWith('priceUpdate', {
        updates: [mockPriceUpdate],
        timestamp: expect.any(String)
      });
    });

    it('should handle price update errors gracefully', async () => {
      mockRealTimePriceService.getPriceUpdate.mockRejectedValue(new Error('Price fetch failed'));

      // Add a symbol to active subscriptions
      (webSocketService as any).clients.set(mockSocket.id, {
        socket: mockSocket,
        user: mockSocket.user,
        subscriptions: new Set(['7203'])
      });

      // Should not throw
      await expect((webSocketService as any).broadcastPriceUpdates()).resolves.not.toThrow();
    });
  });

  describe('getActiveSymbols', () => {
    it('should return unique symbols from all client subscriptions', () => {
      const clients = new Map();
      clients.set('client1', {
        socket: mockSocket,
        user: { id: '1' },
        subscriptions: new Set(['7203', '9984'])
      });
      clients.set('client2', {
        socket: mockSocket,
        user: { id: '2' },
        subscriptions: new Set(['7203', '6758'])
      });

      (webSocketService as any).clients = clients;

      const activeSymbols = (webSocketService as any).getActiveSymbols();

      expect(activeSymbols).toEqual(['7203', '9984', '6758']);
    });

    it('should return empty array when no clients', () => {
      (webSocketService as any).clients = new Map();

      const activeSymbols = (webSocketService as any).getActiveSymbols();

      expect(activeSymbols).toEqual([]);
    });
  });
});