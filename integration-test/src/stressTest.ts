/* eslint-disable no-unused-vars */
import { Mina } from 'o1js';
import {
  MastermindZkApp,
  StepProgram,
} from '@navigators-exploration-team/mina-mastermind';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';

import { MastermindGame } from './MastermindGame.js';
dotenv.config();

const NETWORK_URL = process.env.MINA_NETWORK_URL as string;

const network = Mina.Network(NETWORK_URL);
Mina.setActiveInstance(network);
async function initialize() {
  console.log('Compiling StepProgram...');
  console.time('StepProgram compilation');
  await StepProgram.compile();
  console.log('StepProgram compiled');
  console.timeEnd('StepProgram compilation');
  console.log('Compiling MastermindZkApp...');
  console.time('zkApp compilation');
  await MastermindZkApp.compile();
  console.log('MastermindZkApp compiled');
  console.timeEnd('zkApp compilation');
}

initialize().then(() => {
  try {
    const jsonGames = readFileSync('games.json', 'utf-8');
    const gameList = JSON.parse(jsonGames);

    const MINA_NETWORK = process.env.MINA_NETWORK;
    const games = gameList?.[MINA_NETWORK!] as Array<{
      codeMaster: string;
      codeBreaker: string;
      attempts: number;
    }>;
    const args = process.argv.slice(2); 
    const index = parseInt(args[0], 10);
    new MastermindGame({
      codeMasterPrivateKeyBase58: games[index].codeMaster,
      codeBreakerPrivateKeyBase58: games[index].codeBreaker,
      attempts: 7,
    });
  } catch (e) {
    console.log(e);
  }
  console.log(process.env.name, ' initialized ');
});
