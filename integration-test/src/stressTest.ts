/* eslint-disable no-unused-vars */
import { Mina, Transaction } from 'o1js';
import { MastermindZkApp, StepProgram } from 'stan-mastermind';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';

import { MastermindGame, PlayerRole } from './MastermindGame.js';
dotenv.config();

const NETWORK_URL = process.env.MINA_NETWORK_URL as string;
let createdGames: Array<MastermindGame> = [];
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

initialize().then(async () => {
  try {
    const jsonGames = readFileSync('games.json', 'utf-8');
    const gameList = JSON.parse(jsonGames);

    const MINA_NETWORK = process.env.MINA_NETWORK;

    const arg = process.argv[2];
    let limit: number | undefined;

    if (arg !== undefined) {
      const parsed = Number(arg);
      if (isNaN(parsed) || parsed <= 0) {
        console.error(`Invalid argument: "${arg}". Must be a positive number.`);
        process.exit(1);
      }
      limit = parsed;
    }

    const games = gameList?.[MINA_NETWORK!] as Array<{
      codeMaster: string;
      codeBreaker: string;
      attempts: number;
    }>;

    let selectedGames: typeof games;

    if (limit !== undefined) {
      selectedGames = games.slice(0, limit);
    } else {
      selectedGames = games;
    }

    console.log(`Selected ${selectedGames.length} games`);

    for (let i = 0; i < selectedGames.length; i++) {
      const game = new MastermindGame({
        codeMasterPrivateKeyBase58: selectedGames[i].codeMaster,
        codeBreakerPrivateKeyBase58: selectedGames[i].codeBreaker,
        attempts: 7,
        autoPlay: false,
        concurrentGameCount: selectedGames.length,
      });
      await game.createGame();
      createdGames.push(game);
    }
    const createPromises = createdGames.map(async (game) => {
      const sentTx = await game.createGameTx?.send();
      console.log('create game tx hash ', sentTx?.hash);
      return await sentTx?.wait();
    });
    await Promise.all(createPromises);
    for (let i = 0; i < createdGames.length; i++) {
      await createdGames[i].acceptGame();
    }
    const sendAcceptPromises = createdGames.map(async (game) => {
      const sentTx = await game.acceptGameTx?.send();
      console.log('accept game tx hash ', sentTx?.hash);
      return await sentTx?.wait();
    });
    await Promise.all(sendAcceptPromises);

    for (let i = 0; i < selectedGames.length; i++) {
      createdGames[i].setAutoPlay(true);
      createdGames[i].startGame();
    }
  } catch (e) {
    console.log(e);
  }
  console.log(process.env.name, ' initialized ');
});
