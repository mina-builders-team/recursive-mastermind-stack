/**
 *
 * This file defines database access methods for performing CRUD operations
 * and status transitions on game documents. It encapsulates all persistence logic
 * related to games, ensuring a clean separation from business logic and controllers.
 *
 */

import dotenv from 'dotenv';
import Game, { GameStatus, IGame } from '../models/Game.js';
import { DeleteResult, UpdateResult } from 'mongoose';
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
 * Useful for filtering games by lifecycle stages.
 *
 * @param status - The target game status.
 * @returns {Promise<IGame[]>} An array of game documents with the specified status.
 * @throws If MongoDB query fails.
 */
export const getGamesByStatus = async (
  status: GameStatus
): Promise<IGame[]> => {
  try {
    const activeGames = await Game.find({ status });
    return activeGames;
  } catch (err) {
    throw new Error('Error retrieving active games: ' + err);
  }
};

/**
 * Retrieves all games associated with a specific user.
 *
 * This includes games where the user was either code master or code breaker.
 *
 * @param userId - The user’s public key (base58 format).
 * @returns {Promise<IGame[]>} An array of game documents linked to the user.
 * @throws If MongoDB query fails.
 */
export const getUserGames = async (userId: string): Promise<IGame[]> => {
  try {
    const userGames = await Game.find({
      $or: [{ codeMaster: userId }, { codeBreaker: userId }],
    });
    return userGames;
  } catch (err) {
    throw new Error('Error retrieving user games: ' + err);
  }
};

/**
 * Deletes a game document by its ID.
 *
 * @param _id - The ID of the game to delete.
 * @returns {Promise<DeleteResult>}
 * @throws If deletion fails.
 */
export const deleteGame = async (_id: string): Promise<DeleteResult> => {
  try {
    return await Game.deleteOne({ _id });
  } catch (err) {
    throw new Error('Error deleting game: ' + err);
  }
};

/**
 * Migrates all games with status `IN_PROGRESS` to `ON_CHAIN`.
 *
 * This is used during server recovery to allow players to continue games directly
 * on the blockchain, ensuring fault-tolerant gameplay after outages.
 *
 * @returns {Promise<UpdateResult>}
 * @throws If the updateMany operation fails.
 */
export const resumeOnGoingGames = async (): Promise<UpdateResult> => {
  try {
    const userGames = await Game.updateMany(
      { status: GameStatus.IN_PROGRESS },
      { $set: { status: GameStatus.ON_CHAIN } }
    );
    return userGames;
  } catch (err) {
    throw new Error('Error while resuming games on chain: ' + err);
  }
};

export const getLobbyData = async (options: {
  baseMatch: Object;
  sortBy: string;
  sortOrder: 1 | -1 | 'asc' | 'desc';
  skip: number;
  limit: number;
}): Promise<[IGame[], number]> => {
  try {
    return await Promise.all([
      Game.find(options.baseMatch)
        .sort({ [options.sortBy]: options.sortOrder })
        .skip(options.skip)
        .limit(options.limit)
        .select(
          '_id rewardAmount createdAt turnCount roomName status lastAcceptTimestamp codeMaster codeBreaker timestamp'
        )
        .lean(),
      Game.countDocuments(options.baseMatch),
    ]);
  } catch (err) {
    throw new Error('Error while getting lobby data: ' + err);
  }
};

export const getInProgressGamesByPlayer = async (
  userId: string
): Promise<IGame[]> => {
  try {
    return await Game.find({
      status: GameStatus.IN_PROGRESS,
      $or: [{ codeMaster: userId }, { codeBreaker: userId }],
    })
      .select(
        '_id rewardAmount createdAt turnCount roomName status lastAcceptTimestamp codeMaster codeBreaker timestamp'
      )
      .lean();
  } catch (err) {
    throw new Error('Error while getting in progress games: ' + err);
  }
};
