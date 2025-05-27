<template>
  <div>
    <div v-if="isPlayingOnChain" class="mb-4 d-flex gap-2">
      <div v-if="!isLastProofSubmitted && !isGameEnded" class="w-100">
        <el-button
          type="primary"
          size="large"
          :loading="loading"
          @click="submitLastProof"
          class="multi-line-button w-100 confirm-btn fs-7 fw-500 py-3"
          >{{ stepDisplay ? stepDisplay : 'Submit last proof' }}</el-button
        >
        <div
          v-if="submitGameTransactionHash"
          class="transaction-notice d-flex flex-column align-items-start"
        >
          <span>Transaction sent.</span><br />
          <span class="d-flex gap-2 warning-text">
            <el-icon color="yellow"><WarnTriangleFilled /></el-icon>
            Avoid re-submitting unless this
            <a
              :href="`https://minascan.io/devnet/tx/${submitGameTransactionHash}?type=zk-tx`"
              target="_blank"
              rel="noopener noreferrer"
            >
              transaction
            </a>
            failed.
          </span>
        </div>
        <div
          v-else
          class="transaction-notice d-flex flex-column align-items-start"
        >
          <span class="d-flex gap-2 warning-text">
            <el-icon color="yellow" class="mt-1"
              ><WarnTriangleFilled
            /></el-icon>
            Connection to the server was lost. <br />Please submit your proof to
            continue playing on-chain.
          </span>
        </div>
      </div>
      <div v-if="isWinner" class="w-100">
        <el-button
          type="primary"
          size="large"
          @click="claimReward"
          :loading="loading"
          class="multi-line-button w-100 confirm-btn fs-7 fw-500 py-3"
          >{{ stepDisplay ? stepDisplay : 'Claim reward' }}</el-button
        >
        <div
          v-if="claimRewardTransactionHash"
          class="transaction-notice d-flex flex-column align-items-start"
        >
          <span>Transaction sent.</span><br />
          <span class="d-flex align-items-center gap-2 warning-text">
            <el-icon color="yellow"><WarnTriangleFilled /></el-icon>
            Avoid re-submitting unless this
            <a
              :href="`https://minascan.io/devnet/tx/${claimRewardTransactionHash}?type=zk-tx`"
              target="_blank"
              rel="noopener noreferrer"
            >
              transaction
            </a>
            failed.
          </span>
        </div>
      </div>
    </div>
    <div class="d-flex justify-content-between">
      <div v-for="el in cluesColors" :key="el.color">
        <RoundedColor
          :bgColor="el.color"
          :value="el.value"
          :title="el.title"
          width="24px"
          height="24px"
          :showValue="false"
        />
      </div>
    </div>
    <div
      class="gameplay__container d-flex flex-column align-items-center w-100 h-100 mt-2 mb-4"
    >
      <div class="w-100 d-flex justify-content-start w-100">
        <div class="d-flex flex-start gap-2 py-3">
          Game: {{ formatAddress(zkAppAddress as string) }}
          <CopyToClipBoard :text="zkAppAddress || ''" />
        </div>
      </div>
      <div class="w-100">
        <template v-if="isGameEnded">
          <div class="w-100 d-flex align-items-center justify-content-between">
            <div
              class="mb-4 w-100 d-flex justify-content-between align-items-center"
            >
              <div>
                <span v-if="!isCodeMasterWinner">Code breaker has won!</span>
                <span v-else>Code master has won!</span>
              </div>
              <div v-if="isWinner && !isPlayingOnChain">
                <div
                  class="ms-1 d-flex align-items-end gap-2"
                  v-if="!lastTransactionLink"
                >
                  Generating transaction
                  <DotsLoader />
                </div>
                <div v-else>
                  <a
                    :href="`https://minascan.io/devnet/tx/${lastTransactionLink}?type=zk-tx`"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Transaction Hash
                  </a>
                </div>
              </div>
            </div>
          </div>
        </template>
        <div
          v-else-if="
            isPlayingOnChain && isLastProofSubmitted && currentTransactionLink
          "
          class="transaction-notice d-flex flex-column align-items-start"
        >
          <span>Transaction sent.</span><br />
          <span class="d-flex align-items-center gap-2 warning-text">
            <el-icon color="yellow"><WarnTriangleFilled /></el-icon>
            Avoid re-submitting unless this
            <a
              :href="`https://minascan.io/devnet/tx/${currentTransactionLink}?type=zk-tx`"
              target="_blank"
              rel="noopener noreferrer"
            >
              transaction
            </a>
            failed.
          </span>
        </div>
      </div>
      <div class="d-flex mt-1 w-100">
        <div class="board__container d-flex w-100">
          <div>
            <div
              class="d-flex align-items-center justify-content-between w-100 ms-3"
            >
              <div
                class="w-100 d-flex justify-content-between p-3 ps-0 gap-2 align-items-center"
                v-if="!isGameEnded && !isTurnTimeExceeded"
              >
                <span v-if="isCodeMasterTurn">Code Master Turn</span>
                <span v-else>Code Breaker Turn</span>
                <div class="pe-2" v-if="!isTurnPlayed || isPlayingOnChain">
                  <Timer
                    :duration="
                      isCurrentUserTurn ? 60 * 1000 * 2 : 60 * 1000 * 2.5
                    "
                    :remainingSlot="remainingSlot"
                    :isOnChain="isPlayingOnChain"
                    :startTimestamp="game?.timestamp"
                    @timeEnded="handleTurnEnded"
                  />
                </div>
              </div>
              <div
                v-else-if="
                  !isGameEnded && isTurnTimeExceeded && !isPlayingOnChain
                "
                class="d-flex align-items-end gap-2 my-3"
              >
                Proof must reach server in
                <Timer
                  :duration="60 * 1000 * 2.5"
                  :startTimestamp="game?.timestamp"
                  :notifyOnCritical="false"
                  :showIcon="false"
                />
                to avoid penalty!
              </div>
            </div>

            <div v-for="(guess, row) in guesses">
              <Guess
                :attemptNo="row"
                @setColor="handleSetColor($event, row)"
                :guess="guess"
                :clue="clues?.[row]"
                :show-btn="
                  !(
                    isGameEnded ||
                    (isPlayingOnChain &&
                      zkAppStates?.turnCount < zkProofStates?.turnCount)
                  )
                "
              />
            </div>
          </div>
        </div>
      </div>
      <div
        class="color-picker__container d-flex justify-content-between w-100 gap-2 p-2 mt-4"
      >
        <RoundedColor
          height="40px"
          width="40px"
          v-for="el in availableColors"
          :bg-color="el.color"
          :value="el.value"
        />
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
  setCurrentTransactionHash,
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
  currentSlot,
  stepDisplay,
  loading,
  error,
  submitGameTransactionHash,
  claimRewardTransactionHash,
} = storeToRefs(useZkAppStore());
const remainingSlot = ref<number>(2);
const onChainInterval = ref<null | number>(null);

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
const claimReward = async () => {
  await claimRewardTransaction();
  if (error.value) {
    ElMessage.error({ message: error.value, duration: 6000 });
  } else {
    ElNotification({
      title: 'Success',
      message: `Transaction Hash : ${currentTransactionLink.value}`,
      type: 'success',
      duration: 5000,
    });
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
        remainingSlot.value < 0
    : isGameSolved.value ||
        zkProofStates?.value?.turnCount > MAX_ATTEMPTS * 2 ||
        game.value?.status === 'PENALIZED';
});
const lastTransactionLink = computed(() => {
  return isPlayingOnChain.value
    ? currentTransactionLink.value
    : game.value?.penalizationTransactionHash ||
        game.value?.settlementTransactionHash;
});
const isLastProofSubmitted = computed(() => {
  return zkAppStates.value?.turnCount >= zkProofStates?.value?.turnCount;
});
const playOnChain = async () => {
  const handler = async () => {
    await fetchCurrentSlot();
    await getZkAppStates();
    remainingSlot.value =
      zkAppStates.value?.lastPlayedSlot + PER_TURN_GAME_DURATION - currentSlot.value!;
    if (remainingSlot.value < 0) {
      isTurnTimeExceeded.value = true;
      if (onChainInterval.value) {
        clearInterval(onChainInterval.value);
      }
    }
  };
  await handler();
  if (!isLastProofSubmitted.value) {
    guesses.value = zkProofStates.value?.guessesHistory;
  }
  onChainInterval.value = setInterval(handler, 5000);
  console.log('  zkProofStates.value ', zkProofStates.value);
  console.log('  zkAppStates.value ', zkAppStates.value);
  console.log('  guesses.value guesses.value ', guesses.value);
};
const submitLastProof = async () => {
  const game: any = getStoredGame(zkAppAddress.value as string);
  const proof = game?.lastProof;
  if (proof) {
    await submitGameProof(proof);
    if (error.value) {
      ElMessage.error({ message: error.value, duration: 6000 });
    } else {
      ElNotification({
        title: 'Success',
        message: `Transaction Hash : ${currentTransactionLink.value}`,
        type: 'success',
        duration: 5000,
      });
    }
  } else {
    ElMessage.error({ message: 'Proof is not available!', duration: 6000 });
  }
};
watch(
  () => zkProofStates.value?.turnCount,
  () => {
    if (!isPlayingOnChain.value) {
      guesses.value = zkProofStates.value.guessesHistory;
      isTurnTimeExceeded.value = false;
    }
  }
);
watch(
  () => zkAppStates.value?.turnCount,
  () => {
    if (isPlayingOnChain.value) {
      guesses.value = zkAppStates.value.guessesHistory;
      isTurnTimeExceeded.value = false;
      setTurnPlayed(false);
      setCurrentTransactionHash(null);
    }
  }
);
watch(
  () => isPlayingOnChain.value,
  async () => {
    if (isPlayingOnChain.value) {
      await playOnChain();
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
});
onUnmounted(() => {
  if (onChainInterval.value) {
    clearInterval(onChainInterval.value);
  }
});
</script>
<style scoped>
.board__container {
  border-radius: 10px;
  box-shadow: 0 0 10px #00ffcc55;
}
.color-picker__container {
  border-radius: 10px;
  box-shadow: 0 0 10px #00ffcc55;
  min-width: 467px;
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
</style>
