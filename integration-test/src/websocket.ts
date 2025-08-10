/* eslint-disable no-unused-vars */
import WebSocket from 'ws';
import { PlayerRole } from './MastermindGame.js';

type Message = Record<string, any>;

export class WebSocketService {
  private socket: WebSocket;
  private gameId: string;
  private url: string;
  private role: PlayerRole;
  public messageHandler?: (_data: Message, role: PlayerRole) => Promise<void>;
  public lastReceivedMessage: any;
  public isClosed: boolean;

  private reconnectTimeout?: NodeJS.Timeout;
  private pingInterval?: NodeJS.Timeout;
  private isReconnecting: boolean;

  constructor(
    gameId: string,
    role: PlayerRole,
    url: string = process.env.WEB_SOCKET_URL || 'ws://host.docker.internal:3000'
  ) {
    this.gameId = gameId;
    this.url = url;
    this.role = role;
    this.isClosed = false;
    this.isReconnecting = false;
    this.socket = this.connect();
  }

  private connect(): WebSocket {
    const socket = new WebSocket(this.url);

    socket.on('open', () => {
      console.log(`WebSocket Connected to ${this.url} as ${this.role}`);
      this.isReconnecting = false;

      // Send join message
      this.send({ action: 'join', gameId: this.gameId });

      // Start keep-alive ping every 25s
      this.startPing(socket);
    });

    socket.on('message', async (data, isBinary) => {
      try {
        const message = isBinary ? data : data.toString();
        const parsed = JSON.parse(message.toString());
        this.lastReceivedMessage = parsed;
        await this.onMessage({ data: parsed });
      } catch (err) {
        console.error('WebSocket Failed to handle message:', err);
      }
    });

    socket.on('close', (code, reason) => {
      console.warn(
        `WebSocket Connection closed. Code: ${code}, Reason: ${reason.toString()}`
      );
      this.stopPing();

      if (!this.isClosed && !this.isReconnecting) {
        this.isReconnecting = true;
        clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = setTimeout(() => {
          console.warn('Attempting reconnect...');
          this.socket = this.connect();
        }, 1000);
      }
    });

    socket.on('error', (err) => {
      console.error('WebSocket Error:', err.message);
    });

    return socket;
  }

  private startPing(socket: WebSocket) {
    this.stopPing();
    this.pingInterval = setInterval(() => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.ping();
      }
    }, 25000); // 25s to avoid typical 30s idle timeouts
  }

  private stopPing() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = undefined;
    }
  }

  private async onMessage(event: { data: any }) {
    try {
      const data =
        typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
      await this.messageHandler?.(data, this.role);
    } catch (e) {
      console.error('Failed to parse message:', e);
    }
  }

  send(msg: object) {
    if (this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(msg));
    } else {
      console.warn('WebSocket not open. Message dropped (or queue for later).');
      setTimeout(() => {
         this.send(msg);
      }, 1000);
    }
  }

  close() {
    this.isClosed = true;
    clearTimeout(this.reconnectTimeout);
    this.stopPing();
    this.socket.close();
  }
}
