<template>
  <div class="d-flex justify-content-center w-100 h-100 mt-2 mb-4">
    <div class="board__container">
      <GameResult
        v-if="isGameEnded"
        :isWinner="isWinner"
        :userRole="userRole!"
        :codeBreakerPubKeyBase58="game?.codeBreaker || 'UNKNOWN'"
        :codeMasterPubKeyBase58="game?.codeMaster || 'UNKNOWN'"
        :gameReward="game?.rewardAmount!"
        :finalTransaction="lastTransactionLink"
      />
      <div class="bg-800 default-border pt-3 py-5 pe-2 ps-3" v-else>
        <div class="board-title mb-4">
          <div class="gray fs-14">Welcome</div>
          <span v-if="userRole === 'CODE_BREAKER'">Code Breaker</span>
          <span v-else-if="userRole === 'CODE_MASTER'">Code Master</span>
        </div>
        <div class="d-flex gap-5">
          <div
            class="game-reward d-flex align-items-center gap-2 fw-400 f-14 snow-white p-2 fit-content"
          >
            <inline-svg src="/icons/cash.svg"></inline-svg> 100 MINA
          </div>
          <div class="d-flex gap-2">
            <RoundedColor
              :editable="false"
              v-for="code in gameSecret.secretCode"
              :value="code.value"
            />
          </div>
        </div>

        <div v-if="!isGameEnded && !isTurnTimeExceeded">
          <div
            v-if="!isTurnPlayed && (!isPlayingOnChain || isLastProofSubmitted)"
          ></div>
        </div>

        <div
          class="c-idle mt-2 radius-10 p-2 d-flex flex-column gap-2 align-items-center snow-white"
        >
          <div>
            <span v-if="isCurrentUserTurn">
              Waiting for your next move in
            </span>
            <span v-else> Opponents Turn </span>
          </div>
          <Timer
            :duration="isCurrentUserTurn ? 60 * 1000 * 2 : 60 * 1000 * 2.5"
            :remainingSlot="remainingSlot"
            :isOnChain="isPlayingOnChain"
            :startTimestamp="game?.timestamp"
            :criticalOn="30000"
            @timeEnded="handleTurnEnded"
          />
        </div>
        <div class="mt-3 d-flex flex-column-reverse">
          <div v-for="(guess, row) in guesses">
            <Guess
              :attemptNo="row"
              @setColor="handleSetColor($event, row)"
              :guess="guess"
              :clue="clues?.[row]"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import Guess from '@/components/Guess.vue';
import RoundedColor from '@/components/RoundedColor.vue';
import { availableColors } from '@/constants/colors';
import { AvailableColor } from '@/types';
import { useZkAppStore } from '@/store/zkAppModule';
import { storeToRefs } from 'pinia';
import { formatAddress, getStoredGame } from '@/utils';
import CopyToClipBoard from '@/components/shared/CopyToClipBoard.vue';
import { cluesColors } from '@/constants/colors';
import DotsLoader from '@/components/shared/DotsLoader.vue';
import Timer from '@/components/shared/Timer.vue';
import { MAX_ATTEMPTS, PER_TURN_GAME_DURATION } from '@/constants/config';
import { ElMessage, ElNotification } from 'element-plus';

const {
  getRole,
  penalizePlayer,
  setLoading,
  setStepDisplay,
  fetchCurrentSlot,
  setTurnPlayed,
  submitGameProof,
  claimRewardTransaction,
  getZkAppStates,
  getStoredTransactionsHash,
  setLastTurnTransactionHash,
} = useZkAppStore();
const {
  zkAppAddress,
  zkProofStates,
  zkAppStates,
  publicKeyBase58,
  game,
  userRole,
  isTurnPlayed,
  isPlayingOnChain,
  currentTransactionLink,
  lastTurnTransactionHash,
  currentSlot,
  stepDisplay,
  loading,
  error,
  submitGameTransactionHash,
  claimRewardTransactionHash,
} = storeToRefs(useZkAppStore());
import { usePreloadedSound } from '@/composables/usePreloadedSound.ts';
import GameResult from './GameResult.vue';
const { playSound } = usePreloadedSound('/sounds/notification.mp3');

const remainingSlot = ref<number>(PER_TURN_GAME_DURATION);
const onChainInterval = ref<null | number>(null);
const initialSecret = () => {
  let storedGames = localStorage.getItem('games');
  if (storedGames) {
    const jsonGames = JSON.parse(storedGames);
    if (jsonGames?.[zkAppAddress?.value as string]?.secretCode) {
      return {
        secretCode: jsonGames[zkAppAddress.value as string].secretCode,
        randomSalt: jsonGames[zkAppAddress.value as string].randomSalt,
      };
    }
  }
  return {
    secretCode: Array.from({ length: 4 }, () => ({
      color: '#fff',
      value: '?',
    })),
    randomSalt: '',
  };
};
const gameSecret = ref(initialSecret());

