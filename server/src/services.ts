import WebSocket from 'ws';
import {
  getGameById,
  createOrUpdateGame,
  deleteGame,
  resumeOnGoingGames,
} from './repositories/game.js';
import {
  MastermindZkApp,
  StepProgramProof,
  GameState,
} from '@navigators-exploration-team/mina-mastermind';
import { checkGameStatus } from './zkAppHandler.js';
import { Queue } from 'bullmq';
import {
  fetchAccount,
  fetchLastBlock,
  Field,
  PublicKey,
  UInt32,
  VerificationKey,
  verify,
} from 'o1js';
import { GameStatus } from './models/Game.js';
import { MAX_ATTEMPTS, VERIFIED_REFREES } from './constants.js';

export const handleJoinGame = async (
  gameId: string,
  activePlayers: Map<string, Set<WebSocket>>,
  ws: WebSocket
) => {
  let game = await getGameById(gameId);
  let lastProof = game?.lastProof || null;
  let timestamp = game?.timestamp || null;
  if (!activePlayers.has(gameId)) {
    activePlayers.set(gameId, new Set());
  }
  activePlayers.get(gameId)?.add(ws);

  if (lastProof) {
    ws.send(JSON.stringify({ zkProof: lastProof, timestamp, game }));
  }
};
export const handleProof = async (
  gameId: string,
  zkProof: string,
  receivedRewardAmount: number,
  playerPubKeyBase58: string,
  refereePubKeyBase58: string,
  activePlayers: Map<string, Set<WebSocket>>,
  ws: WebSocket,
  gameLifecycleQueue: Queue,
  vk: VerificationKey
) => {
  let { game, isPenalized } = await checkForPenalization(
    gameId,
    gameLifecycleQueue
  );
  if (isPenalized) {
    const players = activePlayers.get(gameId) || new Set();
    players.forEach((player: WebSocket) => {
      player.send(JSON.stringify({ game }));
    });
    return;
  } else if (game && game.status !== GameStatus.IN_PROGRESS) {
    ws.send(JSON.stringify({ error: 'Not allowed to send a proof!' }));
    return;
  }
  let lastProof = game?.lastProof || null;

  let lastTurnCount = null;
  const gameRewardAmount = game?.rewardAmount || receivedRewardAmount;

  if (lastProof) {
    const proof = await StepProgramProof.fromJSON(JSON.parse(lastProof));
    lastTurnCount = Number(proof.publicOutput.turnCount.toString());
  }

  if (!zkProof) {
    ws.send(JSON.stringify({ error: 'Missing zkProof!' }));
    return;
  }

  let receivedProof;
  let turnCount, isSolved;
  let receivedTurnCount;
  try {
    receivedProof = await StepProgramProof.fromJSON(JSON.parse(zkProof));
    const validProof = await verify(receivedProof, vk);
    if (!validProof) {
      throw new Error('Invalid zkProof!');
    }
    receivedTurnCount = Number(receivedProof.publicOutput.turnCount.toString());

    if (receivedTurnCount - (lastTurnCount || 0) !== 1) {
      ws.send(JSON.stringify({ error: 'Proof is outdated!' }));
      return;
    }
    if (receivedTurnCount % 2 !== 0) {
      const { turnCount: turnCount_, isSolved: isSolved_ } =
        await checkGameStatus(gameId, receivedProof);

      turnCount = turnCount_;
      isSolved = isSolved_;
    }
  } catch (e) {
    console.error('Error verifying proof:', e);
    ws.send(JSON.stringify({ error: 'Invalid zkProof!' }));
    return;
  }
  let winnerPublicKeyBase58 = null;
  if (isSolved || (turnCount && turnCount > MAX_ATTEMPTS * 2)) {
    winnerPublicKeyBase58 = isSolved ? game?.codeBreaker : game?.codeMaster;
    await gameLifecycleQueue.add(
      'sendFinalProof',
      {
        gameId,
        zkProof,
        winnerPublicKeyBase58,
      },
      { priority: 1 }
    );
  }
  const timestamp = Date.now();
  const updatedGame = await createOrUpdateGame({
    _id: gameId,
    lastProof: zkProof,
    timestamp,
    rewardAmount: gameRewardAmount,
    codeMaster:
      lastTurnCount === null && playerPubKeyBase58
        ? playerPubKeyBase58
        : undefined,
    turnCount: receivedTurnCount,
    winnerPublicKeyBase58: winnerPublicKeyBase58
      ? winnerPublicKeyBase58
      : undefined,
    status: winnerPublicKeyBase58 ? GameStatus.ENDED : undefined,
    refereePubKeyBase58:
      lastTurnCount === null ? refereePubKeyBase58 : undefined,
    isRefereeVerified:
      lastTurnCount === null
        ? VERIFIED_REFREES.includes(refereePubKeyBase58)
        : undefined,
  });
  const players = activePlayers.get(gameId);
  players?.forEach((player: WebSocket) => {
    player.send(JSON.stringify({ zkProof, timestamp, game: updatedGame }));
  });
};
export async function handleGameStart(
  gameId: string,
  activePlayers: Map<string, Set<WebSocket>>,
  ws: WebSocket,
  gameLifecycleQueue: Queue,
  verificationKeyHash: Field
) {
  const game = await getGameById(gameId);
  if (!game?.codeBreaker || game?.status !== GameStatus.ACTIVE) {
    const zkAppPublicKey = PublicKey.fromBase58(gameId);
    const zkApp = new MastermindZkApp(zkAppPublicKey);
    let res = await fetchAccount({ publicKey: zkAppPublicKey });
    if (!res.account) {
      ws.send(JSON.stringify({ error: 'Game has not been accepted!' }));
      return;
    }
    const vk = res.account?.zkapp?.verificationKey?.hash;
    if (vk?.toString() !== verificationKeyHash.toString()) {
      await deleteGame(gameId);
      ws.send(
        JSON.stringify({ error: 'Game is not using the verified contract!' })
      );
      return;
    }
    const zkAppEvents = await zkApp.fetchEvents(UInt32.from(0));
    const acceptGameEvent = zkAppEvents.find((e) => e.type === 'gameAccepted');
    if (!acceptGameEvent) {
      ws.send(JSON.stringify({ error: 'Game has not been accepted!' }));
      return;
    }
    const acceptedGame = JSON.parse(JSON.stringify(acceptGameEvent.event.data));
    const latestBlock = await fetchLastBlock(
      process.env.MINA_NETWORK_URL as string
    );
    const currentSlot = Number(latestBlock.globalSlotSinceGenesis.toString());
    const finalizeSlot = Number(acceptedGame.finalizeSlot);
    const startGameSlot = finalizeSlot - 2 * (MAX_ATTEMPTS || 0);
    let status = GameStatus.IN_PROGRESS;
    let winnerPublicKeyBase58 = null;

    if (currentSlot - startGameSlot > 4) {
      await gameLifecycleQueue.add(
        'forfeitWin',
        {
          gameId,
          winnerPublicKeyBase58: game?.codeMaster,
        },
        { priority: 1 }
      );
      status = GameStatus.PENALIZED;
      winnerPublicKeyBase58 = game?.codeMaster;
    }
    const { turnCount } = GameState.unpack(await zkApp.compressedState.get());
    if (Number(turnCount.toString()) > 1) {
      const updatedGame = await createOrUpdateGame({
        _id: gameId,
        codeBreaker: acceptedGame.codeBreakerPubKey,
        status: GameStatus.ON_CHAIN,
        timestamp: Date.now(),
      });
      const players = activePlayers.get(gameId) || new Set();
      players.forEach((player: WebSocket) => {
        player.send(JSON.stringify({ game: updatedGame }));
      });
      return;
    }

    const updatedGame = await createOrUpdateGame({
      _id: gameId,
      codeBreaker: acceptedGame.codeBreakerPubKey,
      status,
      timestamp: Date.now(),
      winnerPublicKeyBase58: winnerPublicKeyBase58
        ? winnerPublicKeyBase58
        : undefined,
    });
    const players = activePlayers.get(gameId) || new Set();
    players.forEach((player: WebSocket) => {
      player.send(JSON.stringify({ game: updatedGame }));
    });
    return;
  }
  ws.send(JSON.stringify({ error: 'Game has already started!' }));
}
export async function handlePenalize(
  gameId: string,
  activePlayers: Map<string, Set<WebSocket>>,
  ws: WebSocket,
  gameLifecycleQueue: Queue
) {
  const { isPenalized, game } = await checkForPenalization(
    gameId,
    gameLifecycleQueue
  );
  if (isPenalized) {
    const players = activePlayers.get(gameId) || new Set();
    players.forEach((player: WebSocket) => {
      player.send(JSON.stringify({ game }));
    });
  } else if (!isPenalized && game?.status === GameStatus.PENALIZED) {
    ws.send(JSON.stringify({ error: 'Player is already penalized!' }));
  } else {
    ws.send(
      JSON.stringify({ error: 'Player did not exceeded the allowed time!' })
    );
  }
}
async function checkForPenalization(gameId: string, gameLifecycleQueue: Queue) {
  const now = Date.now();
  const game = await getGameById(gameId);
  if (game?.status !== GameStatus.IN_PROGRESS) {
    return {
      isPenalized: false,
      game,
    };
  }
  const lastTurnTimestamp = game?.timestamp || Date.now();
  const TURN_DURATION = 1000 * 60 * 2.5;

  if (game?.turnCount && now - lastTurnTimestamp > TURN_DURATION) {
    const winnerPublicKeyBase58 =
      game?.turnCount % 2 === 0 ? game?.codeBreaker : game?.codeMaster;
    const updatedGame = await createOrUpdateGame({
      _id: gameId,
      status: GameStatus.PENALIZED,
      winnerPublicKeyBase58,
    });
    console.log('Penalizing game : ', gameId);
    await gameLifecycleQueue.add(
      'forfeitWin',
      {
        gameId,
        winnerPublicKeyBase58,
      },
      { priority: 1 }
    );
    return {
      isPenalized: true,
      game: updatedGame,
    };
  }
  return {
    isPenalized: false,
    game,
  };
}
export async function resumeOnChain() {
  try {
    await resumeOnGoingGames();
  } catch (err) {
    console.log('error resuming games on chain: ', err);
  }
}
