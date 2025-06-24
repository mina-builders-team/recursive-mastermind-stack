/**
 * Provides utilities to set up and interact with the Mastermind zkApp and its associated step program.
 * This includes:
 * - Compiling the zkApp and step program to obtain verification keys.
 * - Checking game state using a submitted proof.
 *
 * Used during server initialization and runtime to verify game integrity.
 */

import { fetchAccount, Mina, PublicKey } from 'o1js';
import dotenv from 'dotenv';
import {
  Clue,
  MastermindZkApp,
  StepProgram,
  StepProgramProof,
} from '@navigators-exploration-team/mina-mastermind';
dotenv.config();

/**
 * Compiles the zkProgram (`StepProgram`) and the contract (`MastermindZkApp`) to obtain their respective verification keys.
 * This is typically run during server startup to provide the necessary keys for proof verification and contract integrity checks.
 *
 * @returns An object containing:
 *  - `stepProgramVerificationKey`: Verification key from compiling StepProgram.
 *  - `contractVerificationKey`: Verification key from compiling the MastermindZkApp.
 */
export const setupContract = async () => {
  const network = Mina.Network({
    mina: process.env.MINA_NETWORK_URL as string,
    archive: process.env.MINA_ARCHIVE_URL as string,
  });
  Mina.setActiveInstance(network);
  console.log('Compiling StepProgram...');
  console.time('StepProgram compilation');
  const { verificationKey: stepProgramVerificationKey } =
    await StepProgram.compile();
  console.log('StepProgram compiled');
  console.timeEnd('StepProgram compilation');
  console.log('Compiling MastermindZkApp...');
  console.time('zkApp compilation');
  const { verificationKey: contractVerificationKey } =
    await MastermindZkApp.compile();
  console.log('MastermindZkApp compiled');
  console.timeEnd('zkApp compilation');
  return { stepProgramVerificationKey, contractVerificationKey };
};

/**
 * Checks the status of a Mastermind game by verifying the latest step proof.
 *
 * This function is primarily used to determine whether a game has been solved and the current turn count,
 * based on the latest submitted `StepProgramProof`.
 *
 * @param zkProof - A deserialized `StepProgramProof` instance containing the game's last move and clue.
 *
 * @returns An object with:
 *  - `turnCount`: The number of turns taken so far in the game.
 *  - `isSolved`: Boolean indicating whether the game has been solved.
 */
export async function checkGameStatus(
  zkProof: StepProgramProof
) {
  try {
    const turnCount = zkProof.publicOutput.turnCount.toString();
    const deserializedClue = Clue.decompress(
      zkProof.publicOutput.lastcompressedClue
    );
    const isGameSolved = deserializedClue.isSolved();
    return {
      turnCount: Number(turnCount),
      isSolved: isGameSolved.toBoolean(),
    };
  } catch (e) {
    console.log('error : ', e);
  }

  return {
    turnCount: null,
    isSolved: null,
  };
}
