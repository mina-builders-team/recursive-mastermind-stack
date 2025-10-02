/**
 * Utility functions for the Mina Mastermind frontend.
 *
 * This module provides various helpers for:
 * - Formatting and displaying player and game data.
 * - Decompressing and visualizing game history (guesses, clues) from zkApp state and zk proofs.
 * - Validating color combinations for user input.
 * - Interfacing with localStorage to persist game metadata across sessions.
 * - Loading cached verification key files for performance optimizations.
 */

import {
  Clue,
  Combination,
} from '@navigators-exploration-team/mina-mastermind';
import { availableColors, cluesColors, initialColor } from './constants/colors';
import { AvailableColor } from './types';
import { Field, Cache, Bool } from 'o1js';
import { MAX_ATTEMPTS } from './constants/config';
import { leaderboardTitles } from './constants/titles';

/**
 * Formats a public key address by truncating the middle for display purposes.
 * Example: 'B62q...xyz01'
 *
 * @param address - The full public key address in base 58.
 * @returns The formatted address string.
 */
export function formatAddress(address: string): string {
  return address ? `${address?.slice(0, 5)}...${address?.slice(-5)}` : '';
}

/**
 * Decomposes a serialized game history field into an array of bit chunks.
 * Each chunk represents a guess or clue depending on the provided chunk size.
 *
 * @param serializedHistory - The field value encoding all previous moves.
 * @param chunkSize - Number of bits allocated for each move or clue.
 * @returns An array of bit arrays representing individual guesses or clues.
 */
const decomposeHistory = (serializedHistory: Field, chunkSize: number) => {
  const historyBits = serializedHistory.toBits(chunkSize * MAX_ATTEMPTS);
  const historyBitPacks: Bool[][] = [];
  for (let i = 0; i < historyBits.length; i += chunkSize) {
    historyBitPacks.push(historyBits.slice(i, i + chunkSize));
  }
  return historyBitPacks;
};

/**
 * Decompresses the packed guess history from the field into an array of string digits.
 *
 * @param compressedHistory - The compressed guess history field from the zkApp.
 * @returns An array of string representations of each guess.
 */
function decompressHistory(compressedHistory: Field) {
  return decomposeHistory(compressedHistory, 12).map((bits) =>
    Combination.decompress(Field.fromBits(bits)).digits.toString()
  );
}

/**
 * Converts a compressed guess history into an array of color-coded guesses.
 *
 * @param packedGuessHistory - Field representing compressed guesses.
 * @returns Array of color arrays representing guesses.
 */
export function generateColoredGuessHistory(
  packedGuessHistory: Field
): Array<AvailableColor[]> {
  try {
    const guesses = decompressHistory(packedGuessHistory);
    return guesses.map((e: string) => {
      return e === '0' || e === '0,0,0,0'
        ? Array.from({ length: 4 }, () => initialColor)
        : e.split(',').map((num: string) => {
            const colorObj = availableColors.find(
              (c) => c.value === Number(num)
            );
            return colorObj ?? initialColor;
          });
    });
  } catch (error) {
    console.error('error: ', error);
    return [];
  }
}

/**
 * Converts a compressed clue history into an array of Clue objects.
 *
 * @param compressedHistory - Field containing compressed clue data.
 * @returns Array of Clue objects.
 */
const deserializeClueHistory = (compressedHistory: Field) => {
  return decomposeHistory(compressedHistory, 6).map((bits) =>
    Clue.decompress(Field.fromBits(bits))
  );
};

/**
 * Generates a color-coded representation of clue history for display.
 *
 * @param packedClueHistory - Field representing compressed clue history.
 * @param round - Current round number in the game.
 * @returns Array of color arrays representing clues.
 */
export function generateColoredCluesHistory(
  packedClueHistory: Field,
  round: number
): Array<AvailableColor[]> {
  const deserializedClueHistory = deserializeClueHistory(packedClueHistory);

  return deserializedClueHistory.map((e: Clue, index: number) => {
    const hitColor = cluesColors.find((c) => c.value === 2);
    const blowColor = cluesColors.find((c) => c.value === 1);
    const missColor = cluesColors.find((c) => c.value === 0);
    return index >= Math.floor((round - 1) / 2)
      ? Array.from({ length: 4 }, () => initialColor)
      : [
          ...Array.from({ length: Number(e.hits) }, () => hitColor!),
          ...Array.from({ length: Number(e.blows) }, () => blowColor!),
          ...Array.from(
            { length: 4 - (Number(e.hits) + Number(e.blows)) },
            () => missColor!
          ),
        ];
  });
}

