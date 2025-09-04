<template>
  <div class="color-snow-white d-flex flex-column gap-2">
    <div class="d-flex justify-content-between align-items-center">
      <div>
        <div class="mb-2 fw-600">Game Room Name</div>
        <div class="fs-20 fw-600">🪶 {{ game?.roomName }}</div>
      </div>
      <div
        class="radius-10 bg-alpha-20-300-20 p-10 color-snow-white default-border d-flex align-items-center gap-1"
      >
        <inline-svg src="/icons/cash.svg"></inline-svg>
        {{ (rewardAmount || 0) / 1e9 }} Mina
      </div>
    </div>
    <div
      class="p-5-10 default-border radius-10 color-snow-white bg-alpha-8-300-8 d-flex flex-column align-items-center blend-plus-lighter py-3"
    >
      <div class="d-flex gap-2 align-items-end fw-600 fs-16">
        {{ gameStatus.text }} <DotsLoader />
      </div>
      <div
        v-if="gameStatus.waitTime"
        class="bg-alpha-8-300-8 w-100 p-5-10 default-border radius-10 color-snow-white d-flex align-items-center justify-content-between mt-2 gap-3 fit-content"
      >
        <div v-if="!zkAppStates || cancelGameTxHash" class="link">
          <a
            class="link d-flex gap-1 align-items-center fs-16 fw-600"
            :href="`https://minascan.io/devnet/tx/${cancelGameTxHash || game?.gameCreationTransactionHash}?type=zk-tx`"
            target="_blank"
            rel="noopener noreferrer"
          >
            Check Tx:
            {{
              formatAddress(
                cancelGameTxHash || game?.gameCreationTransactionHash || ''
              )
            }}
          </a>
        </div>
        <div v-if="gameStatus.state === 'VERIFYING'" class="fs-16 fw-600">
          Verifying Game On Server
        </div>
        <div class="d-flex align-items-center gap-3">
          <div class="color-gray fs-12 fw-600">Estimated Time:</div>
          <Timer
            :key="timerKey"
            :duration="gameStatus.waitTime"
            :startTimestamp="timerStartTime"
            @timeEnded="resetTimer"
            transparent
            customClass="highlighted-container color-snow-white"
          />
        </div>
      </div>
      <div class="w-100 mt-3">
        <div class="d-flex justify-content-between gap-4 w-100">
          <div class="d-flex gap-4 flex-1" v-if="game?.status === 'ACTIVE'">
            <Button
              class="btn-cta3 border-alpha-50-300-50 color-snow-white flex-1"
              size="large"
              @click="returnToLobby"
            >
              Return to Lobby
            </Button>
            <CopyToClipBoard :text="game?._id || ''">
              <Button
                class="btn-cta3 border-alpha-50-300-50 color-snow-white flex-1"
                size="large"
              >
                <inline-svg class="me-2" src="/icons/share.svg"></inline-svg>
                <span>Invite your friend</span>
              </Button>
            </CopyToClipBoard>
            <ShareButton
              :message="`🧠 I just created a new Mastermind game on Web3, powered by zero-knowledge proofs & @MinaProtocol!
                          Think you can crack my code? 🕵️‍♂️
                          Join now as the Code Breaker 👇
                          🎯 https://www.minamastermind.com/${game?._id}`"
              hashtag="MinaProtocol ,zkApps ,Web3Gaming ,ZeroKnowledge ,MastermindGame"
              btnClass="radius-10 bg-snow-white color-900 flex-1"
            />
          </div>
          <div class="w-100" v-if="timeEnded && zkAppStates">
            <Button
              :loading="loading"
              :class="[
                'bg-red radius-10 default-border me-2 w-100 px-0 cancel-btn',
              ]"
              size="large"
              @click="cancelGameById(gameId)"
              ><span class="color-snow-white">
                <span v-if="cancelGameTxHash">Re-Cancel Game</span>
                <span v-else>Cancel Game</span>
              </span></Button
            >
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import Timer from '@/components/shared/Timer.vue';
import Button from '@/components/shared/Button.vue';
import { useZkAppStore } from '@/store/zkAppModule';
import { storeToRefs } from 'pinia';
import { formatAddress, getStoredGame } from '@/utils';
import { computed, ref, watch } from 'vue';
import DotsLoader from '@/components/shared/DotsLoader.vue';
import { useRoute, useRouter } from 'vue-router';
import ShareButton from '../shared/ShareButton.vue';
import CopyToClipBoard from '../shared/CopyToClipBoard.vue';
import { useCustomMessage } from '@/composables/useCustomMessage';

const {
  zkAppStates,
  game,
  compiled,
  isPlayingOnChain,
  loading,
  cancelGameTransactionHash,
  error,
} = storeToRefs(useZkAppStore());
const { showMessage } = useCustomMessage();
const { getGame, cancelGame } = useZkAppStore();
const route = useRoute();
const router = useRouter();
const gameId = route?.params?.id as string;
const timerKey = ref(0);
const attemptToCancel = ref(false);
const MINA_APPROX_SLOT_DURATION = Number(
  import.meta.env.VITE_MINA_APPROX_SLOT_DURATION
);
const gameStatus = computed(() =>
  !compiled.value
    ? { state: 'COMPILING', text: 'Compiling' }
    : !zkAppStates.value
      ? {
          state: 'DEPLOYING',
          text: 'Checking For Game Deployment',
          waitTime: MINA_APPROX_SLOT_DURATION,
        }
      : game.value?.status === 'PENDING'
        ? {
            state: 'VERIFYING',
            text: 'Checking For Game Deployment',
            waitTime: 60 * 1000,
          }
        : cancelGameTxHash.value
          ? {
              state: 'CANCELLED',
              text: 'Cancelling The Game',
              waitTime: MINA_APPROX_SLOT_DURATION,
            }
          : { state: 'WAITING', text: 'Waiting For Code Breaker' }
);
const rewardAmount = computed(() => {
  return isPlayingOnChain.value
    ? zkAppStates.value?.rewardAmount
    : game.value?.rewardAmount;
});
const cancelGameTxHash = computed(() => {
  return (
    (attemptToCancel.value && cancelGameTransactionHash.value) ||
    game.value?.cancelTransactionHash ||
    getStoredGame(gameId)?.cancelGameTransactionHash
  );
});
const timeEnded = ref(true);
const timerStartTime = ref(Date.now());
const resetTimer = async () => {
  timerStartTime.value = Date.now();
  timerKey.value += 1;
  await getGame(gameId);
  timeEnded.value = true;
};
const returnToLobby = () => {
  router.push({ name: 'lobby' });
};
const cancelGameById = async (gameId: string) => {
  await cancelGame(gameId);
  if (!error.value) {
    timerStartTime.value = Date.now();
    timeEnded.value = false;
    attemptToCancel.value = true;
    showMessage({
      title: 'Transaction Sent',
      description: 'Transaction Hash : ' + cancelGameTxHash.value,
      type: 'success',
      duration: 10000,
    });
  } else {
    showMessage({
      title: 'Error',
      description: error.value,
      type: 'error',
      duration: 10000,
    });
  }
};

watch(
  () => gameStatus.value.state,
  async () => {
    timerStartTime.value = Date.now();
    timerKey.value += 1;
    if (gameStatus.value.state === 'VERIFYING') {
      await getGame(gameId);
    }
  }
);
</script>
<style scoped lang="scss">
.cancel-btn {
  backdrop-filter: blur(10px);
}

.cancel-btn:hover {
  box-shadow: 0px 2px 30px 0px rgba(255, 255, 255, 0.4) inset;
}
:deep(.is-loading) {
  color:$snow-white;
}
</style>
