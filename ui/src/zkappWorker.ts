import {
  Mina,
  fetchAccount,
  Field,
  AccountUpdate,
  PublicKey,
  PrivateKey,
  Signature,
  Cache,
  UInt64,
  Poseidon,
  verify,
  fetchLastBlock,
} from 'o1js';
import {
  Combination,
  GameState,
  MastermindZkApp,
  StepProgram,
  StepProgramProof,
} from '@navigators-exploration-team/mina-mastermind';
import {
  fetchZkAppCacheFiles,
  fetchZkProgramCacheFiles,
  generateColoredCluesHistory,
  generateColoredGuessHistory,
  MinaFileSystem,
} from './utils';
import { SignedData } from './store/zkAppModule';
type Transaction = Awaited<ReturnType<typeof Mina.transaction>>;

interface VerificationKeyData {
  data: string;
  hash: Field;
}

const state = {
  MastermindContract: null as null | typeof MastermindZkApp,
  zkappInstance: null as null | MastermindZkApp,
  transaction: null as null | Transaction,
  verificationKey: null as null | VerificationKeyData | any,
  proofsEnabled: false,
  zkAppAddress: null as null | string,
  lastProof: null as null | StepProgramProof,
};

const functions = {
  setMinaActiveInstance: async () => {
    const network = Mina.Network({
      mina: import.meta.env.VITE_MINA_NETWORK_URL,
    });
    Mina.setActiveInstance(network);
  },
  loadContract: async () => {
    const { MastermindZkApp } = await import(
      '@navigators-exploration-team/mina-mastermind'
    );
    state.MastermindContract = MastermindZkApp;
  },
  compileContract: async () => {
    try {
      const zkAppCacheFiles = await fetchZkAppCacheFiles();
      const zkProgramCacheFiles = await fetchZkProgramCacheFiles();
      const zkAppCache = MinaFileSystem(zkAppCacheFiles) as Cache;
      const zkProgramCache = MinaFileSystem(zkProgramCacheFiles) as Cache;
      console.time('compiling');
      const { verificationKey } = await StepProgram.compile({
        cache: zkProgramCache,
      });
      await state.MastermindContract!.compile({
        cache: zkAppCache,
      });
      console.timeEnd('compiling');
      state.verificationKey = verificationKey;
    } catch (e) {
      console.log('error: ', e);
    }
  },
  fetchAccount: async (args: { publicKey58: string }) => {
    const publicKey = PublicKey.fromBase58(args.publicKey58);
    return await fetchAccount({ publicKey });
  },
  proveTransaction: async () => {
    await state.transaction!.prove();
  },
  getTransactionJSON: async () => {
    return state.transaction!.toJSON();
  },
  createInitGameTransaction: async (args: {
    feePayer: string;
    separatedSecretCombination: number[];
    salt: string;
    refereePubKeyBase58: string;
    rewardAmount: number;
  }) => {
    let zkAppPrivateKey = PrivateKey.random();
    let zkAppAddress = zkAppPrivateKey.toPublicKey();
    state.zkappInstance = new state.MastermindContract!(zkAppAddress);
    const feePayerPublickKey = PublicKey.fromBase58(args.feePayer);
    const refereePubKey = PublicKey.fromBase58(args.refereePubKeyBase58);
    const combination = Combination.from(args.separatedSecretCombination);
    const transaction = await Mina.transaction(feePayerPublickKey, async () => {
      AccountUpdate.fundNewAccount(feePayerPublickKey);
      state.zkappInstance!.deploy();
      await state.zkappInstance!.initGame(
        combination,
        Field(args.salt),
        refereePubKey,
        UInt64.from(args.rewardAmount)
      );
    });
    transaction.sign([zkAppPrivateKey]);
    state.transaction = transaction;
    state.zkAppAddress = zkAppAddress.toBase58();
    return zkAppAddress.toBase58();
  },
  sendNewGameProof: async (args: {
    signedData: SignedData;
    separatedSecretCombination: number[];
    salt: string;
  }) => {
    try {
      const signature = Signature.fromBase58(args.signedData.signature);
      const codeMasterPubKey = PublicKey.fromBase58(args.signedData.publicKey);
      const combination = Combination.from(args.separatedSecretCombination);
      const stepProof = await StepProgram.createGame(
        {
          authPubKey: codeMasterPubKey,
          authSignature: signature,
        },
        combination,
        Field(args.salt),
        PublicKey.fromBase58(state.zkAppAddress as string)
      );
      state.lastProof = stepProof.proof;
      return stepProof.proof.toJSON();
    } catch (e) {
      console.log(e);
    }
  },
  createGuessProof: async (args: {
    signedData: SignedData;
    separatedGuess: number[];
  }) => {
    const signature = Signature.fromBase58(args.signedData.signature);
    const codeBreakerPubKey = PublicKey.fromBase58(args.signedData.publicKey);
    const stepProof = await StepProgram.makeGuess(
      {
        authPubKey: codeBreakerPubKey,
        authSignature: signature,
      },
      state.lastProof as StepProgramProof,
      Combination.from(args.separatedGuess),
      PublicKey.fromBase58(state.zkAppAddress as string)
    );
    state.lastProof = stepProof.proof;
    return stepProof.proof.toJSON();
  },
  createGuessTransaction: async (args: {
    feePayer: string;
    separatedGuess: number[];
  }) => {
    const feePayerPublickKey = PublicKey.fromBase58(args.feePayer);
    const transaction = await Mina.transaction(feePayerPublickKey, async () => {
      await state.zkappInstance?.makeGuess(
        Combination.from(args.separatedGuess)
      );
    });
    state.transaction = transaction;
  },
  createGiveClueTransaction: async (args: {
    feePayer: string;
    secretCombination: number[];
    randomSalt: string;
  }) => {
    const feePayerPublickKey = PublicKey.fromBase58(args.feePayer);
    const transaction = await Mina.transaction(feePayerPublickKey, async () => {
      await state.zkappInstance?.giveClue(
        Combination.from(args.secretCombination),
        Field(args.randomSalt)
      );
    });
    state.transaction = transaction;
  },
  initZkappInstance: async (args: { publicKeyBase58: string }) => {
    const publicKey = PublicKey.fromBase58(args.publicKeyBase58);
    await fetchAccount({ publicKey });
    state.zkappInstance = new state.MastermindContract!(publicKey);
    state.zkAppAddress = args.publicKeyBase58;
  },
  createGiveClueProof: async (args: {
    signedData: SignedData;
    secretCombination: number[];
    randomSalt: string;
  }) => {
    const signature = Signature.fromBase58(args.signedData.signature);
    const codeMasterPubKey = PublicKey.fromBase58(args.signedData.publicKey);
    const stepProof = await StepProgram.giveClue(
      {
        authPubKey: codeMasterPubKey,
        authSignature: signature,
      },
      state.lastProof as StepProgramProof,
      Combination.from(args.secretCombination),
      Field(args.randomSalt),
      PublicKey.fromBase58(state.zkAppAddress as string)
    );
    state.lastProof = stepProof.proof;
    return stepProof.proof.toJSON();
  },
  createAcceptGameTransaction: async (args: { feePayer: string }) => {
    const feePayerPublickKey = PublicKey.fromBase58(args.feePayer);
    const transaction = await Mina.transaction(feePayerPublickKey, async () => {
      await state.zkappInstance!.acceptGame();
    });
    state.transaction = transaction;
  },
  getZkAppStates: async () => {
    const publicKey = PublicKey.fromBase58(state.zkAppAddress as string);
    await fetchAccount({ publicKey });
    const [
      codeMasterId,
      codeBreakerId,
      compressedState,
      packedGuessHistory,
      packedClueHistory,
    ] = await Promise.all([
      state.zkappInstance!.codeMasterId.get(),
      state.zkappInstance!.codeBreakerId.get(),
      state.zkappInstance!.compressedState.get(),
      state.zkappInstance!.packedGuessHistory.get(),
      state.zkappInstance?.packedClueHistory.get(),
    ]);
    let { rewardAmount, finalizeSlot, turnCount, isSolved, lastPlayedSlot } =
      GameState.unpack(compressedState);

    return {
      rewardAmount: Number(rewardAmount.toString()),
      lastPlayedSlot: Number(lastPlayedSlot.toString()),
      finalizeSlot: Number(finalizeSlot.toString()),
      codeBreakerId: codeBreakerId.toString(),
      codeMasterId: codeMasterId.toString(),
      turnCount: Number(turnCount.toString()),
      isSolved: isSolved.toString(),
      guessesHistory: generateColoredGuessHistory(packedGuessHistory),
      cluesHistory: generateColoredCluesHistory(
        packedClueHistory,
        Number(turnCount.toString())
      ),
    };
  },
  getZkProofStates: async () => {
    if (state.lastProof) {
      const {
        codeMasterId,
        codeBreakerId,
        solutionHash,
        turnCount,
        packedGuessHistory,
        packedClueHistory,
      } = state.lastProof.publicOutput;
      return {
        guessesHistory: generateColoredGuessHistory(packedGuessHistory),
        solutionHash: solutionHash.toString(),
        codeBreakerId: codeBreakerId.toString(),
        codeMasterId: codeMasterId.toString(),
        turnCount: Number(turnCount.toString()),
        cluesHistory: generateColoredCluesHistory(
          packedClueHistory,
          Number(turnCount.toString())
        ),
      };
    }
    return null;
  },
  getUserRole: async (args: { playerPubKeyBase58: string }) => {
    try {
      const publicKey = PublicKey.fromBase58(args.playerPubKeyBase58 as string);
      await fetchAccount({ publicKey });
      const playerId = Poseidon.hash(publicKey.toFields());
      const [codeMasterId, codeBreakerId] = await Promise.all([
        state.zkappInstance!.codeMasterId.get(),
        state.zkappInstance!.codeBreakerId.get(),
      ]);

      return playerId.toString() === codeMasterId.toString()
        ? 'CODE_MASTER'
        : playerId.toString() === codeBreakerId.toString()
          ? 'CODE_BREAKER'
          : 'UNKNOWN';
    } catch (e) {
      console.log('Error getting user role: ', e);
    }
  },
  setLastProof: async (args: { zkProof: any }) => {
    state.lastProof = await StepProgramProof.fromJSON(JSON.parse(args.zkProof));
  },
  submitGameProof: async (args: { zkProof: string }) => {
    const transaction = await Mina.transaction(async () => {
      const proof = await StepProgramProof.fromJSON(JSON.parse(args.zkProof));
      await state.zkappInstance!.submitGameProof(proof, PublicKey.empty());
    });
    state.transaction = transaction;
  },
  createClaimRewardTransaction: async (args: { feePayer: string }) => {
    const feePayerPublickKey = PublicKey.fromBase58(args.feePayer);
    const transaction = await Mina.transaction(feePayerPublickKey, async () => {
      await state.zkappInstance!.claimReward();
    });
    state.transaction = transaction;
  },
  hasEnoughFunds: async (args: { publicKey: string; rewardAmount: number }) => {
    const res = await functions.fetchAccount({ publicKey58: args.publicKey });
    if (res.account) {
      return Number(res.account.balance.toString()) > args.rewardAmount;
    }
    return false;
  },
  createCancelGameTransaction: async (args: {
    feePayer: string;
    gamePublicKeyBase58: string;
  }) => {
    const feePayerPublickKey = PublicKey.fromBase58(args.feePayer);
    const gamePublicKey = PublicKey.fromBase58(args.gamePublicKeyBase58);
    const zkApp = new state.MastermindContract!(gamePublicKey);
    const transaction = await Mina.transaction(feePayerPublickKey, async () => {
      await zkApp!.claimReward();
    });
    state.transaction = transaction;
  },
  verifyProof: async (args: { zkProof: string }) => {
    try {
      const receivedProof = await StepProgramProof.fromJSON(
        JSON.parse(args.zkProof)
      );
      return await verify(receivedProof, state.verificationKey);
    } catch (e) {
      console.log('Error verifying proof: ', e);
      return false;
    }
  },
  fetchCurrentSlot: async () => {
    try {
      const latestBlock = await fetchLastBlock(
        import.meta.env.VITE_MINA_NETWORK_URL
      );
      return Number(latestBlock.globalSlotSinceGenesis.toString());
    } catch (e) {
      console.log('Error verifying proof: ', e);
      return false;
    }
  },
  benchmark: async (args: { feePayer: string }) => {
    const zkAppPrivateKey = PrivateKey.random();
    const zkAppAddress = zkAppPrivateKey.toPublicKey();
    const feePayerPubKey = PublicKey.fromBase58(args.feePayer);
    const codeMasterKey = PrivateKey.random();
    const codeMasterPublicKey = codeMasterKey.toPublicKey();
    const codeBreakerKey = PrivateKey.random();
    const refereePubKey = PublicKey.empty();
    const secret = Combination.from([1, 2, 3, 4]);
    const salt = Field.random();
    try {
      // Init Game Tx
      const beginInitGameTx = performance.now();
      const zkApp = new MastermindZkApp(zkAppAddress);
      const transaction = await Mina.transaction(feePayerPubKey, async () => {
        AccountUpdate.fundNewAccount(feePayerPubKey);
        zkApp.deploy();
        await zkApp.initGame(
          secret,
          salt,
          refereePubKey,
          UInt64.from(10 * 1e9)
        );
      });
      transaction.sign([zkAppPrivateKey]);
      await transaction.prove();
      const endInitGameTx = performance.now();
      // Create Game Proof
      const beginCreateGameProof = performance.now();
      const signature = Signature.create(codeMasterKey, [
        ...secret.digits,
        salt,
        ...zkAppAddress.toFields(),
      ]);
      const baseProof = await StepProgram.createGame(
        {
          authPubKey: codeMasterPublicKey,
          authSignature: signature,
        },
        secret,
        salt,
        zkAppAddress
      );
      const endCreateGameProof = performance.now();
      /// Create Guess Proof
      const beginGuessProof = performance.now();
      const guessCombination = Combination.from([1, 2, 3, 4]);
      const guessProof = await StepProgram.makeGuess(
        {
          authPubKey: codeBreakerKey.toPublicKey(),
          authSignature: Signature.create(codeBreakerKey, [
            ...guessCombination.digits,
            baseProof.proof.publicOutput.turnCount.value,
            ...zkAppAddress.toFields(),
          ]),
        },
        baseProof.proof,
        guessCombination,
        zkAppAddress
      );
      const endGuessProof = performance.now();

      // Give Clue Proof
      const beginClueProof = performance.now();
      await StepProgram.giveClue(
        {
          authPubKey: codeMasterKey.toPublicKey(),
          authSignature: Signature.create(codeMasterKey, [
            ...secret.digits,
            salt,
            guessProof.proof.publicOutput.turnCount.value,
            ...zkAppAddress.toFields(),
          ]),
        },
        guessProof.proof,
        secret,
        salt,
        zkAppAddress
      );
      const endClueProof = performance.now();
      return {
        initGameTxDuration: ((endInitGameTx - beginInitGameTx) / 1000).toFixed(
          2
        ),
        createGameProofDuration: (
          (endCreateGameProof - beginCreateGameProof) /
          1000
        ).toFixed(2),
        guessProofDuration: ((endGuessProof - beginGuessProof) / 1000).toFixed(
          2
        ),
        clueProofDuration: ((endClueProof - beginClueProof) / 1000).toFixed(2),
      };
    } catch (e) {
      console.log(e);
      return {
        initGameTxDuration: 0,
        createGameProofDuration: 0,
        guessProofDuration: 0,
        clueProofDuration: 0,
      };
    }
  },
};

// ---------------------------------------------------------------------------------------

export type WorkerFunctions = keyof typeof functions;

export type ZkappWorkerRequest = {
  id: number;
  fn: WorkerFunctions;
  args: any;
};

export type ZkappWorkerReponse = {
  id: number;
  data: any;
};

addEventListener('message', async (event: MessageEvent<ZkappWorkerRequest>) => {
  try {
    const returnData = await functions[event.data.fn](event.data.args);
    postMessage({
      id: event.data.id,
      data: returnData,
    });
  } catch (error) {
    postMessage({
      id: event.data.id,
      data: null,
      error:
        error instanceof Error
          ? error.message.substring(0, error.message.indexOf('!'))
          : 'Unknown error',
    });
  }
});
