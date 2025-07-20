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
  getUserGames,
} from '../repositories/game.js';
import Game, { GameStatus } from '../models/Game.js';
import { Poseidon, PublicKey, Signature } from 'o1js';
import dotenv from 'dotenv';
import redisClient from '../redisClient.js';

dotenv.config();
const router = Router();

router.get('/active-games/:userId', async (req: Request, res: Response) => {
  const { userId } = req.params;

  const filter = req.query.filter === 'own' ? 'own' : 'public'; // 'own' | 'public'
  const sortBy = req.query.sortBy === 'rewardAmount' ? 'rewardAmount' : 'createdAt'; // 'createdAt' by default
  const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1; // 'desc' by default
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;
  const includeInProgress = req.query.includeInProgress === 'true'; // default: false

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
      // Fetch filtered ACTIVE games
      const [games, count] = await Promise.all([
        Game.find(baseMatch)
          .sort({ [sortBy]: sortOrder })
          .skip(skip)
          .limit(limit)
          .select('_id rewardAmount createdAt turnCount roomName status lastAcceptTimestamp codeMaster codeBreaker timestamp')
          .lean(),
        Game.countDocuments(baseMatch),
      ]);

      filteredActiveGames = games;
      totalActiveCount = count;

      // Cache filtered list
      await redisClient.set(
        cacheKey,
        JSON.stringify({ filteredActiveGames, totalActiveCount }),
        {
          expiration: {
            type: 'EX',
            value: 60,
          },
        }
      );
    }

    // Only fetch in-progress if requested
    let inProgressGames: any[] = [];
    if (includeInProgress) {
      inProgressGames = await Game.find({
        status: GameStatus.IN_PROGRESS,
        $or: [{ codeMaster: userId }, { codeBreaker: userId }],
      })
        .select('_id rewardAmount createdAt turnCount roomName status lastAcceptTimestamp codeMaster codeBreaker timestamp')
        .lean();
    }

    res.status(200).json({
      filteredActiveGames,
      totalActiveCount,
      ...(includeInProgress && { inProgressGames }),
      page,
      limit,
    });
  } catch (err) {
    console.error('Error fetching active/in-progress games:', err);
    res.status(500).json({ message: 'Failed to fetch game list' });
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
      lastJoinAttemptBy: jsonGame.userId
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

router.get('/lobby/:pubKey', async (req, res) => {
  const { pubKey } = req.params;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;

  const orderBy =
    req.query.orderBy === 'rewardAmount' ? 'rewardAmount' : 'createdAt';
  const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
  const playedAs = req.query.playedAs; // 'codeMaster' | 'codeBreaker' | undefined
  const onlyPlayedGames = req.query.onlyPlayedGames === 'true';

  try {
    const baseMatch = {
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

    if (onlyPlayedGames) {
      const [playedGames, totalPlayedCount] = await Promise.all([
        Game.find(baseMatch)
          .sort({ [orderBy]: sortOrder })
          .skip(skip)
          .limit(limit)
          .select('_id createdAt rewardAmount winnerPublicKeyBase58 turnCount codeBreaker codeMaster')
          .lean(),
        Game.countDocuments(baseMatch),
      ]);

      res.json({ playedGames, totalPlayedCount, page, limit });
      return;
    }

    // Full initial fetch with cache
    const statsCacheKey = `lobby:${pubKey}:stats`;
    const activeGamesCacheKey = `lobby:${pubKey}:activeGames`;

    const [cachedStats, cachedActiveGames] = await Promise.all([
      redisClient.get(statsCacheKey),
      redisClient.get(activeGamesCacheKey),
    ]);

    let stats, activeGames;

    if (cachedStats && cachedActiveGames) {
      stats = JSON.parse(cachedStats);
      activeGames = JSON.parse(cachedActiveGames);
    } else {
      // --- Stats aggregation ---
      const statsResult = await Game.aggregate([
        {
          $match: {
            $and: [
              { status: { $in: [GameStatus.ENDED, GameStatus.PENALIZED] } },
              { $or: [{ codeMaster: pubKey }, { codeBreaker: pubKey }] },
            ],
          },
        },
        {
          $addFields: {
            isWinner: { $eq: ['$winnerPublicKeyBase58', pubKey] },
            isCodeMaster: { $eq: ['$codeMaster', pubKey] },
            isCodeBreaker: { $eq: ['$codeBreaker', pubKey] },
            rewardSigned: {
              $cond: [
                { $eq: ['$winnerPublicKeyBase58', pubKey] },
                '$rewardAmount',
                {
                  $cond: [
                    {
                      $or: [
                        { $eq: ['$codeMaster', pubKey] },
                        { $eq: ['$codeBreaker', pubKey] },
                      ],
                    },
                    { $multiply: [-1, '$rewardAmount'] },
                    0,
                  ],
                },
              ],
            },
          },
        },
        {
          $group: {
            _id: null,
            totalPlayed: { $sum: 1 },
            winsAsCodeBreaker: {
              $sum: {
                $cond: [{ $and: ['$isWinner', '$isCodeBreaker'] }, 1, 0],
              },
            },
            winsAsCodeMaster: {
              $sum: {
                $cond: [{ $and: ['$isWinner', '$isCodeMaster'] }, 1, 0],
              },
            },
            balance: { $sum: '$rewardSigned' },
          },
        },
      ]);

      stats = statsResult[0] || {
        totalPlayed: 0,
        winsAsCodeBreaker: 0,
        winsAsCodeMaster: 0,
        balance: 0,
      };

      // --- Active games ---
      activeGames = await Game.find({
        $or: [{ codeMaster: pubKey }, { codeBreaker: pubKey }],
        status: GameStatus.ACTIVE,
      })
        .sort({ timestamp: -1 })
        .lean();

      await Promise.all([
        redisClient.set(statsCacheKey, JSON.stringify(stats), {
          expiration: {
            type: 'EX',
            value: 60,
          },
        }),
        redisClient.set(activeGamesCacheKey, JSON.stringify(activeGames), {
          expiration: {
            type: 'EX',
            value: 60,
          },
        }),
      ]);
    }

    // --- Played games (default filters) ---
    const [playedGames, totalPlayedCount] = await Promise.all([
      await Game.find({
        $and: [
          { status: { $in: [GameStatus.ENDED, GameStatus.PENALIZED] } },
          { $or: [{ codeMaster: pubKey }, { codeBreaker: pubKey }] },
        ],
      })
        .sort({ [orderBy]: sortOrder })
        .skip(skip)
        .limit(limit)
        .select('_id createdAt rewardAmount winnerPublicKeyBase58 turnCount codeBreaker codeMaster')
        .lean(),
      Game.countDocuments({
        $and: [
          { status: { $in: [GameStatus.ENDED, GameStatus.PENALIZED] } },
          { $or: [{ codeMaster: pubKey }, { codeBreaker: pubKey }] },
        ],
      }),
    ]);

    res.json({
      stats,
      activeGames,
      playedGames,
      page,
      limit,
      totalPlayedCount,
    });
    return;
  } catch (err) {
    console.error('Error fetching lobby data:', err);
    res.status(500).json({ error: 'Internal Server Error' });
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
