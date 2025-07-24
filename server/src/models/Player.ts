import mongoose, { Schema, Document } from 'mongoose';

export interface IPlayer extends Document {
  publicKey: string;
  gamesPlayed: number;
  winsAsCodeBreaker: number;
  winsAsCodeMaster: number;
  netRewards: number;
  creatorScore: number;
  breakerScore: number;
  dualScore: number;
  badges: string[];
  totalScore: number;
  currentStreak: number;
  maxStreak: number;
  createdGames: number;
  crackedGames: number;
  crackedInUnder5: number;
  lastGameDate: Date;
}

const PlayerSchema = new Schema<IPlayer>(
  {
    _id: { type: String, unique: true, required: true },
    gamesPlayed: { type: Number, default: 0 },
    winsAsCodeBreaker: { type: Number, default: 0 },
    winsAsCodeMaster: { type: Number, default: 0 },
    netRewards: { type: Number, default: 0 },
    totalScore: { type: Number, default: 100 },
    currentStreak: { type: Number, default: 0 },
    maxStreak: { type: Number, default: 0 },
    createdGames: { type: Number, default: 0 },
    crackedGames: { type: Number, default: 0 },
    crackedInUnder5: { type: Number, default: 0 },
    lastGameDate: {
      type: Date,
      default: () => {
        const date = new Date();
        date.setDate(date.getDate() - 1);
        return date;
      },
    },

    badges: { type: [String], default: [] },
  },
  { timestamps: true }
);

const Player = mongoose.model<IPlayer>('Player', PlayerSchema);
export default Player;
