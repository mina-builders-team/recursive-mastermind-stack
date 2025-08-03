<template>
  <div class="d-flex justify-content-center w-100 h-100 mt-5 mb-4">
    <div class="board__container">
      <GameResult
        v-if="isGameEnded"
        :isWinner="isWinner"
        :userRole="userRole!"
        :codeBreakerPubKeyBase58="game?.codeBreaker || 'UNKNOWN'"
        :codeMasterPubKeyBase58="game?.codeMaster || 'UNKNOWN'"
        :gameReward="rewardAmount!"
        :isPenalized="isPenalized"
        :turnCount="
          isPlayingOnChain ? zkAppStates.turnCount : zkProofStates.turnCount
        "
      />

      <div class="bg-800 default-border pt-3 py-5 pe-2 ps-3 radius-20" v-else>
        <BoardHeader
          :rewardAmount="rewardAmount"
          :userRole="userRole!"
          :secret="gameSecret.secretCode"
          :isPlayingOnChain="isPlayingOnChain"
        />
        <BoardTimer
          :isCurrentUserTurn="isCurrentUserTurn"
          :isTurnTimeExceeded="isTurnTimeExceeded"
          :startTimestamp="timerStartTime"
          :duration="timerDuration"
          :isPlayingOnChain="isPlayingOnChain"
          :lastTurnTransactionHash="lastTurnTransactionHash"
          @timeEnded="handleTurnEnded"
        />
        <div class="mt-3 d-flex flex-column">
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
    <SubmitLastProofModal
      v-if="isPlayingOnChain && !isLastProofSubmitted && !isGameEnded"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import Guess from '@/components/gameplay/Guess.vue';
import { AvailableColor } from '@/types';
import { useZkAppStore } from '@/store/zkAppModule';
import { storeToRefs } from 'pinia';
import { MAX_ATTEMPTS, PER_TURN_GAME_DURATION } from '@/constants/config';

const {
  getRole,
  penalizePlayer,
  setLoading,
  setStepDisplay,
  fetchCurrentSlot,
  setTurnPlayed,
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
  isPlayingOnChain,
  currentSlot,
  lastTurnTransactionHash,
} = storeToRefs(useZkAppStore());
import { usePreloadedSound } from '@/composables/usePreloadedSound.ts';
import GameResult from './GameResult.vue';
import SubmitLastProofModal from '../modals/SubmitLastProofModal.vue';
import BoardHeader from '../shared/BoardHeader.vue';
import BoardTimer from './BoardTimer.vue';
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
const onChainTimerStartTimestamp = ref(Date.now());
const timerStartTime = computed(() => {
  return isPlayingOnChain.value
    ? onChainTimerStartTimestamp.value
    : game.value?.timestamp;
});

const timerDuration = computed(() => {
  return isPlayingOnChain.value
    ? 60 * 1000 * 3
    : isCurrentUserTurn.value
      ? 60 * 1000 * 2
      : 60 * 1000 * 2.5;
});
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
const handleSetColor = (secretCode: AvailableColor[], row: number) => {
  guesses.value[row] = [...secretCode];
};
const playOnChain = async () => {
  const handler = async () => {
    await fetchCurrentSlot();
    await getZkAppStates();
    remainingSlot.value =
      zkAppStates.value?.lastPlayedSlot +
      PER_TURN_GAME_DURATION -
      currentSlot.value!;
    if (remainingSlot.value < 2) {
      isTurnTimeExceeded.value = true;
    }
    if (remainingSlot.value < 0) {
      isTurnTimeExceeded.value = true;
      if (onChainInterval.value && zkAppStates.value.rewardAmount === 0) {
        clearInterval(onChainInterval.value);
      }
    }
  };
  await handler();
  if (!isLastProofSubmitted.value) {
    guesses.value = zkProofStates.value?.guessesHistory;
  }
  onChainInterval.value = setInterval(handler, 10 * 1000);
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
const rewardAmount = computed(() => {
  return game.value?.rewardAmount || zkAppStates.value?.rewardAmount;
});
const isPenalized = computed(() => {
  return isPlayingOnChain.value
    ? (isLastProofSubmitted.value && remainingSlot.value < 0) ||
        (currentSlot.value || 0) > zkAppStates.value?.finalizeSlot
    : game.value?.status === 'PENALIZED';
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
watch(
  () => zkAppStates.value?.turnCount,
  () => {
    if (isPlayingOnChain.value) {
      guesses.value = zkAppStates.value.guessesHistory;
      isTurnTimeExceeded.value = false;
      onChainTimerStartTimestamp.value = Date.now();
      setTurnPlayed(false);
      setLastTurnTransactionHash('');
      playSound();
    }
  }
);

watch(
  () => isPlayingOnChain.value,
  async () => {
    if (isPlayingOnChain.value) {
      await playOnChain();
      playSound();
    }
  }
);
onMounted(async () => {
  await getRole();
  setLoading(false);
  setStepDisplay('');
  if (isPlayingOnChain.value) {
    await playOnChain();
    getStoredTransactionsHash();
  }
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

.board__container {
  border-radius: 20px;
  width: 430px;
}
:deep(.el-popper) {
  width: 70% !important;
}

.critical {
  background: #ff375f4d;
  border: 1px solid #ff375f;
}
</style>