/**
 * Validates that a color combination contains distinct values from 0 to 7.
 *
 * @param combination - Array of selected colors.
 * @returns Object indicating validity and an optional error message.
 */
export function validateColorCombination(combination: AvailableColor[]) {
  const combinationDigits = combination?.map(({ value }) => Field(value));
  const comb = new Combination({ digits: combinationDigits });
  let isValid = true;
  try {
    comb.validate();
    return {
      isValid,
      message: '',
    };
  } catch (err: any) {
    isValid = false;
    return {
      isValid,
      message: 'Please choose a combination of 4 unique digits between 0 and 7',
    };
  }
}

/**
 * Generates a random numeric salt string of specified length.
 *
 * @param length - Length of the salt string (default is 20).
 * @returns Random numeric salt string.
 */
export function generateRandomSalt(): string {
  const randomSalt = Field.random();
  return randomSalt.toString();
}

/**
 * Custom cache interface used for reading and writing compiled zkApp artifacts.
 *
 * @param files - Object containing cached file data.
 * @returns A Cache-compliant object.
 */
export const MinaFileSystem = (files: any): Cache => ({
  read({ persistentId, uniqueId, dataType }: any) {
    // read current uniqueId, return data if it matches
    if (!files[persistentId]) {
      // console.log('read');
      // console.log({ persistentId, uniqueId, dataType });

      return undefined;
    }

    const currentId = files[persistentId].header;

    if (currentId !== uniqueId) {
      // console.log('current id did not match persistent id');

      return undefined;
    }

    if (dataType === 'string') {
      // console.log('found in cache', { persistentId, uniqueId, dataType });

      return new TextEncoder().encode(files[persistentId].data);
    }

    return undefined;
  },
  write({}: any, _data: any) {
    // console.log('write');
    // console.log({ persistentId, uniqueId, dataType });
  },
  canWrite: true,
});

/**
 * Fetches zkApp cache files required for contract interaction.
 *
 * @returns A promise resolving to the fetched zkApp cache content.
 */
export function fetchZkAppCacheFiles() {
  const files = [
    { name: 'lagrange-basis-fp-2048', type: 'string' },

    { name: 'step-vk-mastermindzkapp-acceptgame', type: 'string' },
    { name: 'step-vk-mastermindzkapp-claimreward', type: 'string' },
    { name: 'step-vk-mastermindzkapp-forfeitwin', type: 'string' },
    { name: 'step-vk-mastermindzkapp-giveclue', type: 'string' },
    { name: 'step-vk-mastermindzkapp-initgame', type: 'string' },
    { name: 'step-vk-mastermindzkapp-makeguess', type: 'string' },
    { name: 'step-vk-mastermindzkapp-submitgameproof', type: 'string' },
    { name: 'wrap-vk-mastermindzkapp', type: 'string' },
  ];
  return fetchFiles(files, 'zkAppCache');
}

/**
 * Fetches zkProgram cache files.
 *
 * @returns A promise resolving to the fetched zkProgram cache content.
 */
export function fetchZkProgramCacheFiles() {
  const files = [
    { name: 'srs-fp-65536', type: 'string' },
    { name: 'srs-fq-32768', type: 'string' },
    { name: 'lagrange-basis-fq-16384', type: 'string' },
    { name: 'lagrange-basis-fp-16384', type: 'string' },
    { name: 'lagrange-basis-fp-8192', type: 'string' },
    { name: 'step-vk-stepprogram-creategame', type: 'string' },
    { name: 'step-vk-stepprogram-giveclue', type: 'string' },
    { name: 'step-vk-stepprogram-makeguess', type: 'string' },
    { name: 'wrap-vk-stepprogram', type: 'string' },
  ];
  return fetchFiles(files, 'zkProgramCache');
}

/**
 * Fetches cache file headers and data from a specified folder.
 *
 * @param files - Array of file definitions with name and type.
 * @param folder - The folder path where the files are stored.
 * @returns A promise resolving to a dictionary of cached file contents.
 */
