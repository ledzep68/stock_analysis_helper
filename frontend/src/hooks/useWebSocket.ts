import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

export interface PriceUpdate {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: Date;
  source: 'live' | 'mock';
}

export interface WebSocketState {
  connected: boolean;
  connecting: boolean;
  error: string | null;
  lastUpdate: Date | null;
}

export interface UseWebSocketReturn {
  state: WebSocketState;
  priceUpdates: Map<string, PriceUpdate>;
  subscribe: (symbols: string[]) => void;
  unsubscribe: (symbols: string[]) => void;
  connect: () => void;
  disconnect: () => void;
}

export const useWebSocket = (): UseWebSocketReturn => {
  const socketRef = useRef<Socket | null>(null);
  const [state, setState] = useState<WebSocketState>({
    connected: false,
    connecting: false,
    error: null,
    lastUpdate: null
  });
  
  const [priceUpdates, setPriceUpdates] = useState<Map<string, PriceUpdate>>(new Map());

  const connect = useCallback(() => {
    if (socketRef.current?.connected) {
      return;
    }

    setState(prev => ({ ...prev, connecting: true, error: null }));

    const token = localStorage.getItem('token');
    if (!token) {
      setState(prev => ({ 
        ...prev, 
        connecting: false, 
        error: 'No authentication token found' 
      }));
      return;
    }

    const socketUrl = process.env.REACT_APP_WS_URL || 'http://localhost:5003';
    
    const socket = io(socketUrl, {
      auth: {
        token
      },
      transports: ['websocket', 'polling'],
      timeout: 10000,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    socket.on('connect', () => {
      console.log('📡 WebSocket connected');
      setState(prev => ({ 
        ...prev, 
        connected: true, 
        connecting: false, 
        error: null 
      }));
    });

    socket.on('connected', (data) => {
      console.log('✅ WebSocket connection confirmed:', data);
    });

    socket.on('disconnect', (reason) => {
      console.log('❌ WebSocket disconnected:', reason);
      setState(prev => ({ 
        ...prev, 
        connected: false, 
        connecting: false 
      }));
    });

    socket.on('connect_error', (error) => {
      console.error('🚨 WebSocket connection error:', error);
      setState(prev => ({ 
        ...prev, 
        connected: false, 
        connecting: false, 
        error: error.message || 'Connection failed' 
      }));
    });

    socket.on('error', (error) => {
      console.error('🚨 WebSocket error:', error);
      setState(prev => ({ 
        ...prev, 
        error: error.message || 'WebSocket error' 
      }));
    });

    socket.on('priceUpdate', (data: { updates: PriceUpdate[], timestamp: string }) => {
      console.log('📊 Price updates received:', data.updates);
      
      setPriceUpdates(prev => {
        const newMap = new Map(prev);
        data.updates.forEach(update => {
          newMap.set(update.symbol, {
            ...update,
            timestamp: new Date(update.timestamp)
          });
        });
        return newMap;
      });

      setState(prev => ({ 
        ...prev, 
        lastUpdate: new Date(data.timestamp) 
      }));
    });

    socket.on('subscribed', (data: { symbols: string[], timestamp: string }) => {
      console.log('✅ Subscribed to symbols:', data.symbols);
    });

    socket.on('unsubscribed', (data: { symbols: string[], timestamp: string }) => {
      console.log('✅ Unsubscribed from symbols:', data.symbols);
    });

    socket.on('pong', () => {
      // ハートビート応答
    });

    socketRef.current = socket;

  }, []);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setState({
        connected: false,
        connecting: false,
        error: null,
        lastUpdate: null
      });
      setPriceUpdates(new Map());
      console.log('📡 WebSocket disconnected manually');
    }
  }, []);

  const subscribe = useCallback((symbols: string[]) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('subscribe', { symbols });
      console.log('📋 Subscribing to symbols:', symbols);
    } else {
      console.warn('⚠️ WebSocket not connected, cannot subscribe');
    }
  }, []);

  const unsubscribe = useCallback((symbols: string[]) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('unsubscribe', { symbols });
      console.log('📋 Unsubscribing from symbols:', symbols);
    }
  }, []);

  // 定期的にハートビート送信
  useEffect(() => {
    const interval = setInterval(() => {
      if (socketRef.current?.connected) {
        socketRef.current.emit('ping');
      }
    }, 30000); // 30秒間隔

    return () => clearInterval(interval);
  }, []);

  // クリーンアップ - コンポーネントがアンマウントされる時のみ
  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        console.log('📡 WebSocket disconnected on cleanup');
      }
    };
  }, []); // 空の依存配列で、アンマウント時のみ実行

  return {
    state,
    priceUpdates,
    subscribe,
    unsubscribe,
    connect,
    disconnect
  };
};