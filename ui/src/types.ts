export interface AvailableColor {
  color: string;
  value: number | string;
  title?: string;
}

export interface ZkAppStates {
  turnCount: number;
  isSolved: boolean;
  codemasterId: string;
  codebreakerId: string;
  solutionHash: string;
  packedGuessHistory: string;
  packedClueHistory: string;
}

export interface CodePicker {
  code: AvailableColor[];
  randomSalt: string;
}

export interface GameParams {
  rewardAmount: number | null;
  refereePubKeyBase58: string;
}
export interface Game {
  _id: string;
  lastProof: any;
  rewardAmount: number;
  timestamp: number;
  codeBreaker?: string;
  codeMaster: string;
  winnerPublicKeyBase58?: string;
  status: string;
  settlementTransactionHash?: string;
  lastAcceptTimestamp?: number;
  penalizationTransactionHash?: string;
  turnCount: number;
  cancelTransactionHash?: string;
  lastCancelTimestamp?: number;
  refereePubKeyBase58: string;
  isRefereeVerified: boolean;
  roomName?: string;
  gameCreationTransactionHash?: string;
  lastJoinAttemptBy?: string;
  finalTransactionTimestamp?: number;
}

export type Player = {
  _id: string;
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
};
