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
import lockfile from 'proper-lockfile';

dotenv.config();

const NETWORK_NAME = process.env.MINA_NETWORK || 'unknown';
const PROOFS_FILE_PATH = path.join(process.cwd(), 'proofs.json');
const PERF_FILE_PATH = path.join(process.cwd(), 'performance.json');
const PROMETHEUS_URL = 'http://localhost:9090/';

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
  concurrentGameCount: number = 1;
  createGameTx?: Transaction<true, true>;
  acceptGameTx?: Transaction<true, true>;
  startTime?: number;
  constructor(options: {
    codeMasterPrivateKeyBase58: string;
    codeBreakerPrivateKeyBase58: string;
    attempts?: number;
    penalizedPlayer?: PlayerRole;
    autoPlay?: boolean;
    gameKey?: string;
    concurrentGameCount?: number;
  }) {
    this.attempts = options?.attempts || 8;
    this.lastPlayedTimestamp = 0;
    this.relayingTotalTime = 0;
    this.concurrentGameCount = options?.concurrentGameCount || 1;
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
    this.createGameTx = (await tx.prove()).sign([
      this.codeMasterKey,
      this.zkAppKey,
    ]);
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
  async acceptGame() {
    this.joinGame(PlayerRole.CODE_BREAKER);
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
      this.acceptGameTx = (await tx.prove()).sign([this.codeBreakerKey]);
    } catch (e) {
      console.log('Error : ', e);
      console.log('Re-accepting the game ');
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
    console.log('genrated a proof');
    if (!existingProof) {
      this.storeProofData(proof);
    }
    console.log('sending a proof');

    this.codeBreakerWebSocket?.send({
      action: 'sendProof',
      gameId: this.gameId,
      zkProof: JSON.stringify(proof),
    });
    console.log(
      'proof sent for game ',
      this.gameId,
      ' with turn count ',
      turnCount
    );

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
    this.startTime = Date.now();
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
      if (data?.error) {
        console.error('error :------- ', data?.error);
      }
      if (['ENDED', 'PENALIZED'].includes(data?.game?.status)) {
        const isWinner =
          (role === PlayerRole.CODE_MASTER &&
            data.game?.winnerPublicKeyBase58 ===
            this.codeMasterKey.toPublicKey().toBase58()) ||
          (role === PlayerRole.CODE_BREAKER &&
            data.game?.winnerPublicKeyBase58 ===
            this.codeBreakerKey.toPublicKey().toBase58());
        if (isWinner) {
          const sinceLastAction = this.lastPlayedTimestamp
            ? (recivedAt - this.lastPlayedTimestamp) / 1000
            : 0;
          console.log('Game Ended  (since last action) ', sinceLastAction, 's');
          this.updateRelayingTotalTime(recivedAt);
          const avgTime = this.relayingTotalTime / 1000 / (this.attempts * 2);
          console.log(' relaying average time : ', avgTime);
          await this.storeGamePerformance(avgTime);
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
        console.log(
          'received a proof with turnCount ',
          turnCount,
          ' status ',
          data.game?.status,
          ' role ',
          role,
          ' for game ',
          this.gameId
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
            console.log(
              'turnCount : ',
              turnCount,
              ' making a guess for game ',
              this.gameId
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
    this.relayingTotalTime += this.lastPlayedTimestamp
      ? recivedAt - this.lastPlayedTimestamp
      : 0;
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

  private async storeGamePerformance(avgTime: number) {
    try {
      const release = await lockfile.lock(PERF_FILE_PATH, { retries: 100 });
      try {
        let currentData: any = {};
        if (fs.existsSync(PERF_FILE_PATH)) {
          const raw = fs.readFileSync(PERF_FILE_PATH, 'utf-8');
          currentData = raw ? JSON.parse(raw) : {};
        }

        const startTimestamp = this.startTime! / 1000;
        const endTimestamp = Date.now() / 1000;

        const metricsData: any[] = [];

        // Get memory available
        const memAvailable = await fetchPrometheusMetric(
          'node_memory_MemAvailable_bytes',
          startTimestamp,
          endTimestamp
        );
        if (memAvailable) metricsData.push(memAvailable);

        // Get memory used
        const memUsed = await fetchUsedMemoryMetrics(startTimestamp, endTimestamp);
        if (memUsed) metricsData.push(memUsed);

        // Get total CPU usage %
        const cpuUsage = await fetchCpuUsageMetrics(startTimestamp, endTimestamp);
        if (cpuUsage) metricsData.push(cpuUsage);

        const startKey = new Date(this.startTime!)
          .toISOString()
          .slice(0, 16)
          .replace('T', ' ');

        const gameData = {
          server: SERVER_URL,
          utcEndDate: new Date().toLocaleString('en-US', {
            timeZone: 'UTC',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
          }),
          utcStartDate: new Date(this.startTime!).toLocaleString('en-US', {
            timeZone: 'UTC',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
          }),
          averageRelayingTime: avgTime,
          concurrentGameCount: this.concurrentGameCount,
          prometheusMetrics: metricsData,
        };

        if (!currentData[NETWORK_NAME]) {
          currentData[NETWORK_NAME] = {};
        }
        if (!currentData[NETWORK_NAME][startKey]) {
          currentData[NETWORK_NAME][startKey] = [];
        }

        currentData[NETWORK_NAME][startKey].push(gameData);

        fs.writeFileSync(PERF_FILE_PATH, JSON.stringify(currentData, null, 2));
        console.log(`Saved performance for game to ${PERF_FILE_PATH}`);
      } finally {
        await release();
      }
    } catch (err) {
      console.error(`Failed to store game performance:`, err);
    }
  }
}
function formatBytes(bytes: number) {
  if (bytes === 0) return '0 B';
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(2)} ${sizes[i]}`;
}

function formatPercent(value: number) {
  return `${value.toFixed(2)}%`;
}

function humanizeMetric(metricName: string, value: number) {
  if (metricName.includes('_bytes')) {
    return formatBytes(value);
  }
  if (metricName.includes('cpu')) {
    return formatPercent(value);
  }
  return value.toFixed(3);
}

async function fetchRawMetricValues(
  metric: string,
  start: number,
  end: number
): Promise<number[] | null> {
  const step = Math.max(1, Math.floor((end - start) / 10));
  const url = `${PROMETHEUS_URL}/api/v1/query_range?query=${encodeURIComponent(
    metric
  )}&start=${start}&end=${end}&step=${step}`;

  const res = await fetch(url);
  const data = await res.json();

  if (!data.data?.result?.length) return null;

  return data.data.result[0].values.map((v: any) => parseFloat(v[1]));
}

async function fetchPrometheusMetric(
  metric: string,
  start: number,
  end: number,
  humanize = true
) {
  const values = await fetchRawMetricValues(metric, start, end);
  if (!values) return null;

  const average = values.reduce((a, b) => a + b, 0) / values.length;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const last = values[values.length - 1];

  return {
    metric,
    formatted: {
      average: humanize ? humanizeMetric(metric, average) : average,
      max: humanize ? humanizeMetric(metric, max) : max,
      min: humanize ? humanizeMetric(metric, min) : min,
      last: humanize ? humanizeMetric(metric, last) : last,
    },
  };
}

async function fetchUsedMemoryMetrics(start: number, end: number) {
  const memAvailableValues = await fetchRawMetricValues(
    'node_memory_MemAvailable_bytes',
    start,
    end
  );
  const memTotalValues = await fetchRawMetricValues(
    'node_memory_MemTotal_bytes',
    start,
    end
  );

  if (!memAvailableValues || !memTotalValues) return null;

  const memUsedValues = memTotalValues.map(
    (total, i) => total - (memAvailableValues[i] ?? 0)
  );

  const average =
    memUsedValues.reduce((a, b) => a + b, 0) / memUsedValues.length;
  const max = Math.max(...memUsedValues);
  const min = Math.min(...memUsedValues);
  const last = memUsedValues[memUsedValues.length - 1];

  return {
    metric: 'node_memory_MemUsed_bytes',
    formatted: {
      average: formatBytes(average),
      max: formatBytes(max),
      min: formatBytes(min),
      last: formatBytes(last),
    },
  };
}

async function fetchCpuUsageMetrics(start: number, end: number) {
  // Get total number of cores
  const coreCountData = await fetchRawMetricValues(
    'count(node_cpu_seconds_total{mode="user"})',
    start,
    end
  );
  const coreCount = coreCountData ? Math.round(coreCountData[0]) : 1;

  // Get summed user mode CPU seconds rate
  const cpuUsageValues = await fetchRawMetricValues(
    'sum(rate(node_cpu_seconds_total{mode!="idle"}[1m]))',
    start,
    end
  );
  if (!cpuUsageValues) return null;

  // Normalize to % of total capacity
  const cpuPercentValues = cpuUsageValues.map(
    v => (v / coreCount) * 100
  );

  const average =
    cpuPercentValues.reduce((a, b) => a + b, 0) / cpuPercentValues.length;
  const max = Math.max(...cpuPercentValues);
  const min = Math.min(...cpuPercentValues);
  const last = cpuPercentValues[cpuPercentValues.length - 1];

  return {
    metric: 'node_cpu_total_usage_percent',
    formatted: {
      average: formatPercent(average),
      max: formatPercent(max),
      min: formatPercent(min),
      last: formatPercent(last),
    },
  };
}