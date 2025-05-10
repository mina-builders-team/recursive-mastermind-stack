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
  private isClosed: boolean;
  constructor(
    gameId: string,
    role: PlayerRole,
    url: string = process.env.WEB_SOCKET_URL || 'ws://host.docker.internal:3000'
  ) {
    this.gameId = gameId;
    this.url = url;
    this.role = role;
    this.isClosed = false;
    this.socket = this.connect();
  }

  private connect(): WebSocket {
    const socket = new WebSocket(this.url);

    socket.on('open', () => {
      console.log(`WebSocket Connected to ${this.url}`);
      this.send({ action: 'join', gameId: this.gameId });
    });

    socket.on('message', async (data, isBinary) => {
      try {
        const message = isBinary ? data : data.toString();
        const parsed = JSON.parse(message.toString());
        await this.onMessage({ data: parsed });
      } catch (err) {
        console.error('WebSocket Failed to handle message:', err);
      }
    });

    socket.on('close', () => {
      if (!this.isClosed) {
        console.warn('WebSocket Connection closed. Attempting reconnect...');
        setTimeout(() => {
          this.socket = this.connect();
        }, 1000);
      }
    });

    socket.on('error', (err) => {
      console.error('WebSocket Error:', err.message);
    });

    return socket;
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
      console.warn('WebSocket Tried to send but socket not open.');
    }
  }

  close() {
    this.socket.close();
    this.isClosed = true;
  }
}
