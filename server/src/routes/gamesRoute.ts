/**
 * Defines the REST API endpoints for interacting with game data.
 * This includes fetching active games, accepting games, retrieving a user's games,
 * and canceling games with signature verification.
 *
 * These endpoints serve the client application and coordinate with the game repository layer.
 */

import { Router, Request, Response } from 'express';
import {
  createOrUpdateGame,
  getGameById,
  getInProgressGamesByPlayer,
  getLobbyData,
  getPlayedGames,
  getUserCreatedGames,
  getUserGames,
} from '../repositories/game.js';
import { GameStatus } from '../models/Game.js';
import { Poseidon, PublicKey, Signature } from 'o1js';
import dotenv from 'dotenv';
import redisClient from '../redisClient.js';
import Player from '../models/Player.js';

dotenv.config();
const router = Router();

router.get('/active-games/:userId', async (req: Request, res: Response) => {
  const { userId } = req.params;

  const filter = req.query.filter === 'own' ? 'own' : 'public';
  const sortBy =
    req.query.sortBy === 'rewardAmount' ? 'rewardAmount' : 'createdAt';
  const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 9;
  const skip = (page - 1) * limit;
  const includeInProgress = req.query.includeInProgress === 'true';
  const baseMatch: any = {
    status: GameStatus.ACTIVE,
  };

  if (filter === 'own') {
    baseMatch.codeMaster = userId;
  } else {
    baseMatch.codeMaster = { $ne: userId };
  }

  const cacheKey = `active:${userId}:${filter}:${sortBy}:${sortOrder}:${page}:${limit}`;

  try {
    // Try to get from cache
    const cachedActive = await redisClient.get(cacheKey);

    let filteredActiveGames: any[] = [];
    let totalActiveCount = 0;

    if (cachedActive) {
      const parsed = JSON.parse(cachedActive);
      filteredActiveGames = parsed.filteredActiveGames;
      totalActiveCount = parsed.totalActiveCount;
    } else {
      const [games, count] = await getLobbyData({
        skip,
        limit,
        sortBy,
        sortOrder,
        baseMatch,
      });

      filteredActiveGames = games;
      totalActiveCount = count;

      // Cache result
      await redisClient.set(
        cacheKey,
        JSON.stringify({ filteredActiveGames, totalActiveCount }),
        {
          expiration: { type: 'EX', value: 60 },
        }
      );
    }

    let inProgressGames: any[] = [];
    if (includeInProgress) {
      inProgressGames = await getInProgressGamesByPlayer(userId);
    }
    res.status(200).json({
      filteredActiveGames,
      totalActiveCount,
      ...(includeInProgress && { inProgressGames }),
    });
  } catch (err) {
    console.error('Error fetching in-progress games:', err);
    res.status(500).json({ message: 'Failed to fetch game list' });
  }
});

