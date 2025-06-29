/**
 * WebSocketサービス - リアルタイム価格配信
 */

import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { authenticateSocketToken } from '../middleware/auth';
import { TestLogger } from '../utils/testLogger';
import { realTimePriceService } from './realTimePriceService';

export interface ClientSubscription {
  userId: number;
  symbols: Set<string>;
  socket: Socket;
  lastActivity: Date;
}

export interface PriceUpdateMessage {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: Date;
  source: 'live' | 'mock';
}

class WebSocketService {
  private io: SocketIOServer;
  private clients: Map<string, ClientSubscription> = new Map();
  private logger: TestLogger;
  private updateInterval: NodeJS.Timeout | null = null;

  constructor(httpServer: HttpServer) {
    this.logger = new TestLogger('WebSocketService');
    
    // Socket.IOサーバー初期化
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.NODE_ENV === 'production' 
          ? process.env.ALLOWED_ORIGINS?.split(',') || []
          : ['http://localhost:3000', 'http://127.0.0.1:3000'],
        credentials: true,
        methods: ['GET', 'POST']
      },
      pingTimeout: 60000,
      pingInterval: 25000,
      transports: ['websocket', 'polling']
    });

    this.setupEventHandlers();
    this.startPriceUpdateBroadcast();
    
    this.logger.info('WebSocket service initialized');
  }

  private setupEventHandlers() {
    this.io.on('connection', async (socket: Socket) => {
      try {
        // 認証チェック
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
          socket.emit('error', { message: 'Authentication required' });
          socket.disconnect();
          return;
        }

        const user = await authenticateSocketToken(token);
        if (!user) {
          socket.emit('error', { message: 'Invalid token' });
          socket.disconnect();
          return;
        }

        // クライアント登録
        const clientId = socket.id;
        this.clients.set(clientId, {
          userId: user.id,
          symbols: new Set(),
          socket,
          lastActivity: new Date()
        });

        this.logger.info(`Client connected: ${clientId} (User: ${user.id})`);

        // 接続成功通知
        socket.emit('connected', {
          clientId,
          message: 'WebSocket connection established',
          timestamp: new Date()
        });

        // イベントハンドラー設定
        this.setupClientEventHandlers(socket, clientId);

      } catch (error) {
        this.logger.error('Connection error:', error);
        socket.emit('error', { message: 'Connection failed' });
        socket.disconnect();
      }
    });
  }

  private setupClientEventHandlers(socket: Socket, clientId: string) {
    // 銘柄購読
    socket.on('subscribe', (data: { symbols: string[] }) => {
      const client = this.clients.get(clientId);
      if (!client) return;

      data.symbols.forEach(symbol => {
        client.symbols.add(symbol.toUpperCase());
      });

      client.lastActivity = new Date();
      
      this.logger.info(`Client ${clientId} subscribed to: ${data.symbols.join(', ')}`);
      socket.emit('subscribed', { 
        symbols: Array.from(client.symbols),
        timestamp: new Date()
      });
    });

    // 銘柄購読解除
    socket.on('unsubscribe', (data: { symbols: string[] }) => {
      const client = this.clients.get(clientId);
      if (!client) return;

      data.symbols.forEach(symbol => {
        client.symbols.delete(symbol.toUpperCase());
      });

      client.lastActivity = new Date();
      
      this.logger.info(`Client ${clientId} unsubscribed from: ${data.symbols.join(', ')}`);
      socket.emit('unsubscribed', { 
        symbols: data.symbols,
        timestamp: new Date()
      });
    });

    // ハートビート
    socket.on('ping', () => {
      const client = this.clients.get(clientId);
      if (client) {
        client.lastActivity = new Date();
      }
      socket.emit('pong');
    });

    // 切断処理
    socket.on('disconnect', (reason) => {
      this.clients.delete(clientId);
      this.logger.info(`Client disconnected: ${clientId} (Reason: ${reason})`);
    });

    // エラーハンドリング
    socket.on('error', (error) => {
      this.logger.error(`Socket error for client ${clientId}:`, error);
    });
  }

  private startPriceUpdateBroadcast() {
    // 5秒間隔で価格更新を配信
    this.updateInterval = setInterval(async () => {
      try {
        await this.broadcastPriceUpdates();
      } catch (error) {
        this.logger.error('Price update broadcast error:', error);
      }
    }, 5000);

    this.logger.info('Price update broadcast started (5s interval)');
  }

  private async broadcastPriceUpdates() {
    if (this.clients.size === 0) return;

    // 全クライアントが購読している銘柄を収集
    const allSymbols = new Set<string>();
    this.clients.forEach(client => {
      client.symbols.forEach(symbol => allSymbols.add(symbol));
    });

    if (allSymbols.size === 0) return;

    // 価格データ取得
    const priceUpdates = await realTimePriceService.getMultiplePriceUpdates(Array.from(allSymbols));

    // 各クライアントに該当する銘柄の更新を送信
    this.clients.forEach((client, clientId) => {
      if (client.symbols.size === 0) return;

      const clientUpdates = priceUpdates.filter(update => 
        client.symbols.has(update.symbol)
      );

      if (clientUpdates.length > 0) {
        client.socket.emit('priceUpdate', {
          updates: clientUpdates,
          timestamp: new Date()
        });

        // アクティビティ更新
        client.lastActivity = new Date();
      }
    });

    if (priceUpdates.length > 0) {
      this.logger.debug(`Broadcasted price updates for ${priceUpdates.length} symbols to ${this.clients.size} clients`);
    }
  }

  /**
   * 特定の銘柄の価格更新を即座に配信
   */
  public async broadcastImmediatePriceUpdate(symbol: string, priceData: PriceUpdateMessage) {
    const targetClients = Array.from(this.clients.values()).filter(client => 
      client.symbols.has(symbol.toUpperCase())
    );

    if (targetClients.length === 0) return;

    targetClients.forEach(client => {
      client.socket.emit('priceUpdate', {
        updates: [priceData],
        timestamp: new Date()
      });
    });

    this.logger.info(`Immediate price update sent for ${symbol} to ${targetClients.length} clients`);
  }

  /**
   * クライアント統計情報
   */
  public getStats() {
    const totalSymbols = new Set<string>();
    let totalSubscriptions = 0;

    this.clients.forEach(client => {
      totalSubscriptions += client.symbols.size;
      client.symbols.forEach(symbol => totalSymbols.add(symbol));
    });

    return {
      connectedClients: this.clients.size,
      totalSymbols: totalSymbols.size,
      totalSubscriptions,
      symbols: Array.from(totalSymbols)
    };
  }

  /**
   * 非アクティブクライアントのクリーンアップ
   */
  public cleanupInactiveClients() {
    const now = new Date();
    const inactiveThreshold = 5 * 60 * 1000; // 5分

    const inactiveClients = Array.from(this.clients.entries()).filter(([_, client]) => 
      now.getTime() - client.lastActivity.getTime() > inactiveThreshold
    );

    inactiveClients.forEach(([clientId, client]) => {
      client.socket.disconnect();
      this.clients.delete(clientId);
      this.logger.info(`Removed inactive client: ${clientId}`);
    });

    return inactiveClients.length;
  }

  /**
   * サービス停止
   */
  public shutdown() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }

    this.clients.forEach((client, clientId) => {
      client.socket.disconnect();
    });
    
    this.clients.clear();
    this.io.close();
    
    this.logger.info('WebSocket service shutdown');
  }
}

export { WebSocketService };