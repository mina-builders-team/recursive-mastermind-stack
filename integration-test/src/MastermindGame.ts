/* eslint-disable no-unused-vars */
import {
  AccountUpdate,
  Mina,
  Field,
  PrivateKey,
  PublicKey,
  Signature,
  UInt64,
  Poseidon,
  Transaction,
} from 'o1js';
import {
  Combination,
  MastermindZkApp,
  StepProgram,
  StepProgramProof,
} from 'stan-mastermind';
import { WebSocketService } from './websocket.js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const NETWORK_NAME = process.env.MINA_NETWORK || 'unknown';
const PROOFS_FILE_PATH = path.join(process.cwd(), 'proofs.json');

const SALT = Field(1);
const SOLUTION = Combination.from([1, 2, 3, 4]);
export const REFEREE = PublicKey.fromBase58(
  process.env.SERVER_PUBLIC_KEY as string
);
const REWARD_AMOUNT = 1e10;
const SERVER_URL = `${process.env.SERVER_URL}`;
export enum PlayerRole {
  CODE_BREAKER,
  CODE_MASTER,
}
export class MastermindGame {
  codeMasterKey: PrivateKey;
  codeBreakerKey: PrivateKey;
  zkAppKey: PrivateKey;
  zkApp: MastermindZkApp;
  gameId: string;
  codeMasterWebSocket?: WebSocketService;
  codeBreakerWebSocket?: WebSocketService;
  lastReceivedProof?: StepProgramProof;
  attempts: number;
  penalizedPlayer?: PlayerRole;
  lastPlayedTimestamp: number;
  relayingTotalTime: number;
  autoPlay?: boolean = false;
  constructor(options: {
    codeMasterPrivateKeyBase58: string;
    codeBreakerPrivateKeyBase58: string;
    attempts?: number;
    penalizedPlayer?: PlayerRole;
    autoPlay?: boolean;
    gameKey?: string;
  }) {
    this.attempts = options?.attempts || 8;
    this.lastPlayedTimestamp = 0;
    this.relayingTotalTime = 0;
    this.penalizedPlayer = options?.penalizedPlayer;
    this.autoPlay = options?.autoPlay ?? true;
    this.codeMasterKey = PrivateKey.fromBase58(
      options.codeMasterPrivateKeyBase58
    );
    this.codeBreakerKey = PrivateKey.fromBase58(
      options.codeBreakerPrivateKeyBase58
    );
    this.zkAppKey = options.gameKey
      ? PrivateKey.fromBase58(options.gameKey)
      : PrivateKey.random();
    const zkAppPubKey = this.zkAppKey.toPublicKey();
    this.gameId = zkAppPubKey.toBase58();
    this.zkApp = new MastermindZkApp(zkAppPubKey);
    if (this.autoPlay) {
      this.play();
    }
  }
  async play() {
    await this.createGame();
    await this.acceptGame();
    this.startGame();
  }
  async createGame() {
    console.log('Creating Game: ', this.gameId);
    this.joinGame(PlayerRole.CODE_MASTER);

    const tx = await Mina.transaction(
      { sender: this.codeMasterKey.toPublicKey(), fee: 1e8 },
      async () => {
        AccountUpdate.fundNewAccount(this.codeMasterKey.toPublicKey());
        await this.zkApp.deploy();
        await this.zkApp.initGame(
          SOLUTION,
          SALT,
          REFEREE,
          UInt64.from(REWARD_AMOUNT)
        );
      }
    );
    await tx.prove();
    tx.sign([this.codeMasterKey, this.zkAppKey]);
    const sentAt = Date.now();
    const sentTx = await tx.send();
    console.log(`Tx hash: ${sentTx.hash}`);
    const res = await sentTx.wait();
    const waitingTime = Date.now() - sentAt;
    console.log(
      `Tx ${res.status} after ${Math.floor(waitingTime / 60000)
        .toString()
        .padStart(2, '0')}:${Math.floor((waitingTime % 60000) / 1000)
        .toString()
        .padStart(2, '0')} `
    );

    const existingProof = await this.getStoredProof(0);
    const { proof } = existingProof
      ? { proof: existingProof }
      : await StepProgram.createGame(
          {
            authPubKey: this.codeMasterKey.toPublicKey(),
            authSignature: Signature.create(this.codeMasterKey, [
              ...SOLUTION.digits,
              SALT,
            ]),
          },
          SOLUTION,
          SALT
        );
    if (!existingProof) {
      this.storeProofData(proof);
    }
    this.codeMasterWebSocket?.send({
      action: 'sendProof',
      gameId: this.gameId,
      zkProof: JSON.stringify(proof),
      rewardAmount: REWARD_AMOUNT,
      refereePubKeyBase58: REFEREE.toBase58(),
      playerPubKeyBase58: this.codeMasterKey.toPublicKey().toBase58(),
    });
  }
  async acceptGame(): Promise<Transaction<true, true>> {
    this.joinGame(PlayerRole.CODE_BREAKER);
    while (true) {
      console.log('Accepting Game: ', this.gameId);
      try {
        const codeBreakerPubKey = this.codeBreakerKey.toPublicKey();
        const tx = await Mina.transaction(
          { sender: codeBreakerPubKey, fee: 1e8 },
          async () => {
            await this.zkApp.acceptGame();
          }
        );
        await fetch(
          `${SERVER_URL}/games/accept/${codeBreakerPubKey.toBase58()}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ gameId: this.gameId }),
          }
        );
        return (await tx.prove()).sign([this.codeBreakerKey]);
      } catch (e) {
        console.log('Error : ', e);
        console.log('Re-accepting the game ');
      }
    }
  }
  async makeGuess(correct = false) {
    const turnCount = Number(
      this.lastReceivedProof!.publicOutput.turnCount.value
    );
    console.log('making guess');
    const existingProof = await this.getStoredProof(Number(turnCount));

    const guess = correct
      ? Combination.from([1, 2, 3, 4])
      : Combination.from([1, 5, 7, 4]);
    const { proof } = existingProof
      ? { proof: existingProof }
      : await StepProgram.makeGuess(
          {
            authPubKey: this.codeBreakerKey.toPublicKey(),
            authSignature: Signature.create(this.codeBreakerKey, [
              ...guess.digits,
              this.lastReceivedProof!.publicOutput.turnCount.value,
            ]),
          },
          this.lastReceivedProof!,
          guess
        );
    if (!existingProof) {
      this.storeProofData(proof);
    }

    this.codeBreakerWebSocket?.send({
      action: 'sendProof',
      gameId: this.gameId,
      zkProof: JSON.stringify(proof),
    });
    this.lastPlayedTimestamp = Date.now();
  }
  async giveClue() {
    console.log('giving clue');
    const turnCount = Number(
      this.lastReceivedProof!.publicOutput.turnCount.value
    );
    const existingProof = await this.getStoredProof(Number(turnCount));

    const { proof } = existingProof
      ? { proof: existingProof }
      : await StepProgram.giveClue(
          {
            authPubKey: this.codeMasterKey.toPublicKey(),
            authSignature: Signature.create(this.codeMasterKey, [
              ...SOLUTION.digits,
              SALT,
              this.lastReceivedProof!.publicOutput.turnCount.value,
            ]),
          },
          this.lastReceivedProof!,
          SOLUTION,
          SALT
        );
    if (!existingProof) {
      this.storeProofData(proof);
    }
    this.codeMasterWebSocket?.send({
      action: 'sendProof',
      gameId: this.gameId,
      zkProof: JSON.stringify(proof),
    });
    this.lastPlayedTimestamp = Date.now();
  }
  startGame() {
    this.codeBreakerWebSocket?.send({
      action: 'startGame',
      gameId: this.gameId,
    });
  }
  joinGame(role: PlayerRole) {
    if (
      role === PlayerRole.CODE_BREAKER &&
      this.codeBreakerWebSocket?.isClosed !== false
    ) {
      this.codeBreakerWebSocket = new WebSocketService(
        this.gameId,
        PlayerRole.CODE_BREAKER
      );
      this.codeBreakerWebSocket.messageHandler = this.webSocketMessageHandler;
    } else if (
      role === PlayerRole.CODE_MASTER &&
      this.codeMasterWebSocket?.isClosed !== false
    ) {
      this.codeMasterWebSocket = new WebSocketService(
        this.gameId,
        PlayerRole.CODE_MASTER
      );
      this.codeMasterWebSocket.messageHandler = this.webSocketMessageHandler;
    }
  }
  async cancelGame() {
    try {
      const codeMasterPubKey = this.codeMasterKey.toPublicKey();
      const tx = await Mina.transaction(
        { sender: codeMasterPubKey, fee: 1e8 },
        async () => {
          await this.zkApp.claimReward();
        }
      );
      await tx.prove();
      tx.sign([this.codeBreakerKey]);
      const sentAt = Date.now();
      const sentTx = await tx.send();
      const signature = Signature.create(this.codeMasterKey, [
        Poseidon.hash(PublicKey.fromBase58(this.gameId).toFields()),
      ]).toBase58();
      await fetch(`${SERVER_URL}/games/cancel/${this.gameId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signedData: { signature } }),
      });

      const awaitedTx = await sentTx.wait();
      const waitingTime = Date.now() - sentAt;
      console.log(
        `${awaitedTx.status} after ${Math.floor(waitingTime / 60000)
          .toString()
          .padStart(2, '0')}:${Math.floor((waitingTime % 60000) / 1000)
          .toString()
          .padStart(2, '0')} `
      );
    } catch (e) {
      console.log('Error : ', e);
      console.log('Re-accepting the game ');
    }
  }
  async setAutoPlay(autoPlay: boolean) {
    this.autoPlay = autoPlay;
  }
  private webSocketMessageHandler = async (data: any, role: PlayerRole) => {
    try {
      const recivedAt = Date.now();
      if (['ENDED', 'PENALIZED'].includes(data?.game?.status)) {
        console.log(
          'Game Ended  (since last action) ',
          this.lastPlayedTimestamp
            ? (recivedAt - this.lastPlayedTimestamp) / 1000
            : 0,
          's'
        );
        const isWinner =
          (role === PlayerRole.CODE_MASTER &&
            data.game?.winnerPublicKeyBase58 ===
              this.codeMasterKey.toPublicKey().toBase58()) ||
          (role === PlayerRole.CODE_BREAKER &&
            data.game?.winnerPublicKeyBase58 ===
              this.codeBreakerKey.toPublicKey().toBase58());
        if (isWinner) {
          this.updateRelayingTotalTime(recivedAt);
          console.log(
            'relaying average time : ',
            this.relayingTotalTime / 1000 / (this.attempts * 2)
          );
        }
        if (this.autoPlay) {
          this.codeBreakerWebSocket?.close();
          this.codeMasterWebSocket?.close();
        }
        return;
      }
      if (data?.game?.lastProof) {
        this.lastReceivedProof = await StepProgramProof.fromJSON(
          JSON.parse(data?.game?.lastProof)
        );
        const turnCount = Number(
          this.lastReceivedProof.publicOutput.turnCount.value
        );
        if (
          this.penalizedPlayer === role &&
          turnCount >= this.attempts * 2 - 1
        ) {
          console.log(
            'Penalizing... (since last action) ',
            this.lastPlayedTimestamp
              ? (recivedAt - this.lastPlayedTimestamp) / 1000
              : 0,
            's'
          );
          await new Promise((res) => setTimeout(res, 1000 * 160));
          this.codeMasterWebSocket?.send({
            action: 'penalize',
            gameId: this.gameId,
          });
          this.lastPlayedTimestamp = Date.now();
          return;
        }
        if (data.game?.status === 'IN_PROGRESS') {
          if (turnCount % 2 !== 0 && role === PlayerRole.CODE_BREAKER) {
            console.log(
              'Making guess... (since last action) ',
              this.lastPlayedTimestamp
                ? (recivedAt - this.lastPlayedTimestamp) / 1000
                : 0,
              's'
            );
            this.updateRelayingTotalTime(recivedAt);
            if (this.autoPlay) {
              const generateCorrectAnswer = turnCount === this.attempts * 2 - 1;
              await this.makeGuess(generateCorrectAnswer);
            }
          } else if (turnCount % 2 === 0 && role === PlayerRole.CODE_MASTER) {
            console.log(
              'Giving clue... (since last action) ',
              this.lastPlayedTimestamp
                ? (recivedAt - this.lastPlayedTimestamp) / 1000
                : 0,
              's'
            );

            this.updateRelayingTotalTime(recivedAt);
            if (this.autoPlay) {
              await this.giveClue();
            }
          }
        }
      }
    } catch (err) {
      console.error(`${this.gameId} Error handling message:`, err);
    }
  };
  private updateRelayingTotalTime = (recivedAt: number) => {
    this.relayingTotalTime +=
      this.lastPlayedTimestamp && recivedAt - this.lastPlayedTimestamp;
  };
  private storeProofData(proof: StepProgramProof) {
    try {
      const proofJson = JSON.stringify(proof.toJSON());

      let currentData: any = {};
      if (fs.existsSync(PROOFS_FILE_PATH)) {
        const raw = fs.readFileSync(PROOFS_FILE_PATH, 'utf-8');
        currentData = raw ? JSON.parse(raw) : {};
      }

      if (!currentData[NETWORK_NAME]) {
        currentData[NETWORK_NAME] = {
          gameId: this.gameId,
          gameKey: this.zkAppKey.toBase58(),
          codeMasterPrivateKeyBase58: this.codeMasterKey.toBase58(),
          codeBreakerPrivateKeyBase58: this.codeBreakerKey.toBase58(),
          attempts: this.attempts,
          proofs: [],
        };
      }

      currentData[NETWORK_NAME].proofs.push(JSON.parse(proofJson));

      fs.writeFileSync(PROOFS_FILE_PATH, JSON.stringify(currentData, null, 2));
    } catch (err) {
      console.error(`Failed to store proof for game ${this.gameId}:`, err);
    }
  }
  private async getStoredProof(
    turnCount: number
  ): Promise<StepProgramProof | undefined> {
    try {
      if (!fs.existsSync(PROOFS_FILE_PATH)) return undefined;

      const raw = fs.readFileSync(PROOFS_FILE_PATH, 'utf-8');
      if (!raw) return undefined;

      const data = JSON.parse(raw);
      const gameEntry = data[NETWORK_NAME];

      if (!gameEntry || !gameEntry.proofs || !gameEntry.proofs[turnCount])
        return undefined;
      const proof = await StepProgramProof.fromJSON(
        gameEntry.proofs[turnCount]
      );
      return proof;
    } catch (err) {
      console.error(
        `Error while retrieving stored proof for turn ${turnCount}:`,
        err
      );
      return undefined;
    }
  }
}
