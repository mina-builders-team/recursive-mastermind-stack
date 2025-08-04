<template>
  <div class="color-snow-white d-flex flex-column gap-2">
    <div class="d-flex justify-content-between align-items-center">
      <div>
        <div class="mb-2">Game Room Name</div>
        <div>🪶 {{ game?.roomName }}</div>
      </div>
      <div
        class="radius-10 bg-alpha-20-300-20 p-10 color-snow-white default-border d-flex align-items-center gap-1"
      >
        <inline-svg src="/icons/cash.svg"></inline-svg>
        {{ (rewardAmount || 0) / 1e9 }} Mina
      </div>
    </div>
    <div
      class="c-idle p-5-10 default-border radius-10 color-snow-white d-flex flex-column align-items-center"
    >
      <div class="d-flex gap-2 align-items-end">
        {{ gameStatus.text }} <DotsLoader />
      </div>
      <div
        v-if="gameStatus.waitTime"
        class="c-idle p-5-10 default-border radius-10 color-snow-white d-flex align-items-center justify-content-center mt-2 gap-3 fit-content"
      >
        <div v-if="!zkAppStates || cancelGameTxHash" class="link">
          <a
            class="link d-flex gap-1 align-items-center"
            :href="`https://minascan.io/devnet/tx/${cancelGameTxHash || game?.gameCreationTransactionHash}?type=zk-tx`"
            target="_blank"
            rel="noopener noreferrer"
          >
            Tx Hash:
            {{
              formatAddress(
                cancelGameTxHash || game?.gameCreationTransactionHash || ''
              )
            }}
          </a>
        </div>
        <div>Estimated Time:</div>
        <Timer
          :key="timerKey"
          :duration="gameStatus.waitTime"
          :startTimestamp="timerStartTime"
          @timeEnded="resetTimer"
        />
      </div>
    </div>
    <div class="w-100">
      <div class="default-border my-2"></div>
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
🎯 https://www.minamastermind.com/${game?._id}

 `"
            hashtag="MinaProtocol ,zkApps ,Web3Gaming ,ZeroKnowledge ,MastermindGame"
            class="radius-10 bg-snow-white color-900 flex-1"
          />
        </div>
        <div class="w-100" v-if="timeEnded && zkAppStates">
          <Button
            :loading="loading"
            :class="[
              'bg-red radius-10 cancel-btn default-border me-2 w-100',
              { 'px-2': loading, 'px-4': !loading },
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
            text: 'Verifying Game On Server',
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
    cancelGameTransactionHash.value ||
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
