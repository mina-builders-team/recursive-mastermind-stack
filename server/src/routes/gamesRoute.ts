import { Router, Request, Response } from 'express';
import {
  createOrUpdateGame,
  getActiveGames,
  getGameById,
  getUserGames,
} from '../repositories/game.js';
import { GameStatus } from '../models/Game.js';
import { Field, PublicKey, Signature } from 'o1js';
import dotenv from 'dotenv';

dotenv.config();
const router = Router();

router.get('/active-games', async (req: Request, res: Response) => {
  try {
    const games = await getActiveGames();
    res.status(200).json(games);
  } catch (error) {
    console.error('Error fetching game  list:', error);
    res.status(500).json({ message: 'Failed to find game list' });
  }
});
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
router.post('/cancel/:id', async (req: Request, res: Response) => {
  try {
    const gameId = req.params.id;
    const { signedData, hash } = req.body;
    const game = await getGameById(gameId);
    if (
      game &&
      [GameStatus.ACTIVE, GameStatus.PENDING, GameStatus.CANCELLED].includes(
        game.status
      )
    ) {
      const signature = Signature.fromBase58(signedData.signature);
      const isVerifiedSignature = signature.verify(
        PublicKey.fromBase58(signedData.publicKey),
        [Field(signedData.data[0])]
      );
      if (isVerifiedSignature.toBoolean()) {
        const game = await createOrUpdateGame({
          _id: gameId,
          status: GameStatus.CANCELLED,
          cancelTransactionHash: hash,
          lastCancelTimestamp: Date.now(),
        });
        res.status(200).json({ game });
      } else {
        res.status(403).json({ error: 'Invalid Signature!' });
      }
    } else {
      res.status(403).json({ error: 'You can not cancel this game!' });
    }
  } catch (error) {
    console.error('Error canceling game:', error);
    res.status(500).json({ error: 'Failed to cancel game' });
  }
});

export default router;
