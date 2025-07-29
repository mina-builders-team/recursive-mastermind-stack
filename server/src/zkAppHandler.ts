/**
 * Provides utilities to set up and interact with the Mastermind zkApp and its associated step program.
 * This includes:
 * - Compiling the zkApp and step program to obtain verification keys.
 * - Checking game state using a submitted proof.
 *
 * Used during server initialization and runtime to verify game integrity.
 */

import { Mina } from 'o1js';
import dotenv from 'dotenv';
import {
  MastermindZkApp,
  StepProgram,
} from 'stan-mastermind';
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
