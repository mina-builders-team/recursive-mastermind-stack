import { useWebSocket } from '@vueuse/core';
import { useZkAppStore } from '@/store/zkAppModule';
import { updateLocalStorageGames } from '@/utils';
import { useCustomMessage } from '@/composables/useCustomMessage';
import router from '@/router';

export class WebSocketService {
  socket: ReturnType<typeof useWebSocket>;
  gameId: string;
  connected: boolean;
  onMessageCallback: ((data: any) => void) | null = null;

  constructor(gameId: string) {
    this.gameId = gameId;
    this.connected = false;
    console.log('web socket server : ', import.meta.env.VITE_WEB_SOCKET_URL);
    this.socket = useWebSocket(import.meta.env.VITE_WEB_SOCKET_URL, {
      autoReconnect: {
        retries: 5,
        delay: 1000,
        onFailed: async () => {
          const { setPlayingOnChain } = useZkAppStore();
          console.error('Max reconnection attempts reached!');
          await setPlayingOnChain(true);
          this.connected = false;
        },
      },
      immediate: true,
      onMessage: async (_ws: WebSocket, event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          console.log('Received data:', data);
          const {
            setTurnPlayed,
            verifyProof,
            setGame,
            setPlayingOnChain,
            isPlayingOnChain,
            zkAppAddress,
          } = useZkAppStore();
          if (data.zkProof) {
            const isValidProof = await verifyProof(data.zkProof);
            if (!isValidProof) {
              throw new Error('Invalid zkProof!');
            }
            setTurnPlayed(false);
            updateLocalStorageGames(zkAppAddress as string, {
              lastProof: data.zkProof,
            });
            if (this.onMessageCallback && !isPlayingOnChain)
              this.onMessageCallback(data);
          }
          if (data.game) {
            if (data?.game.status === 'ON_CHAIN') {
              await setPlayingOnChain(true);
              return;
            }
            await setGame(data.game);
          }
        } catch (e) {
          console.log('Error handling message:', e);
        }
      },
      onConnected: async (_ws: WebSocket) => {
        this.send({ action: 'join', gameId });
        this.connected = true;
      },
      onDisconnected: (_ws: WebSocket, event: CloseEvent) => {
        const { destroyWebsocket } = useZkAppStore();
        const { showMessage } = useCustomMessage();
        console.warn(`WebSocket disconnected with code: ${event.code}`);
        if (event.code === 1008) {
          console.warn(
            'WebSocket closed due to server-side rejection (1008). Disabling reconnect.'
          );
          this.close();
          destroyWebsocket();
          showMessage({
            type: 'error',
            title: 'Connection Limit Reached',
            description: 'Too many connections from this IP',
            duration: 6000,
          });
          router.push({ name: 'lobby' });
          throw new Error('Too many connections from this IP');
        }
      },
    });
  }

  setCallback(callback: (data: any) => void) {
    this.onMessageCallback = callback;
  }

  send(msg: object) {
    this.socket.send(JSON.stringify(msg));
  }

  open() {
    this.socket.open();
  }

  close() {
    this.socket.close();
    this.connected = false;
  }
}