const guesses = ref<Array<AvailableColor[]>>(
  zkProofStates.value?.guessesHistory || zkAppStates.value?.guessesHistory
);
const clues = computed<Array<AvailableColor[]>>(() =>
  !isLastProofSubmitted.value
    ? zkProofStates.value?.cluesHistory
    : zkAppStates.value?.cluesHistory
);
const isTurnTimeExceeded = ref(false);
const handleTurnEnded = () => {
  isTurnTimeExceeded.value = true;
  if (
    game.value?.status === 'IN_PROGRESS' &&
    !isCurrentUserTurn.value &&
    !isPlayingOnChain.value
  ) {
    penalizePlayer();
  }
};
const handleSetColor = (
  payload: { index: number; selectedColor: AvailableColor },
  row: number
) => {
  guesses.value[row][payload.index] = { ...payload.selectedColor };
};
const isCodeMasterTurn = computed(() => {
  return isPlayingOnChain.value
    ? zkAppStates.value?.turnCount % 2 === 0
    : zkProofStates.value?.turnCount % 2 === 0;
});
const isCurrentUserTurn = computed(() => {
  return (
    (isCodeMasterTurn.value && userRole.value === 'CODE_MASTER') ||
    (!isCodeMasterTurn.value && userRole.value === 'CODE_BREAKER')
  );
});
const isCodeMasterWinner = computed(() => {
  return isPlayingOnChain.value
    ? isGameEnded.value &&
        !isGameSolved.value &&
        zkAppStates?.value?.turnCount % 2 !== 0
    : game.value?.codeMaster === game.value?.winnerPublicKeyBase58;
});
const isGameSolved = computed(() => {
  return clues.value?.some((clue: AvailableColor[]) =>
    clue?.every((el: AvailableColor) => el.value === 2)
  );
});
const isWinner = computed(() => {
  return isPlayingOnChain.value
    ? isGameEnded.value &&
        ((userRole.value === 'CODE_MASTER' && isCodeMasterWinner.value) ||
          (userRole.value === 'CODE_BREAKER' && !isCodeMasterWinner.value))
    : isGameEnded.value &&
        publicKeyBase58.value === game.value?.winnerPublicKeyBase58;
});
const isGameEnded = computed(() => {
  return isPlayingOnChain.value
    ? isGameSolved.value ||
        zkAppStates?.value?.turnCount > MAX_ATTEMPTS * 2 ||
        (isLastProofSubmitted.value && remainingSlot.value < 0) ||
        (currentSlot.value || 0) > zkAppStates.value?.finalizeSlot
    : isGameSolved.value ||
        zkProofStates?.value?.turnCount > MAX_ATTEMPTS * 2 ||
        game.value?.status === 'PENALIZED';
});
const isLastProofSubmitted = computed(() => {
  return zkAppStates.value?.turnCount >= zkProofStates?.value?.turnCount;
});
const lastTransactionLink = computed(() => {
  return isPlayingOnChain.value
    ? currentTransactionLink.value
    : game.value?.penalizationTransactionHash ||
        game.value?.settlementTransactionHash;
});

watch(
  () => zkProofStates.value?.turnCount,
  () => {
    if (!isPlayingOnChain.value) {
      guesses.value = zkProofStates.value.guessesHistory;
      isTurnTimeExceeded.value = false;
      playSound();
    }
  }
);

onMounted(async () => {
  await getRole();
  setLoading(false);
  setStepDisplay('');
  if (!isGameEnded.value) {
    playSound();
  }
});
onUnmounted(() => {
  if (onChainInterval.value) {
    clearInterval(onChainInterval.value);
  }
});
</script>
<style scoped lang="scss">
@import '@/style';

.game-reward {
  @extend .c-disabled;
  border-radius: 10px;
  padding: 5px 10px;
}

.board__container {
  border-radius: 20px;
  width: 430px;
}
:deep(.el-popper) {
  width: 70% !important;
}

.claim-btn {
  background-color: #17b14d;
  color: white;
}
.timer-icon {
  color: rgb(229, 107, 107);
}
.penalize-btn {
  border-radius: 10px;
  background-color: #9d2c2c;
  color: #f7f9fc;
}
.confirm-btn {
  border-radius: 10px;
  background-color: #1b232e;
  color: #c5c6c8;
}
.multi-line-button {
  white-space: normal;
  text-align: center;
  word-wrap: break-word;
  padding: 15px;
  border-color: #00ffcc;
}
.transaction-notice {
  background: #313a41;
  padding: 20px;
  margin-top: 10px;
  border-radius: 10px;
}
.warning-text {
  font-size: 12px;
  text-align: start;
}
.board-title {
  font-weight: 400;
  font-size: 21px;
}
</style>
