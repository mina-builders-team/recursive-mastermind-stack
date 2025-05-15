/* eslint-disable no-unused-vars */
import mongoose, { Schema, Document } from 'mongoose';

export enum GameStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  IN_PROGRESS = 'IN_PROGRESS',
  ENDED = 'ENDED',
  PENALIZED = 'PENALIZED',
  CANCELLED = 'CANCELLED',
  FAKE = 'FAKE'
}

export interface IGame extends Document {
  _id: string;
  lastProof: any;
  rewardAmount: number;
  timestamp: number;
  codeBreaker?: string;
  codeMaster: string;
  winnerPublicKeyBase58?: string;
  status: GameStatus;
  settlementTransactionHash?: string;
  lastAcceptTimestamp: number;
  penalizationTransactionHash?: string;
  turnCount: number;
  cancelTransactionHash?: string;
  lastCancelTimestamp: number;
  refereePubKeyBase58: string;
  isRefereeVerified: boolean;
}

const gameSchema: Schema = new Schema(
  {
    _id: { type: String, required: true },
    lastProof: { type: Schema.Types.Mixed, required: true },
    rewardAmount: { type: Number, required: true },
    timestamp: { type: Number, default: Date.now },
    codeBreaker: { type: String, required: false },
    codeMaster: { type: String, required: true },
    winnerPublicKeyBase58: { type: String, required: false },
    status: {
      type: String,
      enum: Object.values(GameStatus),
      default: GameStatus.PENDING,
      required: true,
    },
    settlementTransactionHash: { type: String, required: false },
    lastAcceptTimestamp: { type: Number, required: false },
    penalizationTransactionHash: { type: String, required: false },
    turnCount: { type: Number, required: false },
    cancelTransactionHash: { type: String, required: false },
    lastCancelTimestamp: { type: Number, required: false },
    refereePubKeyBase58: { type: String, required: true },
    isRefereeVerified: { type: Boolean, required: true },
  },
  { timestamps: true }
);

const Game = mongoose.model<IGame>('Game', gameSchema);

export default Game;
