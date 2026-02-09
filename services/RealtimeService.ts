
export interface RealtimeMessage {
  type: 'ticket_update' | 'teller_update' | 'category_update' | 'admin_account_update' | 'announce' | 'sync' | 'welcome' | 'pong' | 'request_sync';
  data?: any;
  ticket?: any;
  teller?: any;
  category?: any;
  account?: any;
  ticketNumber?: string;
  counterNumber?: number;
  timestamp?: number;
  message?: string;
  clientCount?: number;
  tickets?: any[];
  categories?: any[];
  tellers?: any[];
  adminAccounts?: any[];
}

class RealtimeService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000;
  private listeners: Map<string, Function[]> = new Map();
  private connectionPromise: Promise<boolean> | null = null;

  constructor() {
    this.connect();
  }

  private getWebSocketUrl(): string {
    // For local development
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'ws://localhost:8080';
    }
    
    // For production (Netlify)
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // You'll need to configure your WebSocket server URL here
    // For Netlify, you'll need a separate WebSocket server
    const wsHost = window.location.hostname === 'peaceful-zuccutto-6c5da1.netlify.app' 
      ? 'your-websocket-server.herokuapp.com'  // You need to deploy a WebSocket server
      : `${window.location.hostname}:8080`;
    
    return `${protocol}//${wsHost}`;
  }

  connect(): Promise<boolean> {
    if (this.connectionPromise) return this.connectionPromise;

    this.connectionPromise = new Promise((resolve) => {
      try {
        const wsUrl = this.getWebSocketUrl();
        console.log('Connecting to WebSocket:', wsUrl);
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          console.log('WebSocket connected successfully');
          this.reconnectAttempts = 0;
          resolve(true);
          
          // Notify listeners
          this.emit('connected', {});
          
          // Start heartbeat
          this.startHeartbeat();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: RealtimeMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          resolve(false);
          this.reconnect();
        };

        this.ws.onclose = () => {
          console.log('WebSocket disconnected');
          this.emit('disconnected', {});
          this.reconnect();
        };
      } catch (error) {
        console.error('Failed to create WebSocket:', error);
        resolve(false);
        this.reconnect();
      }
    });

    return this.connectionPromise;
  }

  private handleMessage(message: RealtimeMessage) {
    switch (message.type) {
      case 'welcome':
        console.log('Server welcome:', message.message, 'Clients:', message.clientCount);
        this.emit('welcome', message);
        break;

      case 'ticket_update':
        this.emit('ticket_update', message.ticket);
        break;

      case 'teller_update':
        this.emit('teller_update', message.teller);
        break;

      case 'category_update':
        this.emit('category_update', message.category);
        break;

      case 'admin_account_update':
        this.emit('admin_account_update', message.account);
        break;

      case 'announce':
        this.emit('announce', {
          ticketNumber: message.ticketNumber,
          counterNumber: message.counterNumber
        });
        break;

      case 'sync':
        this.emit('sync', {
          tickets: message.tickets || [],
          categories: message.categories || [],
          tellers: message.tellers || [],
          adminAccounts: message.adminAccounts || []
        });
        break;

      case 'pong':
        this.emit('pong', { timestamp: message.timestamp });
        break;
    }
  }

  private startHeartbeat() {
    setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.send({ type: 'ping' });
      }
    }, 30000); // Every 30 seconds
  }

  send(message: RealtimeMessage): boolean {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
      return true;
    }
    return false;
  }

  requestSync(): void {
    this.send({ type: 'request_sync' });
  }

  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  off(event: string, callback: Function): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  private emit(event: string, data: any): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in ${event} listener:`, error);
        }
      });
    }
  }

  private reconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      this.emit('connection_failed', { attempts: this.reconnectAttempts });
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1);
    
    console.log(`Reconnecting in ${Math.round(delay / 1000)}s (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
      this.connectionPromise = null;
      this.connect();
    }, delay);
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.listeners.clear();
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  getConnectionStatus(): string {
    if (!this.ws) return 'disconnected';
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING: return 'connecting';
      case WebSocket.OPEN: return 'connected';
      case WebSocket.CLOSING: return 'closing';
      case WebSocket.CLOSED: return 'disconnected';
      default: return 'unknown';
    }
  }
}

// Create singleton instance
export const realtimeService = new RealtimeService();
export default realtimeService;
