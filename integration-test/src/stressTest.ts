/* eslint-disable no-unused-vars */
import { Mina, Transaction } from 'o1js';
import { MastermindZkApp, StepProgram } from 'stan-mastermind';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';

import { MastermindGame } from './MastermindGame.js';
dotenv.config();

const NETWORK_URL = process.env.MINA_NETWORK_URL as string;
let createdGames: Array<{ tx: Transaction<true, true>; game: MastermindGame }> =
  [];
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
    const games = gameList?.[MINA_NETWORK!] as Array<{
      codeMaster: string;
      codeBreaker: string;
      attempts: number;
    }>;
    console.log(games);

    for (let i = 0; i < games.length; i++) {
      const game = new MastermindGame({
        codeMasterPrivateKeyBase58: games[i].codeMaster,
        codeBreakerPrivateKeyBase58: games[i].codeBreaker,
        attempts: 7,
        autoPlay: false,
      });
      await game.createGame();
      const tx = await game.acceptGame();
      createdGames.push({ game, tx });
    }
    const promises = createdGames.map(async (game) => {
      const sentTx = await game.tx.send();
      console.log('accept game tx hash ', sentTx.hash);
      return await sentTx.wait();
    });
    await Promise.all(promises);
    for (let i = 0; i < games.length; i++) {
      createdGames[i].game.setAutoPlay(true);
      createdGames[i].game.startGame();
    }
  } catch (e) {
    console.log(e);
  }
  console.log(process.env.name, ' initialized ');
});