export function fetchFiles(
  files: Array<{ name: string; type: string }>,
  folder: string
) {
  return Promise.all(
    files.map((file) => {
      return Promise.all([
        fetch(`/${folder}/${file.name}.header`).then((res) => res.text()),
        fetch(`/${folder}/${file.name}`).then((res) => res.text()),
      ]).then(([header, data]) => ({ file, header, data }));
    })
  ).then((cacheList) =>
    cacheList.reduce((acc: any, { file, header, data }) => {
      acc[file.name] = { file, header, data };

      return acc;
    }, {})
  );
}
/**
 * Serializes a combination of digits into a single numeric code.
 *
 * @param code - Array of digits representing a color combination.
 * @returns A single number encoding the combination.
 */
export function serializeSecret(code: number[]) {
  return code.reduce((acc: number, curr: number) => {
    return acc * 10 + curr;
  }, 0);
}

/**
 * Formats a timestamp into a readable date and time string.
 *
 * @param timestamp - Optional timestamp in milliseconds.
 * @returns A formatted date and time string, or '-' if timestamp is undefined.
 */
export function dateToDayHourMin(timestamp?: number): string {
  if (!timestamp) return '-';
  const date = new Date(timestamp);
  const datePart = date.toLocaleDateString('en-CA');
  const timePart = date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  return `${datePart.replace(/-/g, '/')} ${timePart}`;
}

/**
 * Updates the local storage with game metadata for a given game ID.
 *
 * @param gameId - The game ID used as the key in local storage.
 * @param data - Data object to store.
 */
export function updateLocalStorageGames(gameId: string, data: any): void {
  let games: any = {};
  const storedGames = localStorage.getItem('games');
  if (storedGames) {
    games = { ...JSON.parse(storedGames) };
  }
  games = {
    ...games,
    [gameId]: games?.[gameId]
      ? { ...games?.[gameId], ...data, lastUpdatedAt: Date.now() }
      : { ...data, lastUpdatedAt: Date.now() },
  };
  localStorage.setItem('games', JSON.stringify(games));
}

/**
 * Retrieves a stored game object from local storage.
 *
 * @param gameId - The ID of the game to retrieve.
 * @returns The stored game data as a string or null if not found.
 */
export function getStoredGame(gameId: string): any | null {
  const games = localStorage.getItem('games');
  if (games) {
    const jsonGames: any = JSON.parse(games);
    return jsonGames?.[gameId];
  }
  return null;
}

export const getTitleByRank = (rank: number) => {
  return leaderboardTitles.find(
    ({ range }) => rank >= range[0] && rank <= range[1]
  );
};

export const getNextTitleInfo = (rank: number) => {
  for (let i = leaderboardTitles.length - 1; i >= 0; i--) {
    const entry = leaderboardTitles[i];
    const [min, max] = entry.range;
    if (rank >= min && rank <= max) {
      if (i === 0) return null;
      const next = leaderboardTitles[i - 1];
      const ranksToNext = rank - next.range[1] + 1;
      return {
        nextTitle: next.title,
        ranksToNext,
      };
    }
  }
  return null;
};

export const generateRandomSecret = (maxDigit?: number): Array<number> => {
  const solution: Array<number> = [];
  while (solution.length < 4) {
    const r = Math.floor(Math.random() * (maxDigit ? maxDigit : 8));
    if (!solution.includes(r)) {
      solution.push(r);
    }
  }
  return solution;
};
export const generateClue = (guess: AvailableColor[], secret: number[]) => {
  const hitColor = cluesColors.find((c) => c.value === 2);
  const blowColor = cluesColors.find((c) => c.value === 1);
  const missColor = cluesColors.find((c) => c.value === 0);
  let hits = 0;
  let blows = 0;
  guess.map((e, index) => {
    if (secret.includes(Number(e.value))) {
      if (secret[index] === e.value) {
        hits++;
      } else {
        blows++;
      }
    }
  });
  return {
    clue: [
      ...Array.from({ length: Number(hits) }, () => hitColor!),
      ...Array.from({ length: Number(blows) }, () => blowColor!),
      ...Array.from(
        { length: 4 - (Number(hits) + Number(blows)) },
        () => missColor!
      ),
    ],
    isSolved: hits === 4,
  };
};
