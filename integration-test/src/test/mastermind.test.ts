import {
  MastermindZkApp,
  StepProgram,
  StepProgramProof,
} from '@navigators-exploration-team/mina-mastermind';
import {
  Mina,
  Poseidon,
  PrivateKey,
  PublicKey,
  Signature,
  VerificationKey,
  verify,
} from 'o1js';
import { MastermindGame, PlayerRole, REFEREE } from '../MastermindGame.js';
import { readFileSync } from 'fs';
import { WebSocketService } from '../websocket.js';
const WEB_SOCKET_URL = process.env.WEB_SOCKET_URL;
const MINA_NETWORK = process.env.MINA_NETWORK;
const jsonMockGames = readFileSync('games.json', 'utf-8');
const gameList = JSON.parse(jsonMockGames);
const SERVER_URL = `${process.env.SERVER_URL}:${process.env.SERVER_PORT}`;

const mockGame = gameList?.[MINA_NETWORK!][2] as {
  codeMaster: string;
  codeBreaker: string;
  attempts?: number;
  autoPlay?: boolean;
  penalizedPlayer?: string;
};

const waitFor = (ms: number) => new Promise((res) => setTimeout(res, ms));
const expectError = (websocketMsg: { error: string }, errorMsg: string) => {
  expect(websocketMsg).toHaveProperty('error', errorMsg);
};
describe('Mastermind Integration Tests', () => {
  let mastermindGame: MastermindGame;
  let stepProgramVerificationKey: VerificationKey;

  beforeAll(async () => {
    const Network = Mina.Network({
      mina: process.env.MINA_NETWORK_URL as string,
    });
    Mina.setActiveInstance(Network);

    const { verificationKey } = await StepProgram.compile();
    await MastermindZkApp.compile();
    stepProgramVerificationKey = verificationKey;
  });

  describe('Invalid WebSocket Requests Handling', () => {
    beforeAll(async () => {
      mastermindGame = new MastermindGame({
        codeMasterPrivateKeyBase58: mockGame.codeMaster,
        codeBreakerPrivateKeyBase58: mockGame.codeBreaker,
        attempts: mockGame.attempts,
        autoPlay: false,
      });
      mastermindGame.joinGame(PlayerRole.CODE_MASTER);
      await waitFor(15000);
    });
    it('should reject a request missing the zkProof', async () => {
      mastermindGame.codeMasterWebSocket?.send({
        gameId: mastermindGame.gameId,
        action: 'sendProof',
      });
      await waitFor(15000);
      const expectedErrorMsg = 'Missing zkProof!';
      expectError(
        mastermindGame.codeMasterWebSocket?.lastReceivedMessage,
        expectedErrorMsg
      );
    });
    it('should reject a request missing the action', async () => {
      mastermindGame.codeMasterWebSocket?.send({
        gameId: mastermindGame.gameId,
      });
      await waitFor(15000);
      const expectedErrorMsg = 'Bad request!';
      expectError(
        mastermindGame.codeMasterWebSocket?.lastReceivedMessage,
        expectedErrorMsg
      );
    });
    it('should reject a request missing the gameId', async () => {
      mastermindGame.codeMasterWebSocket?.send({
        action: 'sendProof',
      });
      await waitFor(15000);
      const expectedErrorMsg = 'Bad request!';
      expectError(
        mastermindGame.codeMasterWebSocket?.lastReceivedMessage,
        expectedErrorMsg
      );
    });
    afterAll(() => {
      mastermindGame.codeMasterWebSocket?.close();
    });
  });

  describe('Code Breaker Wins After 2 Attempts', () => {
    beforeAll(async () => {
      mastermindGame = new MastermindGame({
        codeMasterPrivateKeyBase58: mockGame.codeMaster,
        codeBreakerPrivateKeyBase58: mockGame.codeBreaker,
        attempts: mockGame.attempts,
        autoPlay: false,
      });
      await waitFor(15000);
    });

    describe('Code Master Create A Game', () => {
      it('should deploy and initialize the game on-chain and on the server', async () => {
        await mastermindGame.createGame();
        await waitFor(20000);

        expect(
          mastermindGame.codeMasterWebSocket?.lastReceivedMessage
        ).toMatchObject({
          zkProof: expect.anything(),
          timestamp: expect.anything(),
          game: {
            status: 'PENDING',
            codeMaster: mastermindGame.codeMasterKey.toPublicKey().toBase58(),
            _id: mastermindGame.gameId,
            turnCount: 1,
            refereePubKeyBase58: REFEREE.toBase58(),
            isRefereeVerified: true,
            lastProof:
              mastermindGame.codeMasterWebSocket?.lastReceivedMessage?.zkProof,
          },
        });
        const proof = await StepProgramProof.fromJSON(
          JSON.parse(
            mastermindGame.codeMasterWebSocket?.lastReceivedMessage?.zkProof
          )
        );
        const validProof = await verify(proof, stepProgramVerificationKey);
        expect(validProof).toBeTruthy();
      });
      it('should close the Code Master WebSocket connection gracefully', async () => {
        mastermindGame.codeMasterWebSocket?.close();
        await waitFor(15000);
      });
      it('should allow the Code Master to rejoin the game and receive the current game state', async () => {
        mastermindGame.joinGame(PlayerRole.CODE_MASTER);
        await waitFor(15000);
        expect(
          mastermindGame.codeMasterWebSocket?.lastReceivedMessage
        ).toMatchObject({
          zkProof: expect.anything(),
          timestamp: expect.anything(),
          game: {
            status: 'PENDING',
            codeMaster: mastermindGame.codeMasterKey.toPublicKey().toBase58(),
            _id: mastermindGame.gameId,
            turnCount: 1,
            refereePubKeyBase58: REFEREE.toBase58(),
            isRefereeVerified: true,
            lastProof:
              mastermindGame.codeMasterWebSocket?.lastReceivedMessage?.zkProof,
          },
        });
        const proof = await StepProgramProof.fromJSON(
          JSON.parse(
            mastermindGame.codeMasterWebSocket?.lastReceivedMessage?.zkProof
          )
        );
        const validProof = await verify(proof, stepProgramVerificationKey);
        expect(validProof).toBeTruthy();
      });
    });
    describe('Invalid Actions After Game Creation', () => {
      it('should reject re-creating a game', async () => {
        mastermindGame.codeMasterWebSocket?.send({
          action: 'sendProof',
          gameId: mastermindGame.gameId,
          zkProof: JSON.stringify(mastermindGame.lastReceivedProof),
          rewardAmount: 1e10,
          refereePubKeyBase58: REFEREE.toBase58(),
          playerPubKeyBase58: mastermindGame.codeMasterKey
            .toPublicKey()
            .toBase58(),
        });
        await waitFor(15000);
        const expectedErrorMsg = 'Not allowed to send a proof!';
        expectError(
          mastermindGame.codeMasterWebSocket?.lastReceivedMessage,
          expectedErrorMsg
        );
      });
      it('should reject starting the game before it is accepted by the code breaker', async () => {
        mastermindGame.joinGame(PlayerRole.CODE_BREAKER);
        await waitFor(15000);
        mastermindGame.startGame();
        await waitFor(15000);
        const expectedErrorMsg = 'Game has not been accepted!';
        expectError(
          mastermindGame.codeBreakerWebSocket?.lastReceivedMessage,
          expectedErrorMsg
        );
      });
      it('should reject penalization request before the game is accepted', async () => {
        mastermindGame.codeMasterWebSocket?.send({
          action: 'penalize',
          gameId: mastermindGame.gameId,
        });
        await waitFor(15000);
        const expectedErrorMsg = 'Player did not exceeded the allowed time!';
        expectError(
          mastermindGame.codeMasterWebSocket?.lastReceivedMessage,
          expectedErrorMsg
        );
      });
    });
    describe('Code Breaker Accepts and Starts the Game', () => {
      it('should allow the Code Breaker to accept the game', async () => {
        await mastermindGame.acceptGame();
      });
      it('should reject the first guess if the game has not started yet', async () => {
        await mastermindGame.makeGuess();
        await waitFor(15000);
        const expectedErrorMsg = 'Not allowed to send a proof!';
        expectError(
          mastermindGame.codeBreakerWebSocket?.lastReceivedMessage,
          expectedErrorMsg
        );
      });
      it('should allow the Code Master to start the game after acceptance', async () => {
        mastermindGame.startGame();
        await waitFor(15000);
        expect(
          mastermindGame.codeMasterWebSocket?.lastReceivedMessage
        ).toMatchObject({
          game: {
            _id: mastermindGame.gameId,
            status: 'IN_PROGRESS',
            codeBreaker: mastermindGame.codeBreakerKey.toPublicKey().toBase58(),
            turnCount: 1,
            refereePubKeyBase58: REFEREE.toBase58(),
            isRefereeVerified: true,
          },
        });
      });
      describe('Reject some actions after Starting A Game', () => {
        it('Reject Cancel A Game After Start', async () => {
          const signature = Signature.create(mastermindGame.codeMasterKey, [
            Poseidon.hash(
              PublicKey.fromBase58(mastermindGame.gameId).toFields()
            ),
          ]).toBase58();
          const res = await fetch(
            `${SERVER_URL}/games/cancel/${mastermindGame.gameId}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ signedData: { signature } }),
            }
          );
          expect(res?.status).toBe(403);
        });
        it('Reject Re-start A Game', async () => {
          mastermindGame.codeMasterWebSocket?.send({
            action: 'startGame',
            gameId: mastermindGame.gameId,
          });
          await waitFor(15000);
          const expectedErrorMsg = 'Game has already started!';
          expectError(
            mastermindGame.codeMasterWebSocket?.lastReceivedMessage,
            expectedErrorMsg
          );
        });
      });
    });
    describe('Players Engage in Gameplay - Exchanging Clues and Guesses', () => {
      it('should increment turn count after an invalid guess', async () => {
        await mastermindGame.makeGuess();
        await waitFor(15000);
        expect(
          Number(
            mastermindGame.lastReceivedProof?.publicOutput.turnCount?.value
          )
        ).toEqual(2);
      });
      it('should reject a reused or invalid base proof', async () => {
        const fakeZkAppKey = PrivateKey.random();
        const fakeGameId = fakeZkAppKey.toPublicKey().toBase58();
        const client = new WebSocketService(
          fakeGameId,
          PlayerRole.CODE_MASTER,
          WEB_SOCKET_URL
        );
        await waitFor(15000);
        client?.send({
          action: 'sendProof',
          gameId: fakeGameId,
          zkProof: JSON.stringify(mastermindGame.lastReceivedProof),
        });
        await waitFor(15000);
        const expectedErrorMsg = 'Proof is outdated!';
        expectError(client?.lastReceivedMessage, expectedErrorMsg);
        client?.close();
      });
      it('should allow the Code Master to give a clue and increment the turn count', async () => {
        await mastermindGame.giveClue();
        await waitFor(15000);
        expect(
          Number(
            mastermindGame.lastReceivedProof?.publicOutput.turnCount?.value
          )
        ).toEqual(3);
        expect(
          mastermindGame.codeMasterWebSocket?.lastReceivedMessage?.game?.status
        ).toEqual('IN_PROGRESS');
      });
      it('should reject sending the same proof again', async () => {
        mastermindGame.codeMasterWebSocket?.send({
          action: 'sendProof',
          gameId: mastermindGame.gameId,
          zkProof: JSON.stringify(mastermindGame.lastReceivedProof),
        });
        await waitFor(15000);
        const expectedErrorMsg = 'Proof is outdated!';
        expectError(
          mastermindGame.codeMasterWebSocket?.lastReceivedMessage,
          expectedErrorMsg
        );
      });
      it('should increment turn count after a valid guess', async () => {
        await mastermindGame.makeGuess(true);
        await waitFor(15000);
        expect(
          Number(
            mastermindGame.lastReceivedProof?.publicOutput.turnCount?.value
          )
        ).toEqual(4);
      });
      it('should reject penalization if turn duration has not been exceeded', async () => {
        mastermindGame.codeMasterWebSocket?.send({
          action: 'penalize',
          gameId: mastermindGame.gameId,
        });
        await waitFor(15000);
        const expectedErrorMsg = 'Player did not exceeded the allowed time!';
        expectError(
          mastermindGame.codeMasterWebSocket?.lastReceivedMessage,
          expectedErrorMsg
        );
      });
      it('should mark the game as solved after a correct clue is given', async () => {
        await mastermindGame.giveClue();
        await waitFor(15000);
        expect(
          mastermindGame.codeMasterWebSocket?.lastReceivedMessage
        ).toMatchObject({
          game: {
            _id: mastermindGame.gameId,
            status: 'ENDED',
            turnCount: 5,
            winnerPublicKeyBase58: mastermindGame.codeBreakerKey
              .toPublicKey()
              .toBase58(),
          },
        });
      });
      it('should reject penalization requests after the game is solved', async () => {
        mastermindGame.codeMasterWebSocket?.send({
          action: 'penalize',
          gameId: mastermindGame.gameId,
        });
        await waitFor(15000);
        const expectedErrorMsg = 'Player did not exceeded the allowed time!';
        expectError(
          mastermindGame.codeMasterWebSocket?.lastReceivedMessage,
          expectedErrorMsg
        );
      });
    });
    afterAll(() => {
      mastermindGame.codeBreakerWebSocket?.close();
      mastermindGame.codeMasterWebSocket?.close();
    });
  });

  describe('Code Breaker punished for timeout', () => {
    beforeAll(async () => {
      mastermindGame = new MastermindGame({
        codeMasterPrivateKeyBase58: mockGame.codeMaster,
        codeBreakerPrivateKeyBase58: mockGame.codeBreaker,
        attempts: mockGame.attempts,
        autoPlay: false,
      });
      await mastermindGame.createGame();
      await waitFor(15000);
    });
    describe('Fool the Server with Invalid Cancel Attempts', () => {
      it('should reject cancel request with invalid signature', async () => {
        const signature = Signature.create(PrivateKey.random(), [
          Poseidon.hash(PublicKey.fromBase58(mastermindGame.gameId).toFields()),
        ]).toBase58();
        const res = await fetch(
          `${SERVER_URL}/games/cancel/${mastermindGame.gameId}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ signedData: { signature } }),
          }
        );
        expect(res?.status).toBe(401);
      });
      it('should cancel the game on server without sending on-chain transaction', async () => {
        const signature = Signature.create(mastermindGame.codeMasterKey, [
          Poseidon.hash(PublicKey.fromBase58(mastermindGame.gameId).toFields()),
        ]).toBase58();
        const res = await fetch(
          `${SERVER_URL}/games/cancel/${mastermindGame.gameId}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ signedData: { signature } }),
          }
        );
        expect(res?.status).toBe(200);
        const data = await res.json();
        expect(data?.game?.status).toBe('CANCELLED');
      });
    });
    describe('Penalize Code Breaker for Sending Late Guess', () => {
      it('should start the game even if it is marked as cancelled on server', async () => {
        await mastermindGame.acceptGame();
        mastermindGame.startGame();
        await waitFor(15000);
        expect(
          mastermindGame.codeMasterWebSocket?.lastReceivedMessage
        ).toMatchObject({
          game: {
            _id: mastermindGame.gameId,
            status: 'IN_PROGRESS',
            codeBreaker: mastermindGame.codeBreakerKey.toPublicKey().toBase58(),
            turnCount: 1,
          },
        });
      });
      it('should penalize Code Breaker for late guess', async () => {
        await waitFor(150000);
        await mastermindGame.makeGuess();
        await waitFor(15000);
        expect(
          mastermindGame.codeMasterWebSocket?.lastReceivedMessage
        ).toMatchObject({
          game: {
            _id: mastermindGame.gameId,
            status: 'PENALIZED',
            turnCount: 1,
            winnerPublicKeyBase58: mastermindGame.codeMasterKey
              .toPublicKey()
              .toBase58(),
          },
        });
      });
      it('should reject penalization request after game already penalized', async () => {
        mastermindGame.codeBreakerWebSocket?.send({
          action: 'penalize',
          gameId: mastermindGame.gameId,
        });
        await waitFor(15000);
        const expectedErrorMsg = 'Player is already penalized!';
        expectError(
          mastermindGame.codeBreakerWebSocket?.lastReceivedMessage,
          expectedErrorMsg
        );
      });
    });
    describe('Reject Actions After Game Penalization', () => {
      it('should reject sending guess after penalization', async () => {
        await mastermindGame.makeGuess();
        await waitFor(15000);
        const expectedErrorMsg = 'Not allowed to send a proof!';
        expectError(
          mastermindGame.codeBreakerWebSocket?.lastReceivedMessage,
          expectedErrorMsg
        );
      });
      it('should reject restarting the game after penalization', async () => {
        mastermindGame.startGame();
        await waitFor(15000);
        const expectedErrorMsg = 'Game has already started!';
        expectError(
          mastermindGame.codeBreakerWebSocket?.lastReceivedMessage,
          expectedErrorMsg
        );
      });
    });
    afterAll(() => {
      mastermindGame.codeBreakerWebSocket?.close();
      mastermindGame.codeMasterWebSocket?.close();
    });
  });
  describe('Code Master Successfully Cancels a Game', () => {
    beforeAll(async () => {
      mastermindGame = new MastermindGame({
        codeMasterPrivateKeyBase58: mockGame.codeMaster,
        codeBreakerPrivateKeyBase58: mockGame.codeBreaker,
        attempts: mockGame.attempts,
        autoPlay: false,
      });
      await mastermindGame.createGame();
      await waitFor(15000);
    });
    it('should allow code master to cancel the game', async () => {
      await mastermindGame.cancelGame();
    });
    describe('Reject Actions After Game Cancellation', () => {
      it('should reject sending a proof after game is cancelled', async () => {
        mastermindGame.joinGame(PlayerRole.CODE_BREAKER);
        await mastermindGame.makeGuess();
        await waitFor(15000);
        const expectedErrorMsg = 'Not allowed to send a proof!';
        expectError(
          mastermindGame.codeBreakerWebSocket?.lastReceivedMessage,
          expectedErrorMsg
        );
      });
      it('should reject starting a cancelled game', async () => {
        mastermindGame.startGame();
        await waitFor(15000);
        const expectedErrorMsg = 'Game has not been accepted!';
        expectError(
          mastermindGame.codeBreakerWebSocket?.lastReceivedMessage,
          expectedErrorMsg
        );
      });
    });
    afterAll(() => {
      mastermindGame.codeBreakerWebSocket?.close();
      mastermindGame.codeMasterWebSocket?.close();
    });
  });
});
