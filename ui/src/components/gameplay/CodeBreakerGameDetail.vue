<template>
  <div class="d-flex flex-column gap-4 color-snow-white">
    <div class="d-flex gap-5">
      <div class="flex-1">
        <div>Game:</div>
        <div
          class="p-10 bg-alpha-8-300-8 blend-plus-lighter default-border radius-12 d-flex align-items-center justify-content-center mt-2"
        >
          {{ game?.roomName }}
        </div>
      </div>
      <div class="flex-1">
        <div>Reward Amount</div>
        <div
          class="d-flex align-items-center gap-2 default-border radius-10 p-10 mt-2 fit-content"
        >
          <inline-svg src="/icons/cash.svg"></inline-svg>
          {{ (rewardAmount || 0) / 1e9 }} MINA
        </div>
      </div>
    </div>
    <div>Note: An additional 2 MINA will be charged for referee fees.</div>
    <div
      v-if="!compiled"
      class="d-flex justify-content-center align-items-end gap-2 blend-screen bg-alpha-20-300-20 radius-10 p-10 fs-12 fw-600"
    >
      Compiling <DotsLoader />
    </div>
    <div
      class="d-flex justify-content-center align-items-end gap-2 blend-screen bg-alpha-20-300-20 radius-10 p-10 fs-12 fw-600"
      v-else-if="!zkAppStates"
    >
      Setting Up Game <DotsLoader />
    </div>
    <div v-else>
      <div class="blend-screen bg-alpha-20-300-20 radius-10 p-10 fs-12 fw-600">
        <div class="d-flex justify-content-between mb-2">
          <div>Last Join Attempt:</div>
          <div class="gray fw-400 fs-12">
            <span
              v-if="
                !game?.lastJoinAttemptBy &&
                !acceptedGame?.lastAcceptTransactionHash
              "
              >-</span
            >
            <span
              v-else-if="
                game?.lastJoinAttemptBy === publicKeyBase58 ||
                (!game?.lastJoinAttemptBy &&
                  acceptedGame?.lastAcceptTransactionHash)
              "
              >(You)</span
            >
            <span v-else>{{
              formatAddress(game?.lastJoinAttemptBy || '')
            }}</span>
          </div>
        </div>
        <div class="d-flex justify-content-between mb-2">
          <div>Last Cancel Attempt:</div>
          <div class="gray fw-400 fs-12">
            <span v-if="game?.lastCancelTimestamp">{{
              dayjs(game.lastCancelTimestamp).fromNow()
            }}</span>
            <span v-else>-</span>
          </div>
        </div>
        <div v-if="acceptedGame?.lastAcceptTransactionHash">
          <div class="d-flex justify-content-between mb-2">
            <span> Last Accept Game Transaction Hash: </span>
            <span class="gray fw-400 fs-12">{{
              formatAddress(acceptedGame?.lastAcceptTransactionHash)
            }}</span>
          </div>
          <div class="d-flex justify-content-between mb-2">
            <span>
              Make sure that Tx has failed before making new join attempts:
            </span>
            <a
              class="link d-flex gap-1 align-items-center"
              :href="`https://minascan.io/${MINA_NETWORK}/tx/${acceptedGame?.lastAcceptTransactionHash}?type=zk-tx`"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button class="default-border radius-10 bg-alpha-8-300-8">
                <span class="color-gray me-2">{{
                  formatAddress(acceptedGame?.lastAcceptTransactionHash)
                }}</span>
                <span class="color-snow-white">Check</span>
              </Button>
            </a>
          </div>
        </div>
      </div>
      <div
        class="d-flex flex-column align-items-center gap-2"
        v-if="
          acceptedGame?.lastAcceptTransactionHash && !isAcceptGameTimeElapsed
        "
      >
        <div class="mt-3 w-100 d-flex justify-content-center fs-12">
          Game should start anytime before:
        </div>
        <Timer
          :key="timerKey"
          :duration="MINA_APPROX_SLOT_DURATION"
          :startTimestamp="timerStartTime"
          @timeEnded="timerEnded"
        />
      </div>
    </div>

    <div class="d-flex justify-content-between join-modal-footer">
      <Button
        size="large"
        class="btn-cta3 default-border color-snow-white fw-400 bg-alpha-50-900-50 blend-darken back-btn"
        @click="handleClose"
        >Back</Button
      >
      <Button
        :loading="loading"
        :disabled="acceptedGame?.lastAcceptTransactionHash && !isAcceptGameTimeElapsed"
        v-if="isGameReady"
        size="large"
        class="fw-400 color-black bg-snow-white search-btn"
        @click="handleAcceptGame"
        >Play Game</Button
      >
    </div>
  </div>
</template>
<script lang="ts" setup>
import { useZkAppStore } from '@/store/zkAppModule';
import { storeToRefs } from 'pinia';
import { ElMessage } from 'element-plus';
import { formatAddress, updateLocalStorageGames } from '@/utils';
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Button from '@/components/shared/Button.vue';
import Timer from '@/components/shared/Timer.vue';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import DotsLoader from '../shared/DotsLoader.vue';
dayjs.extend(relativeTime);

const MINA_NETWORK = import.meta.env.VITE_MINA_NETWORK;
const {
  publicKeyBase58,
  error,
  zkAppAddress,
  currentTransactionLink,
  game,
  compiled,
  zkAppStates,
  loading,
  isPlayingOnChain,
} = storeToRefs(useZkAppStore());
const { acceptGame, getZkAppStates } = useZkAppStore();
const route = useRoute();
const router = useRouter();

const MINA_APPROX_SLOT_DURATION = Number(
  import.meta.env.VITE_MINA_APPROX_SLOT_DURATION
);
let storedAcceptedGames = localStorage.getItem('games')
  ? JSON.parse(localStorage.getItem('games')!)
  : {};
const acceptedGame = ref(
  storedAcceptedGames?.[route?.params?.id as string] || null
);

const isAcceptGameTimeElapsed = ref(
  Date.now() - acceptedGame.value?.lastAcceptTimestamp >
    MINA_APPROX_SLOT_DURATION
);
const timerKey = ref(0);
const timerStartTime = ref(
  acceptedGame.value?.lastAcceptTimestamp || Date.now()
);
const resetTimer = () => {
  timerKey.value += 1;
  timerStartTime.value = Date.now();
};
const timerEnded = async () => {
  await getZkAppStates();
  isAcceptGameTimeElapsed.value = true;
};
const handleClose = () => {
  router.push({
    name: 'lobby',
  });
};
const handleAcceptGame = async () => {
  await acceptGame();
  if (error.value) {
    ElMessage.error({ message: error.value, duration: 6000 });
  } else {
    acceptedGame.value = {
      lastAcceptTransactionHash: currentTransactionLink.value,
      lastAcceptTimestamp: Date.now(),
    };
    updateLocalStorageGames(zkAppAddress.value as string, {
      ...acceptedGame.value,
    });
    isAcceptGameTimeElapsed.value = false;
    resetTimer();
  }
};
const isGameReady = computed(() => {
  return compiled.value && zkAppStates.value;
});
const rewardAmount = computed(() => {
  return isPlayingOnChain.value
    ? zkAppStates.value?.rewardAmount
    : game.value?.rewardAmount;
});
</script>
<style scoped lang="scss">
.search-btn {
  border-radius: 10px;
  padding: 10px 30px;
}
.back-btn {
  border-radius: 10px;
  padding: 10px 30px;
  border: 1px solid #2c2f31;
}
</style>
