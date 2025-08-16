import { defineStore } from 'pinia';
import ZkappWorkerClient from '../zkappWorkerClient';
import { WebSocketService } from '../services/websocket';
import axios from 'axios';
import { Poseidon, PublicKey } from 'o1js';
import { Game } from '@/types';
import { getStoredGame, updateLocalStorageGames } from '@/utils';

export interface SignedData {
  publicKey: string;
  data: string;
  signature: string;
}

interface ProviderError extends Error {
  message: string;
  code: number;
  data?: unknown;
}
type ChainInfoArgs = {
  networkID: string;
};

interface MinaWallet {
  requestAccounts: () => Promise<string[]>;
  signFields: (args: {
    message: Array<string | number>;
  }) => Promise<SignedData | ProviderError>;
  on: (event: string, handler: Function) => void;
  switchChain: (args: ChainInfoArgs) => Promise<ChainInfoArgs | ProviderError>;
  requestNetwork: () => Promise<ChainInfoArgs>;
  getAccounts: () => Promise<string[]>;
}

declare global {
  interface Window {
    mina?: MinaWallet;
  }
}
const SERVER_URL = import.meta.env.VITE_SERVER_URL;
export const useZkAppStore = defineStore('useZkAppModule', {
  state: () => ({
    zkappWorkerClient: null as null | ZkappWorkerClient,
    hasWallet: null as null | boolean,
    isOnValidChain: null as null | boolean,
    stepDisplay: '' as string,
    hasBeenSetup: false,
    accountExists: false,
    publicKeyBase58: null as null | any,
    requestedConnexion: false,
    error: null as Object | any,
    loading: false,
    lastTurnTransactionHash: '',
    currentTransactionLink: '',
    submitGameTransactionHash: '',
    claimRewardTransactionHash: '',
    cancelGameTransactionHash: '',
    zkAppStates: null as null | any,
    zkProofStates: null as null | any,
    compiled: false,
    zkAppAddress: null as null | string,
    webSocketInstance: null as null | WebSocketService,
    userRole: null as null | string,
    game: null as null | Game,
    menuStep: 'RULES',
    isTurnPlayed: false,
    isPlayingOnChain: false,
    currentSlot: null as null | number,
    benchmark: null as null | {
      initGameTxDuration: number;
      createGameProofDuration: number;
      guessProofDuration: number;
      clueProofDuration: number;
    },
  }),
  getters: {},
  actions: {
    async setupZkApp() {
      try {
        this.requestedConnexion = true;
        this.stepDisplay = 'Loading web worker...';
        this.zkappWorkerClient = new ZkappWorkerClient();
        let accounts = await window.mina?.getAccounts();
        if (accounts?.[0]) {
          this.publicKeyBase58 = accounts?.[0];
        }
        this.stepDisplay = 'Setting Mina instance...';
        await this.zkappWorkerClient.setMinaActiveInstance();
        await this.zkappWorkerClient.loadContract();
        this.stepDisplay = 'Compiling zkApp...';
        await this.zkappWorkerClient.compileContract();
        this.stepDisplay = '';
        this.compiled = true;
        this.hasBeenSetup = true;
        console.log('setup completed...');
        this.error = null;
      } catch (error: any) {
        return { message: error.message };
      }
    },
    async syncMinaChain() {
      const currentMinaNetworkId: ChainInfoArgs = await window.mina
        ?.requestNetwork()
        .catch((err: any) => err);
      const minaNetwork = import.meta.env.VITE_MINA_NETWORK;
      const minaNetworkId =
        minaNetwork === 'mainnet'
          ? 'mina:mainnet'
          : minaNetwork === 'devnet'
            ? 'mina:devnet'
            : 'mina:testnet';
      this.isOnValidChain = currentMinaNetworkId.networkID === minaNetworkId;
      if (!this.isOnValidChain) {
        const switchResult = await window.mina
          ?.switchChain({
            networkID: minaNetworkId,
          })
          .catch((err: any) => err);
        if (switchResult.networkID) {
          this.isOnValidChain = true;
        }
      }
    },
    async joinGame(gameId?: string) {
      const currentGame = gameId ?? (this.zkAppAddress as string);
      if (this.webSocketInstance?.gameId === currentGame) return;
      // @ts-ignore
      this.webSocketInstance = new WebSocketService(currentGame);
      this.webSocketInstance!.setCallback(async (data: any) => {
        await this.setLastProof(data.zkProof);
        await this.getZkAppStates();
        await this.getZkProofStates();
      });
    },
    async signFields(content: object): Promise<SignedData> {
      try {
        this.stepDisplay = 'Signing...';

        const signedData = await (window as any).mina.signFields({
          message: content,
        });

        this.stepDisplay = '';
        return signedData;
      } catch (err: any) {
        console.log('error ', err);
        throw new Error(err?.message || 'Signing failed');
      }
    },
    async createInitGameTransaction(
      separatedSecretCombination: number[],
      salt: string,
      rewardAmount: number,
      roomName: string
    ) {
      try {
        this.loading = true;
        const hasEnoughFunds = await this.zkappWorkerClient?.hasEnoughFunds(
          this.publicKeyBase58,
          rewardAmount
        );
        if (!hasEnoughFunds) {
          throw new Error("You don't have enough funds!");
        }
        this.stepDisplay = 'Creating a transaction...';
        this.zkAppAddress =
          await this.zkappWorkerClient!.createInitGameTransaction(
            this.publicKeyBase58,
            separatedSecretCombination,
            salt,
            rewardAmount
          );
        const signedData = await this.signFields([
          ...separatedSecretCombination,
          salt,
          ...PublicKey.fromBase58(this.zkAppAddress)
            .toFields()
            .map((e) => e.toString()),
        ]);
        await this.joinGame();
        this.stepDisplay = 'Generating proof...';
        await this.zkappWorkerClient!.proveTransaction();

        this.stepDisplay = 'Getting transaction JSON...';
        const transactionJSON =
          await this.zkappWorkerClient!.getTransactionJSON();

        this.stepDisplay = 'Requesting send transaction...';
        await new Promise((res) => setTimeout(res, 5000));
        if (!this.webSocketInstance?.connected) {
          throw new Error(
            'we are currently experiencing some problems! please come back later!'
          );
        }
        this.setPlayingOnChain(false);
        const { hash } = await (window as any).mina.sendTransaction({
          transaction: transactionJSON,
          feePayer: {
            memo: '',
          },
        });
        this.currentTransactionLink = hash;
        const res = await this.zkappWorkerClient!.sendNewGameProof(
          signedData,
          separatedSecretCombination,
          salt
        );
        this.game = {
          status: 'PENDING',
          _id: this.zkAppAddress,
          lastProof: JSON.stringify(res),
          timestamp: Date.now(),
          rewardAmount: rewardAmount,
          turnCount: 1,
          codeMaster: this.publicKeyBase58,
          roomName,
          gameCreationTransactionHash: hash,
        };
        this.webSocketInstance?.send({
          action: 'sendProof',
          gameId: this.zkAppAddress,
          zkProof: JSON.stringify(res),
          rewardAmount,
          playerPubKeyBase58: this.publicKeyBase58,
          roomName,
          gameCreationTransactionHash: hash,
        });
        this.stepDisplay = '';
        this.error = null;
      } catch (err: any) {
        this.error = err?.message || err;
        console.log('error ', err);
        return null;
      } finally {
        this.loading = false;
      }
      return this.zkAppAddress;
    },
    async createGuessProof(combination: number[]) {
      try {
        this.loading = true;
        this.stepDisplay = 'Creating signature...';
        const signedData = await this.signFields([
          ...combination,
          this.zkProofStates.turnCount,
          ...PublicKey.fromBase58(this.zkAppAddress as string)
            .toFields()
            .map((e) => e.toString()),
        ]);
        if (signedData) {
          this.isTurnPlayed = true;
          this.stepDisplay = 'Generating proof...';
          const res = await this.zkappWorkerClient!.createGuessProof(
            signedData,
            combination
          );
          this.stepDisplay = 'Sending proof...';
          this.webSocketInstance?.send({
            action: 'sendProof',
            gameId: this.zkAppAddress,
            zkProof: JSON.stringify(res),
          });
          await this.getZkProofStates();
        }

        this.error = null;
      } catch (err: any) {
        this.isTurnPlayed = false;
        this.error = err?.message || err;
        console.log('error ', err);
      } finally {
        this.loading = false;
        this.stepDisplay = '';
        return this.zkAppAddress;
      }
    },
    async createGiveClueProof(combination: number[], randomSalt: string) {
      try {
        this.loading = true;
        this.stepDisplay = 'Creating signature...';
        const signedData = await this.signFields([
          ...combination,
          randomSalt,
          this.zkProofStates.turnCount,
          ...PublicKey.fromBase58(this.zkAppAddress as string)
            .toFields()
            .map((e) => e.toString()),
        ]);
        if (signedData) {
          this.isTurnPlayed = true;
          this.stepDisplay = 'Generating proof...';
          const res = await this.zkappWorkerClient!.createGiveClueProof(
            signedData,
            combination,
            randomSalt
          );
          this.stepDisplay = 'Sending proof...';
          this.webSocketInstance?.send({
            action: 'sendProof',
            gameId: this.zkAppAddress,
            zkProof: JSON.stringify(res),
          });
          await this.getZkProofStates();
        }
        this.error = null;
      } catch (err: any) {
        this.isTurnPlayed = false;
        this.error = err?.message || err;
        console.log('error ', err);
      } finally {
        this.stepDisplay = '';
        this.loading = false;
        return this.zkAppAddress;
      }
    },
    async createGuessTransaction(combination: number[]) {
      try {
        this.loading = true;
        this.isTurnPlayed = true;
        await this.zkappWorkerClient!.createGuessTransaction(
          this.publicKeyBase58,
          combination
        );
        this.stepDisplay = 'Generating proof...';
        await this.zkappWorkerClient!.proveTransaction();

        this.stepDisplay = 'Getting transaction JSON...';
        const transactionJSON =
          await this.zkappWorkerClient!.getTransactionJSON();

        this.stepDisplay = 'Requesting send transaction...';
        const { hash } = await (window as any).mina.sendTransaction({
          transaction: transactionJSON,
          feePayer: {
            memo: '',
          },
        });
        this.lastTurnTransactionHash = hash;
        updateLocalStorageGames(this.zkAppAddress as string, {
          lastTurnTransactionHash: hash,
        });
        this.error = null;
      } catch (err: any) {
        this.isTurnPlayed = false;
        this.error = err?.message || err;
        console.log('error ', err);
      } finally {
        this.loading = false;
        this.stepDisplay = '';
        return this.zkAppAddress;
      }
    },
    async createGiveClueTransaction(combination: number[], randomSalt: string) {
      try {
        this.loading = true;
        this.isTurnPlayed = true;
        this.stepDisplay = 'Generating Transaction...';
        await this.zkappWorkerClient!.createGiveClueTransaction(
          this.publicKeyBase58,
          combination,
          randomSalt
        );
        this.stepDisplay = 'Generating proof...';
        await this.zkappWorkerClient!.proveTransaction();

        this.stepDisplay = 'Getting transaction JSON...';
        const transactionJSON =
          await this.zkappWorkerClient!.getTransactionJSON();

        this.stepDisplay = 'Requesting send transaction...';
        const { hash } = await (window as any).mina.sendTransaction({
          transaction: transactionJSON,
          feePayer: {
            memo: '',
          },
        });
        this.lastTurnTransactionHash = hash;
        updateLocalStorageGames(this.zkAppAddress as string, {
          lastTurnTransactionHash: hash,
        });
        this.error = null;
      } catch (err: any) {
        this.isTurnPlayed = false;
        this.error = err?.message || err;
        console.log('error ', err);
      } finally {
        this.stepDisplay = '';
        this.loading = false;
        return this.zkAppAddress;
      }
    },
    async submitGameProof(proof: string, winnerPubKeyBase58?: string) {
      try {
        this.loading = true;
        this.stepDisplay = 'Creating a transaction...';
        await this.zkappWorkerClient!.submitGameProof(
          proof,
          winnerPubKeyBase58
        );
        this.stepDisplay = 'Generating proof...';
        await this.zkappWorkerClient!.proveTransaction();
        this.stepDisplay = 'Getting transaction JSON...';
        const transactionJSON =
          await this.zkappWorkerClient!.getTransactionJSON();
        this.stepDisplay = 'Requesting send transaction...';
        const { hash } = await (window as any).mina.sendTransaction({
          transaction: transactionJSON,
          feePayer: {
            memo: '',
          },
        });
        this.submitGameTransactionHash = hash;
        updateLocalStorageGames(this.zkAppAddress as string, {
          submitGameTransactionHash: hash,
        });
        this.stepDisplay = '';
        this.error = null;
      } catch (err: any) {
        this.error = err?.message || err;
        console.log('error ', err);
      } finally {
        this.stepDisplay = '';
        this.loading = false;
      }
    },
    async initZkappInstance(zkAppAddress: string) {
      await this.zkappWorkerClient!.initZkappInstance(zkAppAddress);
      this.zkAppAddress = zkAppAddress;
    },
    async getZkAppStates() {
      try {
        console.log('fetching zkApp states ...');
        this.zkAppStates = await this.zkappWorkerClient!.getZkAppStates();
        this.error = null;
      } catch (err: any) {
        this.error = err.message;
      }
    },
    async getZkProofStates() {
      try {
        this.zkProofStates = await this.zkappWorkerClient!.getZkProofStates();
        this.error = null;
      } catch (err: any) {
        this.error = err.message;
      }
    },
    async setLastProof(zkProof: any) {
      await this.zkappWorkerClient!.setLastProof(zkProof);
    },
    async acceptGame() {
      try {
        this.loading = true;
        const hasEnoughFunds = await this.zkappWorkerClient?.hasEnoughFunds(
          this.publicKeyBase58,
          this.zkAppStates.rewardAmount
        );
        if (!hasEnoughFunds) {
          throw new Error("You don't have enough funds!");
        }
        this.stepDisplay = 'Creating a transaction...';
        await this.zkappWorkerClient!.createAcceptGameTransaction(
          this.publicKeyBase58
        );
        this.stepDisplay = 'Generating proof...';
        await this.zkappWorkerClient!.proveTransaction();
        this.stepDisplay = 'Getting transaction JSON...';
        const transactionJSON =
          await this.zkappWorkerClient!.getTransactionJSON();
        this.stepDisplay = 'Requesting send transaction...';
        const { hash } = await (window as any).mina.sendTransaction({
          transaction: transactionJSON,
          feePayer: {
            memo: '',
          },
        });
        this.currentTransactionLink = hash;
        await this.joinGame();
        this.stepDisplay = '';
        this.error = null;
        await axios.post(SERVER_URL + `/games/accept`, {
          gameId: this.zkAppAddress,
          userId: this.publicKeyBase58,
        });
      } catch (err: any) {
        this.error = err?.message || err;
        console.log('error ', err);
      } finally {
        this.loading = false;
      }
    },
    async claimRewardTransaction() {
      try {
        this.loading = true;
        this.stepDisplay = 'Creating a transaction...';
        await this.zkappWorkerClient!.createClaimRewardTransaction(
          this.publicKeyBase58
        );
        this.stepDisplay = 'Generating proof...';
        await this.zkappWorkerClient!.proveTransaction();
        this.stepDisplay = 'Getting transaction JSON...';
        const transactionJSON =
          await this.zkappWorkerClient!.getTransactionJSON();
        this.stepDisplay = 'Requesting send transaction...';
        const { hash } = await (window as any).mina.sendTransaction({
          transaction: transactionJSON,
          feePayer: {
            memo: '',
          },
        });
        this.currentTransactionLink = hash;
        this.claimRewardTransactionHash = hash;
        updateLocalStorageGames(this.zkAppAddress as string, {
          claimRewardTransactionHash: hash,
        });

        this.stepDisplay = '';
        this.error = null;
      } catch (err: any) {
        this.error = err?.message || err;
        console.log('error ', err);
      } finally {
        this.stepDisplay = '';
        this.loading = false;
      }
    },
    async getRole() {
      this.userRole = await this.zkappWorkerClient!.getUserRole(
        this.publicKeyBase58
      );
    },
    async setGame(game: Game) {
      if (
        this.game?.status !== 'IN_PROGRESS' &&
        game.status === 'IN_PROGRESS'
      ) {
        await this.getZkAppStates();
      }
      this.game = game;
    },
    async getGame(gameId: string) {
      try {
        const res = await axios.get(SERVER_URL + `/games/${gameId}`);
        if (res?.data?.game) {
          await this.setGame(res?.data?.game);
        }
        this.error = null;
        return res?.data?.game;
      } catch (err: any) {
        this.error = err?.message || err;
        console.log('error ', err);
      }
    },
    startGame() {
      this.webSocketInstance?.send({
        action: 'startGame',
        gameId: this.zkAppAddress,
      });
    },
    penalizePlayer() {
      this.webSocketInstance?.send({
        action: 'penalize',
        gameId: this.zkAppAddress,
      });
    },
    async cancelGame(gameId: string) {
      try {
        this.loading = true;
        const signedData = await this.signFields([
          Poseidon.hash(PublicKey.fromBase58(gameId).toFields()).toString(),
        ]);
        if (signedData) {
          this.stepDisplay = 'Creating a transaction...';
          await this.zkappWorkerClient!.createCancelGameTransaction(
            this.publicKeyBase58,
            gameId
          );
          this.stepDisplay = 'Generating proof...';
          await this.zkappWorkerClient!.proveTransaction();
          this.stepDisplay = 'Getting transaction JSON...';
          const transactionJSON =
            await this.zkappWorkerClient!.getTransactionJSON();
          this.stepDisplay = 'Requesting send transaction...';
          const { hash } = await (window as any).mina.sendTransaction({
            transaction: transactionJSON,
            feePayer: {
              memo: '',
            },
          });
          this.cancelGameTransactionHash = hash;
          updateLocalStorageGames(this.zkAppAddress as string, {
            cancelGameTransactionHash: hash,
          });
          const res = await axios.post(SERVER_URL + `/games/cancel/${gameId}`, {
            signedData,
            hash,
          });
          if (res?.data?.game) {
            this.setGame(res?.data?.game);
          }
          this.stepDisplay = '';
          this.error = null;
        }
      } catch (err: any) {
        this.error = err?.message || err;
        console.log('error ', err);
      } finally {
        this.loading = false;
        return this.cancelGameTransactionHash;
      }
    },
    async clearGame() {
      this.webSocketInstance?.close();
      this.game = null;
      this.userRole = null;
      this.webSocketInstance = null;
      this.zkAppAddress = null;
      this.zkProofStates = null;
      this.zkAppStates = null;
      this.lastTurnTransactionHash = '';
      this.submitGameTransactionHash = '';
      this.claimRewardTransactionHash = '';
      this.cancelGameTransactionHash = '';
    },
    setMenuStep(step: string) {
      this.menuStep = step;
    },
    setTurnPlayed(isTurnPlayed: boolean) {
      this.isTurnPlayed = isTurnPlayed;
    },
    async verifyProof(zkProof: string): Promise<boolean> {
      return (await this.zkappWorkerClient?.verifyProof(zkProof)) ?? false;
    },
    setLoading(loading: boolean) {
      this.loading = loading;
    },
    setStepDisplay(step: string) {
      this.stepDisplay = step;
    },
    async setPlayingOnChain(isOnChain: boolean, gamedId?: string) {
      this.isPlayingOnChain = isOnChain;
      if (isOnChain) {
        await this.getZkAppStates();
        const game: any = getStoredGame(
          (this.zkAppAddress || gamedId) as string
        );
        const proof = game?.lastProof;
        if (proof) {
          await this.setLastProof(proof);
          await this.getZkProofStates();
        }
      }
    },
    async fetchCurrentSlot() {
      this.currentSlot = await this.zkappWorkerClient!.fetchCurrentSlot();
    },
    getStoredTransactionsHash() {
      const game: any = getStoredGame(this.zkAppAddress as string);
      this.submitGameTransactionHash = game?.submitGameTransactionHash;
      this.claimRewardTransactionHash = game?.claimRewardTransactionHash;
      this.lastTurnTransactionHash = game.lastTurnTransactionHash;
    },
    setLastTurnTransactionHash(hash: string) {
      this.lastTurnTransactionHash = hash;
    },
    async startBenchmark() {
      this.benchmark = await this.zkappWorkerClient!.benchmark(
        import.meta.env.VITE_SERVER_PUBLIC_KEY
      );
      if (
        this.benchmark?.initGameTxDuration &&
        this.benchmark?.clueProofDuration &&
        this.benchmark?.guessProofDuration &&
        this.benchmark?.createGameProofDuration
      ) {
        localStorage.setItem('benchmark', JSON.stringify(this.benchmark));
      }
    },
    async establishConnection() {
      if (!this.webSocketInstance?.connected) {
        this.webSocketInstance?.open();
        await new Promise((res) => setTimeout(res, 5000));
        if (this.isPlayingOnChain) {
          this.isPlayingOnChain = false;
        }
      }
    },
    async disconnect() {
      this.publicKeyBase58 = null;
    },
    async connect() {
      if (window.mina) {
        await this.syncMinaChain();
        const accounts = await window.mina?.requestAccounts();
        this.publicKeyBase58 = accounts?.[0];
        this.stepDisplay = 'Checking if fee payer account exists...';
        const res = await this.zkappWorkerClient?.fetchAccount(
          this.publicKeyBase58
        );
        this.accountExists = res?.error === null;
        window.mina?.on('accountsChanged', async (accounts: string[]) => {
          if (accounts.length) {
            this.publicKeyBase58 = accounts[0];
          } else {
            const newAccounts = await window.mina?.requestAccounts();
            this.publicKeyBase58 = newAccounts?.[0];
          }
          if (this.zkAppAddress) {
            await this.getRole();
          }
        });
      } else {
        this.hasWallet = false;
        this.error = {
          message: 'Mina Wallet not detected. Please install Auro Wallet.',
        };
        return;
      }
    },
    destroyWebsocket() {
      this.webSocketInstance = null;
    },
  },
});