router.get('/my-games/:pubKey', async (req, res) => {
  const { pubKey } = req.params;
  const onlyPlayedGames = req.query.onlyPlayedGames === 'true';
  const page = parseInt((req.query.page as string) || '1', 10);
  const limit = parseInt((req.query.limit as string) || '7', 10);
  const skip = (page - 1) * limit;
  const orderBy =
    req.query.orderBy === 'rewardAmount' ? 'rewardAmount' : 'createdAt';
  const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
  const playedAs = req.query.playedAs;
  try {
    const playedGamesQuery = {
      $and: [
        { status: { $in: [GameStatus.ENDED, GameStatus.PENALIZED] } },
        {
          $or: [
            ...(playedAs === 'codeMaster' ? [{ codeMaster: pubKey }] : []),
            ...(playedAs === 'codeBreaker' ? [{ codeBreaker: pubKey }] : []),
            ...(playedAs
              ? []
              : [{ codeMaster: pubKey }, { codeBreaker: pubKey }]),
          ],
        },
      ],
    };

    const [playedGames, totalPlayedCount] = await getPlayedGames({
      playedGamesQuery,
      orderBy,
      sortOrder,
      skip,
      limit,
    });

    if (onlyPlayedGames) {
      res.status(200).json({
        totalPlayedCount,
        playedGames,
      });
      return;
    }

    const statsCacheKey = `my-games:${pubKey}:stats`;
    let stats = null;

    const cachedStats = await redisClient.get(statsCacheKey);
    if (cachedStats) {
      stats = JSON.parse(cachedStats);
    } else {
      const playerStats = await Player.findOne({ _id: pubKey }).lean();

      stats = {
        totalPlayed: playerStats?.gamesPlayed || 0,
        winsAsCodeBreaker: playerStats?.winsAsCodeBreaker || 0,
        winsAsCodeMaster: playerStats?.winsAsCodeMaster || 0,
        balance: playerStats?.netRewards || 0,
        badges: playerStats?.badges || [],
      };

      await redisClient.set(statsCacheKey, JSON.stringify(stats), {
        expiration: { type: 'EX', value: 60 },
      });
    }

    //Active games
    const activeGames = await getUserCreatedGames(pubKey);
    res.json({
      stats,
      activeGames,
      playedGames,
      totalPlayedCount,
    });
    return;
  } catch (error) {
    console.error('Error in /my-games:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

/**
 * POST /accept/:id
 *
 * Accepts a game by updating its lastAcceptTimestamp and lastJoinAttemptBy.
 *
 * @route POST /games/accept
 * @returns {Game} 200 - The updated game
 * @returns {Error} 500 - Failed to accept the game
 */
router.post('/accept', async (req: Request, res: Response) => {
  try {
    const jsonGame = req.body;
    const game = await createOrUpdateGame({
      _id: jsonGame.gameId,
      lastAcceptTimestamp: Date.now(),
      lastJoinAttemptBy: jsonGame.userId,
    });
    res.status(200).json({ game });
  } catch (error) {
    console.error('Error :', error);
    res.status(500).json({ message: 'Failed' });
  }
});

/**
 * GET /user/:id
 *
 * Retrieves all games played by the user.
 *
 * @route GET /games/user/:id
 * @param {string} req.params.id - The user's public key
 * @returns {Game[]} 200 - List of user games
 * @returns {Error} 500 - Failed to fetch user games
 */
router.get('/user/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;
    const games = await getUserGames(userId);
    res.status(200).json({ games });
  } catch (error) {
    console.error('Error fetching game  list:', error);
    res.status(500).json({ message: 'Failed to find game list' });
  }
});

/**
 * POST /cancel/:id
 *
 * Cancels a game after verifying the signature from the code master.
 * Only allows cancellation if the game is in a cancellable state (ACTIVE, PENDING, CANCELLED).
 *
 * @route POST /games/cancel/:id
 * @param {string} req.params.id - The game ID
 * @param {Object} req.body - Payload containing signedData and hash
 * @param {string} req.body.signedData.signature - Base58 encoded signature
 * @param {string} req.body.hash - Transaction hash of the cancellation
 * @returns {Game} 200 - The cancelled game
 * @returns {Error} 401 - Invalid signature
 * @returns {Error} 403 - Unauthorized to cancel this game
 * @returns {Error} 500 - Failed to cancel game
 */
router.post('/cancel/:id', async (req: Request, res: Response) => {
  try {
    // Extract the game ID from the URL parameter
    const gameId = req.params.id;

    // Extract the signedData and transaction hash from the request body
    const { signedData, hash } = req.body;

    // Retrieve the game from the database
    const game = await getGameById(gameId);

    // Proceed only if the game exists and its status allows cancellation
    if (
      game &&
      [GameStatus.ACTIVE, GameStatus.PENDING, GameStatus.CANCELLED].includes(
        game.status
      )
    ) {
      // Reconstruct the signature from its Base58-encoded format
      const signature = Signature.fromBase58(signedData.signature);

      // Generate the message that should have been signed (hash of the gameId as a PublicKey)
      const expectedMessage = Poseidon.hash(
        PublicKey.fromBase58(gameId).toFields()
      ).toFields();

      // Verify that the signature was made by the code master of the game
      const isVerifiedSignature = signature.verify(
        PublicKey.fromBase58(game.codeMaster),
        expectedMessage
      );

      // If signature is valid, update the game as cancelled
      if (isVerifiedSignature.toBoolean()) {
        const game = await createOrUpdateGame({
          _id: gameId,
          status: GameStatus.CANCELLED,
          cancelTransactionHash: hash,
          lastCancelTimestamp: Date.now(),
        });
        res.status(200).json({ game });
      } else {
        // If the signature is invalid, reject the request
        res.status(401).json({ error: 'Invalid Signature!' });
      }
    } else {
      // If the game status is not cancellable, forbid the operation
      res.status(403).json({ error: 'You can not cancel this game!' });
    }
  } catch (error) {
    console.error('Error canceling game:', error);
    res.status(500).json({ error: 'Failed to cancel game' });
  }
});

/**
 * GET /games/:id
 *
 * Retrieves a specific game by its ID.
 *
 * @route GET /games/:id
 * @param {string} req.params.id - The game ID
 * @returns {Game} 200 - The requested game
 * @returns {Error} 404 - Game not found
 * @returns {Error} 500 - Failed to fetch game
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const gameId = req.params.id;
    const game = await getGameById(gameId);

    if (!game) {
      res.status(404).json({ message: 'Game not found' });
      return;
    }

    res.status(200).json({ game });
  } catch (error) {
    console.error('Error fetching game:', error);
    res.status(500).json({ message: 'Failed to fetch game' });
  }
});

export default router;
