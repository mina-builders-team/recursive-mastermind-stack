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
  getGamesByStatus,
  getUserGames,
} from '../repositories/game.js';
import { GameStatus } from '../models/Game.js';
import { Poseidon, PublicKey, Signature } from 'o1js';
import dotenv from 'dotenv';

dotenv.config();
const router = Router();

/**
 * GET /active-games
 *
 * Retrieves all games with status "ACTIVE".
 *
 * @route GET /games/active-games
 * @returns {Game[]} 200 - List of active games
 * @returns {Error} 500 - Failed to fetch games
 */
router.get('/active-games', async (req: Request, res: Response) => {
  try {
    const games = await getGamesByStatus(GameStatus.ACTIVE);
    res.status(200).json(games);
  } catch (error) {
    console.error('Error fetching game  list:', error);
    res.status(500).json({ message: 'Failed to find game list' });
  }
});

/**
 * POST /accept/:id
 *
 * Accepts a game by updating its lastAcceptTimestamp.
 *
 * @route POST /games/accept/:id
 * @param {string} req.params.id - The game ID
 * @returns {Game} 200 - The updated game
 * @returns {Error} 500 - Failed to accept the game
 */
router.post('/accept/:id', async (req: Request, res: Response) => {
  try {
    const jsonGame = req.body;
    const game = await createOrUpdateGame({
      _id: jsonGame.gameId,
      lastAcceptTimestamp: Date.now(),
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
      return
    }

    res.status(200).json({ game });
  } catch (error) {
    console.error('Error fetching game:', error);
    res.status(500).json({ message: 'Failed to fetch game' });
  }
});
export default router;
