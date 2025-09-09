/**
 * Repository functions for interacting with the Game collection in the database.
 *
 * It is used in the worker context to perform data access operations related to games.
 *
 */

import dotenv from 'dotenv';
import Game, { GameStatus, IGame } from '../models/Game.js';
import { DeleteResult } from 'mongoose';
dotenv.config();

/**
 * Creates a new game or updates an existing one in the database.
 *
 * If a game with the provided `_id` exists, it updates the record.
 * Otherwise, it inserts a new game document.
 *
 * @param gameData - Partial game object containing fields to upsert.
 * @returns {Promise<IGame>} The created or updated game document.
 * @throws If MongoDB update operation fails.
 */
export const createOrUpdateGame = async (
  gameData: Partial<IGame>
): Promise<IGame> => {
  try {
    const game = await Game.findOneAndUpdate({ _id: gameData._id }, gameData, {
      new: true,
      upsert: true,
    });
    return game;
  } catch (err) {
    throw new Error('Error creating or updating game: ' + err);
  }
};

/**
 * Retrieves a game document by its ID.
 *
 * @param _id - The unique ID of the game.
 * @returns {Promise<IGame | null>}  The game document, or null if not found.
 * @throws If the query to MongoDB fails.
 */
export const getGameById = async (_id: string): Promise<IGame | null> => {
  try {
    const game = await Game.findOne({ _id });
    return game;
  } catch (err) {
    throw new Error('Error retrieving game by ID: ' + err);
  }
};

/**
 * Retrieves all games that match the given status.
 *
 *
 * @returns {Promise<{_id:string;lastProof:string;timestamp: number}[]>} An array of game documents with the specified status.
 * @throws If MongoDB query fails.
 */
export const getPendingGames = async (pagination: {
  page: number;
  pageSize: number;
}): Promise<{ _id: string; lastProof: string; timestamp: number }[]> => {
  const { page, pageSize } = pagination;
  const skip = (page - 1) * pageSize;
  try {
    const pendingGames = await Game.find(
      { status: GameStatus.PENDING },
      '_id lastProof timestamp'
    )
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .lean();

    return pendingGames;
  } catch (err) {
    throw new Error('Error retrieving pending games: ' + err);
  }
};

/**
 * Updates the status of multiple games at once.
 *
 * @param gamesIds - An array of game IDs to update.
 * @param status - The new status to apply.
 * @returns {Promise<void>}
 * @throws If the bulk update operation fails.
 */
export const updateManyGames = async (
  gamesIds: string[],
  status: GameStatus
): Promise<void> => {
  try {
    await Game.updateMany({ _id: { $in: gamesIds } }, { $set: { status } });
  } catch (err) {
    throw new Error('Error updating games : ' + err);
  }
};

/**
 * Deletes multiple games by their IDs.
 *
 * @param gamesIds - An array of game IDs to delete.
 * @returns {Promise<{ acknowledged: true, deletedCount: number}>}
 * @throws If an error occurs while deleting games.
 */
export const deleteManyGames = async (
  gamesIds: string[]
): Promise<DeleteResult> => {
  try {
    return await Game.deleteMany({ _id: { $in: gamesIds } });
  } catch (err) {
    throw new Error('Error deleting game: ' + err);
  }
};

export const countGamesByStatus = async (
  status: GameStatus
): Promise<number> => {
  try {
    const twoHourAgo = Date.now() - 2 * 1000 * 60 * 60;
    return await Game.countDocuments({
      status,
      timestamp: { $gte: twoHourAgo },
    });
  } catch (err) {
    throw new Error('Error while counting games by status: ' + err);
  }
};
