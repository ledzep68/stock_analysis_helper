import { renderHook, act } from '@testing-library/react';
import { useWebSocket } from '../useWebSocket';
import { io } from 'socket.io-client';

// Mock socket.io-client
jest.mock('socket.io-client');

const mockIo = io as jest.MockedFunction<typeof io>;

describe('useWebSocket', () => {
  let mockSocket: any;

  beforeEach(() => {
    mockSocket = {
      connected: false,
      connect: jest.fn(),
      disconnect: jest.fn(),
      emit: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
      removeAllListeners: jest.fn()
    };

    mockIo.mockReturnValue(mockSocket);

    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn(() => 'mock-token'),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn()
      },
      writable: true
    });

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useWebSocket());

    expect(result.current.state).toEqual({
      connected: false,
      connecting: false,
      error: null,
      lastUpdate: null
    });
    expect(result.current.priceUpdates.size).toBe(0);
  });

  it('should connect to WebSocket server', async () => {
    const { result } = renderHook(() => useWebSocket());

    act(() => {
      result.current.connect();
    });

    expect(mockIo).toHaveBeenCalledWith('ws://localhost:5003', {
      auth: { token: 'mock-token' },
      transports: ['websocket', 'polling'],
      timeout: 10000,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    expect(result.current.state.connecting).toBe(true);
  });

  it('should handle connection success', () => {
    const { result } = renderHook(() => useWebSocket());

    act(() => {
      result.current.connect();
    });

    // Simulate connection event
    const connectHandler = mockSocket.on.mock.calls.find(
      call => call[0] === 'connect'
    )?.[1];

    act(() => {
      connectHandler?.();
    });

    expect(result.current.state.connected).toBe(true);
    expect(result.current.state.connecting).toBe(false);
    expect(result.current.state.error).toBeNull();
  });

  it('should handle connection error', () => {
    const { result } = renderHook(() => useWebSocket());

    act(() => {
      result.current.connect();
    });

    // Simulate connection error
    const errorHandler = mockSocket.on.mock.calls.find(
      call => call[0] === 'connect_error'
    )?.[1];

    act(() => {
      errorHandler?.(new Error('Connection failed'));
    });

    expect(result.current.state.connected).toBe(false);
    expect(result.current.state.connecting).toBe(false);
    expect(result.current.state.error).toBe('Connection failed');
  });

  it('should handle price updates', () => {
    const { result } = renderHook(() => useWebSocket());

    act(() => {
      result.current.connect();
    });

    // Simulate price update event
    const priceUpdateHandler = mockSocket.on.mock.calls.find(
      call => call[0] === 'priceUpdate'
    )?.[1];

    const mockPriceData = {
      updates: [
        {
          symbol: '7203',
          price: 2500,
          change: 50,
          changePercent: 2.0,
          volume: 1000000,
          timestamp: new Date().toISOString(),
          source: 'live'
        }
      ],
      timestamp: new Date().toISOString()
    };

    act(() => {
      priceUpdateHandler?.(mockPriceData);
    });

    expect(result.current.priceUpdates.size).toBe(1);
    expect(result.current.priceUpdates.get('7203')).toEqual({
      symbol: '7203',
      price: 2500,
      change: 50,
      changePercent: 2.0,
      volume: 1000000,
      timestamp: expect.any(Date),
      source: 'live'
    });
  });

  it('should subscribe to symbols', () => {
    const { result } = renderHook(() => useWebSocket());

    // Mock connected state
    mockSocket.connected = true;
    
    act(() => {
      result.current.connect();
    });

    // Simulate connection
    const connectHandler = mockSocket.on.mock.calls.find(
      call => call[0] === 'connect'
    )?.[1];

    act(() => {
      connectHandler?.();
    });

    act(() => {
      result.current.subscribe(['7203', '9984']);
    });

    expect(mockSocket.emit).toHaveBeenCalledWith('subscribe', {
      symbols: ['7203', '9984']
    });
  });

  it('should unsubscribe from symbols', () => {
    const { result } = renderHook(() => useWebSocket());

    mockSocket.connected = true;

    act(() => {
      result.current.connect();
    });

    // Simulate connection
    const connectHandler = mockSocket.on.mock.calls.find(
      call => call[0] === 'connect'
    )?.[1];

    act(() => {
      connectHandler?.();
    });

    act(() => {
      result.current.unsubscribe(['7203']);
    });

    expect(mockSocket.emit).toHaveBeenCalledWith('unsubscribe', {
      symbols: ['7203']
    });
  });

  it('should handle disconnect', () => {
    const { result } = renderHook(() => useWebSocket());

    act(() => {
      result.current.connect();
    });

    act(() => {
      result.current.disconnect();
    });

    expect(mockSocket.disconnect).toHaveBeenCalled();
    expect(result.current.state.connected).toBe(false);
    expect(result.current.priceUpdates.size).toBe(0);
  });

  it('should not connect without authentication token', () => {
    (window.localStorage.getItem as jest.Mock).mockReturnValue(null);

    const { result } = renderHook(() => useWebSocket());

    act(() => {
      result.current.connect();
    });

    expect(result.current.state.error).toBe('No authentication token found');
    expect(result.current.state.connecting).toBe(false);
  });

  it('should warn when trying to subscribe without connection', () => {
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
    const { result } = renderHook(() => useWebSocket());

    act(() => {
      result.current.subscribe(['7203']);
    });

    expect(consoleSpy).toHaveBeenCalledWith('⚠️ WebSocket not connected, cannot subscribe');
    consoleSpy.mockRestore();
  });

  it('should send heartbeat pings', () => {
    jest.useFakeTimers();
    
    const { result } = renderHook(() => useWebSocket());
    
    mockSocket.connected = true;

    act(() => {
      result.current.connect();
    });

    // Fast-forward 30 seconds
    act(() => {
      jest.advanceTimersByTime(30000);
    });

    expect(mockSocket.emit).toHaveBeenCalledWith('ping');

    jest.useRealTimers();
  });

  it('should clean up on unmount', () => {
    const { result, unmount } = renderHook(() => useWebSocket());

    act(() => {
      result.current.connect();
    });

    unmount();

    expect(mockSocket.disconnect).toHaveBeenCalled();
  });
});