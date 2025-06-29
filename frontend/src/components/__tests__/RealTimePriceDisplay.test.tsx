import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { RealTimePriceDisplay } from '../RealTimePriceDisplay';
import { useWebSocket } from '../../hooks/useWebSocket';

// Mock useWebSocket hook
jest.mock('../../hooks/useWebSocket');

const mockUseWebSocket = useWebSocket as jest.MockedFunction<typeof useWebSocket>;

describe('RealTimePriceDisplay', () => {
  const mockWebSocketReturn = {
    state: {
      connected: false,
      connecting: false,
      error: null,
      lastUpdate: null
    },
    priceUpdates: new Map(),
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
    connect: jest.fn(),
    disconnect: jest.fn()
  };

  beforeEach(() => {
    mockUseWebSocket.mockReturnValue(mockWebSocketReturn);
    jest.clearAllMocks();
  });

  it('should render message when no symbols provided', () => {
    render(<RealTimePriceDisplay symbols={[]} />);
    
    expect(screen.getByText('価格を監視する銘柄を選択してください')).toBeInTheDocument();
  });

  it('should render connection status correctly', () => {
    mockUseWebSocket.mockReturnValue({
      ...mockWebSocketReturn,
      state: {
        ...mockWebSocketReturn.state,
        connected: true
      }
    });

    render(<RealTimePriceDisplay symbols={['7203']} />);
    
    expect(screen.getByText('接続中')).toBeInTheDocument();
  });

  it('should render connecting status', () => {
    mockUseWebSocket.mockReturnValue({
      ...mockWebSocketReturn,
      state: {
        ...mockWebSocketReturn.state,
        connecting: true
      }
    });

    render(<RealTimePriceDisplay symbols={['7203']} />);
    
    expect(screen.getByText('接続中...')).toBeInTheDocument();
    expect(screen.getByText('WebSocketに接続中...')).toBeInTheDocument();
  });

  it('should render error state', () => {
    mockUseWebSocket.mockReturnValue({
      ...mockWebSocketReturn,
      state: {
        ...mockWebSocketReturn.state,
        error: 'Connection failed'
      }
    });

    render(<RealTimePriceDisplay symbols={['7203']} />);
    
    expect(screen.getByText('エラー')).toBeInTheDocument();
    expect(screen.getByText('Connection failed')).toBeInTheDocument();
  });

  it('should render price updates', () => {
    const priceUpdates = new Map();
    priceUpdates.set('7203', {
      symbol: '7203',
      price: 2500,
      change: 50,
      changePercent: 2.0,
      volume: 1000000,
      timestamp: new Date(),
      source: 'live' as const
    });

    mockUseWebSocket.mockReturnValue({
      ...mockWebSocketReturn,
      state: {
        ...mockWebSocketReturn.state,
        connected: true
      },
      priceUpdates
    });

    render(<RealTimePriceDisplay symbols={['7203']} />);
    
    expect(screen.getByText('7203')).toBeInTheDocument();
    expect(screen.getByText('¥2,500')).toBeInTheDocument();
    expect(screen.getByText('+50.00 (+2.00%)')).toBeInTheDocument();
    expect(screen.getByText('出来高: 1,000,000')).toBeInTheDocument();
    expect(screen.getByText('LIVE')).toBeInTheDocument();
  });

  it('should render negative price changes correctly', () => {
    const priceUpdates = new Map();
    priceUpdates.set('7203', {
      symbol: '7203',
      price: 2400,
      change: -50,
      changePercent: -2.04,
      volume: 1000000,
      timestamp: new Date(),
      source: 'live' as const
    });

    mockUseWebSocket.mockReturnValue({
      ...mockWebSocketReturn,
      state: {
        ...mockWebSocketReturn.state,
        connected: true
      },
      priceUpdates
    });

    render(<RealTimePriceDisplay symbols={['7203']} />);
    
    expect(screen.getByText('-50.00 (-2.04%)')).toBeInTheDocument();
  });

  it('should handle connection toggle', () => {
    render(<RealTimePriceDisplay symbols={['7203']} />);
    
    const toggleButton = screen.getByRole('button', { name: /接続を開始/ });
    fireEvent.click(toggleButton);
    
    expect(mockWebSocketReturn.connect).toHaveBeenCalled();
  });

  it('should handle disconnection when connected', () => {
    mockUseWebSocket.mockReturnValue({
      ...mockWebSocketReturn,
      state: {
        ...mockWebSocketReturn.state,
        connected: true
      }
    });

    render(<RealTimePriceDisplay symbols={['7203']} />);
    
    const toggleButton = screen.getByRole('button', { name: /接続を切断/ });
    fireEvent.click(toggleButton);
    
    expect(mockWebSocketReturn.disconnect).toHaveBeenCalled();
  });

  it('should handle auto-connect toggle', () => {
    render(<RealTimePriceDisplay symbols={['7203']} />);
    
    const autoConnectSwitch = screen.getByRole('checkbox');
    fireEvent.click(autoConnectSwitch);
    
    // Auto-connect should be toggled
    expect(autoConnectSwitch).not.toBeChecked();
  });

  it('should subscribe to symbols when connected', async () => {
    mockUseWebSocket.mockReturnValue({
      ...mockWebSocketReturn,
      state: {
        ...mockWebSocketReturn.state,
        connected: true
      }
    });

    const { rerender } = render(<RealTimePriceDisplay symbols={[]} />);
    
    // Add symbols
    rerender(<RealTimePriceDisplay symbols={['7203', '9984']} />);
    
    await waitFor(() => {
      expect(mockWebSocketReturn.subscribe).toHaveBeenCalledWith(['7203', '9984']);
    });
  });

  it('should unsubscribe from removed symbols', async () => {
    mockUseWebSocket.mockReturnValue({
      ...mockWebSocketReturn,
      state: {
        ...mockWebSocketReturn.state,
        connected: true
      }
    });

    const { rerender } = render(<RealTimePriceDisplay symbols={['7203', '9984']} />);
    
    // Remove one symbol
    rerender(<RealTimePriceDisplay symbols={['7203']} />);
    
    await waitFor(() => {
      expect(mockWebSocketReturn.unsubscribe).toHaveBeenCalledWith(['9984']);
    });
  });

  it('should call onPriceUpdate callback', async () => {
    const mockOnPriceUpdate = jest.fn();
    const priceUpdates = new Map();
    const priceUpdate = {
      symbol: '7203',
      price: 2500,
      change: 50,
      changePercent: 2.0,
      volume: 1000000,
      timestamp: new Date(),
      source: 'live' as const
    };
    
    priceUpdates.set('7203', priceUpdate);

    mockUseWebSocket.mockReturnValue({
      ...mockWebSocketReturn,
      priceUpdates
    });

    render(
      <RealTimePriceDisplay 
        symbols={['7203']} 
        onPriceUpdate={mockOnPriceUpdate} 
      />
    );
    
    await waitFor(() => {
      expect(mockOnPriceUpdate).toHaveBeenCalledWith('7203', priceUpdate);
    });
  });

  it('should show waiting state for symbols without data', () => {
    mockUseWebSocket.mockReturnValue({
      ...mockWebSocketReturn,
      state: {
        ...mockWebSocketReturn.state,
        connected: true
      }
    });

    render(<RealTimePriceDisplay symbols={['7203']} />);
    
    expect(screen.getByText('データ待機中...')).toBeInTheDocument();
  });

  it('should display connection statistics', () => {
    mockUseWebSocket.mockReturnValue({
      ...mockWebSocketReturn,
      state: {
        ...mockWebSocketReturn.state,
        lastUpdate: new Date()
      }
    });

    render(<RealTimePriceDisplay symbols={['7203', '9984']} />);
    
    expect(screen.getByText(/接続クライアント数: 2/)).toBeInTheDocument();
    expect(screen.getByText(/更新間隔: 5秒/)).toBeInTheDocument();
  });

  it('should format timestamp correctly', () => {
    const timestamp = new Date('2023-01-01T12:00:00Z');
    const priceUpdates = new Map();
    priceUpdates.set('7203', {
      symbol: '7203',
      price: 2500,
      change: 50,
      changePercent: 2.0,
      volume: 1000000,
      timestamp,
      source: 'live' as const
    });

    mockUseWebSocket.mockReturnValue({
      ...mockWebSocketReturn,
      state: {
        ...mockWebSocketReturn.state,
        connected: true,
        lastUpdate: timestamp
      },
      priceUpdates
    });

    render(<RealTimePriceDisplay symbols={['7203']} />);
    
    expect(screen.getByText(/更新:/)).toBeInTheDocument();
  });
});