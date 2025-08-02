import { Router, Request, Response } from 'express';
import Player from '../models/Player.js';

const router = Router();

router.get('/leaderboard/:userId', async (req: Request, res: Response) => {
  const userId = req.params.userId;
  const limit = parseInt((req.query.limit as string) || '7', 10);
  const onlyPlayers = req.query.onlyPlayers === 'true';
  const page = parseInt((req.query.page as string) || '1', 10);
  const skip = (page - 1) * limit;

  try {
    const [players, totalPlayers] = await Promise.all([
      await Player.find()
        .sort({ totalScore: -1 })
        .skip(skip)
        .limit(limit)
        .select('_id winsAsCodeMaster winsAsCodeBreaker totalScore')
        .lean(),
      await Player.countDocuments(),
    ]);

    if (onlyPlayers) {
      res.status(200).json({
        totalPlayers,
        players,
      });
      return;
    }

    const userStats = await Player.findOne({ _id: userId })
      .select('_id winsAsCodeBreaker winsAsCodeMaster totalScore')
      .lean();

    let userRank = null;
    if (userStats) {
      userRank =
        (await Player.countDocuments({
          totalScore: { $gt: userStats?.totalScore || 0 },
        })) + 1;
    }

    res.status(200).json({
      totalPlayers,
      players,
      user: userStats ? { ...userStats, rank: userRank } : null,
    });
  } catch (err) {
    console.error('Error fetching leaderboard:', err);
    res.status(500).json({ message: 'Failed to fetch leaderboard' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const playerId = req.params.id;

    const player = await Player.findById(playerId);

    if (!player) {
      res.status(404).json({ message: 'Player not found' });
      return;
    }

    res.status(200).json({ player });
  } catch (error) {
    console.error('Error fetching player:', error);
    res.status(500).json({ message: 'Failed to fetch player' });
  }
});

export default router;
