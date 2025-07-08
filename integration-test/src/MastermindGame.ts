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
} from 'o1js';
import {
  Combination,
  MastermindZkApp,
  StepProgram,
  StepProgramProof,
} from '@navigators-exploration-team/mina-mastermind';
import { WebSocketService } from './websocket.js';
import dotenv from 'dotenv';

dotenv.config();
const SALT = Field.random();
const SOLUTION = Combination.from([1, 2, 3, 4]);
export const REFEREE = PublicKey.fromBase58(
  process.env.SERVER_PUBLIC_KEY as string
);
const REWARD_AMOUNT = 1e10;
const SERVER_URL = `${process.env.SERVER_URL}:${process.env.SERVER_PORT}`;
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
    this.zkAppKey = PrivateKey.random();
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
    this.joinGame(PlayerRole.CODE_MASTER);
    const { proof } = await StepProgram.createGame(
      {
        authPubKey: this.codeMasterKey.toPublicKey(),
        authSignature: Signature.create(this.codeMasterKey, [
          ...SOLUTION.digits,
          SALT,
          ...this.zkAppKey.toPublicKey().toFields(),
        ]),
      },
      SOLUTION,
      SALT,
      this.zkAppKey.toPublicKey()
    );

    this.codeMasterWebSocket?.send({
      action: 'sendProof',
      gameId: this.gameId,
      zkProof: JSON.stringify(proof),
      rewardAmount: REWARD_AMOUNT,
      refereePubKeyBase58: REFEREE.toBase58(),
      playerPubKeyBase58: this.codeMasterKey.toPublicKey().toBase58(),
    });
  }
  async acceptGame() {
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
        await tx.prove();
        tx.sign([this.codeBreakerKey]);
        const sentAt = Date.now();
        const sentTx = await tx.send();
        await fetch(
          `${SERVER_URL}/games/accept/${codeBreakerPubKey.toBase58()}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ gameId: this.gameId }),
          }
        );

        const res = await sentTx.wait();
        const waitingTime = Date.now() - sentAt;
        console.log(
          `${res.status} after ${Math.floor(waitingTime / 60000)
            .toString()
            .padStart(2, '0')}:${Math.floor((waitingTime % 60000) / 1000)
            .toString()
            .padStart(2, '0')} `
        );
        break;
      } catch (e) {
        console.log('Error : ', e);
        console.log('Re-accepting the game ');
      }
    }
  }
  async makeGuess(correct = false) {
    const guess = correct
      ? Combination.from([1, 2, 3, 4])
      : Combination.from([1, 5, 7, 4]);
    const { proof } = await StepProgram.makeGuess(
      {
        authPubKey: this.codeBreakerKey.toPublicKey(),
        authSignature: Signature.create(this.codeBreakerKey, [
          ...guess.digits,
          this.lastReceivedProof!.publicOutput.turnCount.value,
          ...this.zkAppKey.toPublicKey().toFields(),
        ]),
      },
      this.lastReceivedProof!,
      guess,
      this.zkAppKey.toPublicKey()
    );
    this.codeBreakerWebSocket?.send({
      action: 'sendProof',
      gameId: this.gameId,
      zkProof: JSON.stringify(proof),
    });
    this.lastPlayedTimestamp = Date.now();
  }
  async giveClue() {
    const { proof } = await StepProgram.giveClue(
      {
        authPubKey: this.codeMasterKey.toPublicKey(),
        authSignature: Signature.create(this.codeMasterKey, [
          ...SOLUTION.digits,
          SALT,
          this.lastReceivedProof!.publicOutput.turnCount.value,
          ...this.zkAppKey.toPublicKey().toFields(),
        ]),
      },
      this.lastReceivedProof!,
      SOLUTION,
      SALT,
      this.zkAppKey.toPublicKey()
    );
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
      if (data.zkProof) {
        this.lastReceivedProof = await StepProgramProof.fromJSON(
          JSON.parse(data.zkProof)
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
}
