import {
  AccountUpdate,
  Mina,
  Field,
  PrivateKey,
  PublicKey,
  Signature,
  UInt64,
} from 'o1js';
import {
  Combination,
  MastermindZkApp,
  StepProgram,
  StepProgramProof,
} from '@navigators-exploration-team/mina-mastermind';
import dotenv from 'dotenv';
import { WebSocketService } from './websocket';

const SALT = Field.random();
const SOLUTION = Combination.from([1, 2, 3, 4]);
const REFEREE = PublicKey.fromBase58(
  'B62qiaUDjv6eeRrwVCy68WVb6W2cYe1Bev8vjcoKzr3QNkXFoxFutf5'
);
const SERVER_URL = 'http://localhost:3000';
dotenv.config();

const NETWORK_URL =
  process.env.MINA_NETWORK_URL || 'http://host.docker.internal:8080/graphql';
const network = Mina.Network({ mina: NETWORK_URL });
Mina.setActiveInstance(network);
console.time('compiling');
await StepProgram.compile();
const { verificationKey } = await MastermindZkApp.compile();
console.timeEnd('compiling');

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
  codeMasterWebSocket: WebSocketService;
  codeBreakerWebSocket: WebSocketService;
  lastReceivedProof?: StepProgramProof;
  attempts: number;
  penalizedPlayer?: PlayerRole;
  lastPlayedTimestamp: number;
  relayingAvgTime: number;
  constructor(
    codeMasterPrivateKeyBase58: string,
    codeBreakerPrivateKeyBase58: string,
    attempts: number,
    penalizedPlayer?: PlayerRole
  ) {
    this.attempts = attempts;
    this.lastPlayedTimestamp = 0;
    this.relayingAvgTime = 0;
    this.penalizedPlayer = penalizedPlayer;
    this.codeMasterKey = PrivateKey.fromBase58(codeMasterPrivateKeyBase58);
    this.codeBreakerKey = PrivateKey.fromBase58(codeBreakerPrivateKeyBase58);
    this.zkAppKey = PrivateKey.random();
    const zkAppPubKey = this.zkAppKey.toPublicKey();
    this.gameId = zkAppPubKey.toBase58();
    this.zkApp = new MastermindZkApp(zkAppPubKey);
    this.codeMasterWebSocket = new WebSocketService(
      this.gameId,
      PlayerRole.CODE_MASTER
    );
    this.codeBreakerWebSocket = new WebSocketService(
      this.gameId,
      PlayerRole.CODE_BREAKER
    );
    this.setupWebSocket();
    this.play();
  }

  setupWebSocket() {
    this.codeMasterWebSocket.messageHandler = this.webSocketMessageHandler;
    this.codeBreakerWebSocket.messageHandler = this.webSocketMessageHandler;
  }
  async play() {
    await this.createGame();
    await this.acceptGame();
  }

  async createGame() {
    const tx = await Mina.transaction(
      { sender: this.codeMasterKey.toPublicKey(), fee: 1e8 },
      async () => {
        AccountUpdate.fundNewAccount(this.codeMasterKey.toPublicKey());
        await this.zkApp.deploy();
        await this.zkApp.initGame(
          SOLUTION,
          SALT,
          REFEREE,
          UInt64.from(10000000000)
        );
      }
    );
    await tx.prove();
    tx.sign([this.codeMasterKey, this.zkAppKey]);
    const sentTx = await tx.send();
    console.log(`${this.gameId} Create game Tx hash: ${sentTx.hash}`);
    await sentTx.wait();

    const { proof } = await StepProgram.createGame(
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

    this.codeMasterWebSocket.send({
      action: 'sendProof',
      gameId: this.gameId,
      zkProof: JSON.stringify(proof),
      rewardAmount: 10000000000,
      refereePubKeyBase58: REFEREE.toBase58(),
      playerPubKeyBase58: this.codeMasterKey.toPublicKey().toBase58(),
    });
  }

  async acceptGame() {
    const codeBreakerPubKey = this.codeBreakerKey.toPublicKey();
    const tx = await Mina.transaction(
      { sender: codeBreakerPubKey, fee: 1e8 },
      async () => {
        await this.zkApp.acceptGame();
      }
    );

    await tx.prove();
    tx.sign([this.codeBreakerKey]);
    const sentTx = await tx.send();
    console.log(`${this.gameId} Accept game Tx hash: ${sentTx.hash}`);

    await fetch(`${SERVER_URL}/games/accept/${codeBreakerPubKey.toBase58()}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameId: this.gameId }),
    });

    await sentTx.wait();

    this.codeBreakerWebSocket.send({
      action: 'startGame',
      gameId: this.gameId,
    });
  }

  async makeGuess(correct = false) {
    console.log('Making guess ...');

    const guess = correct
      ? Combination.from([1, 2, 3, 4])
      : Combination.from([1, 5, 7, 4]);
    await new Promise((res) => setTimeout(res, 1000 * 20));
    const { proof } = await StepProgram.makeGuess(
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

    this.codeBreakerWebSocket.send({
      action: 'sendProof',
      gameId: this.gameId,
      zkProof: JSON.stringify(proof),
    });
    this.lastPlayedTimestamp = Date.now()
    return proof;
  }

  async giveClue() {
    console.log('Giving clue ...');
    const { proof } = await StepProgram.giveClue(
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

    this.codeMasterWebSocket.send({
      action: 'sendProof',
      gameId: this.gameId,
      zkProof: JSON.stringify(proof),
    });
    this.lastPlayedTimestamp = Date.now()
    return proof;
  }
  webSocketMessageHandler = async (data: any, role: PlayerRole) => {
    try {
      const recivedAt = Date.now()
      if(data.game.status === 'ENDED' || data.game.status === 'PENALIZED'){
        console.log("relayingAvgTime : ",(this.relayingAvgTime / 1000 ) / (this.attempts * 2))
      }
      if (data.zkProof) {
        this.lastReceivedProof = await StepProgramProof.fromJSON(
          JSON.parse(data.zkProof)
        );
      }
      if (this.lastReceivedProof) {
        const turnCount = Number(
          this.lastReceivedProof.publicOutput.turnCount.value
        );
        if (data.game?.status === 'IN_PROGRESS') {
          if (turnCount % 2 !== 0 && role === PlayerRole.CODE_BREAKER) {
            this.relayingAvgTime +=  this.lastPlayedTimestamp === 0 ? 0 : recivedAt - this.lastPlayedTimestamp
            const generateCorrectAnswer = turnCount === this.attempts * 2 - 1;
            await this.makeGuess(generateCorrectAnswer);
          }
          if (turnCount % 2 === 0 && role === PlayerRole.CODE_MASTER) {
            this.relayingAvgTime += recivedAt - this.lastPlayedTimestamp
            await this.giveClue();
          }
        }
      }
    } catch (err) {
      console.error(`${this.gameId} Error handling message:`, err);
    }
  };
}

const game = new MastermindGame(
  'EKF7Qqi5QVHw9KbW8PKkchw7EDHLBnqVBB7znx7UQDteZB7Edwgi',
  'EKDzDSs2gSBcg1St4Jsro8DXC4fgHJQRwbXC7ycx8T1tN3SsmGSi',
  3
);
