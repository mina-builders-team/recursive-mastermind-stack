<template>
  <div>
    <div v-if="isGameCancelled">Code master has cancelled this game!</div>
    <div class="d-flex flex-column gap-4 align-items-start w-100" v-else>
      <div class="d-flex align-items-center gap-2">
        Game ID : {{ formatAddress(zkAppAddress as string) }}
        <CopyToClipBoard :text="zkAppAddress || ''" />
      </div>
      <div>Reward Amount : {{ zkAppStates.rewardAmount / 1e9 }} MINA</div>
      <div>
        Last Join Attempt : {{ dateToDayHourMin(game?.lastAcceptTimestamp) }}
      </div>
      <div>
        Last Cancel Attempt : {{ dateToDayHourMin(game?.lastCancelTimestamp) }}
      </div>
      <div
        v-if="game?.status === 'CANCELLED' && game?.cancelTransactionHash"
        class="d-flex align-items-center gap-2"
      >
        Last Cancel Transaction Hash :
        {{ formatAddress(game?.cancelTransactionHash) }}
        <CopyToClipBoard :text="game?.cancelTransactionHash" />
      </div>
      <div
        v-if="userRole === 'CODE_MASTER'"
        class="d-flex flex-column align-content-start gap-4"
      >
        <div v-if="game?.cancelTransactionHash">
          Please check this
          <a
            :href="`https://minascan.io/devnet/tx/${game?.cancelTransactionHash}?type=zk-tx`"
            target="_blank"
            rel="noopener noreferrer"
          >
            transaction</a
          >

          before cancelling the game again.
        </div>
        <div
          v-if="!isCancelGameTimeElapsed && game?.lastCancelTimestamp"
          class="d-flex align-items-end gap-2"
        >
          Game should be cancelled anytime before
          <Timer
            :duration="MINA_APPROX_SLOT_DURATION"
            :startTimestamp="game.lastCancelTimestamp"
            :showIcon="false"
            @timeEnded="handleCancelTimeElapsed"
          />
        </div>
        <div v-else class="d-flex flex-column align-content-start gap-4">
          <div class="d-flex align-items-end gap-2">
            Waiting for code breaker to accept the game
            <DotsLoader />
          </div>
          <el-button
            :disabled="loading"
            :loading="loading"
            color="#9d2c2c"
            size="large"
            type="primary"
            class="me-3"
            @click="handleCancelGame(game?._id!)"
            >Cancel Game</el-button
          >
        </div>
      </div>
      <div v-else class="w-100">
        <div
          v-if="acceptedGame?.transactionHash"
          class="d-flex flex-column gap-4 w-100"
        >
          <div class="d-flex align-items-center gap-2">
            Last Accept Game Transaction Hash :
            {{ formatAddress(acceptedGame?.transactionHash) }}
            <CopyToClipBoard :text="acceptedGame?.transactionHash" />
          </div>
          <div>
            Please check this
            <a
              :href="`https://minascan.io/devnet/tx/${acceptedGame?.transactionHash}?type=zk-tx`"
              target="_blank"
              rel="noopener noreferrer"
            >
              transaction</a
            >

            before accepting the game again.
          </div>
        </div>
        <div v-if="isAcceptGameTimeElapsed || !acceptedGame?.timestamp">
          <el-button
            v-if="game?.status === 'ACTIVE'"
            size="large"
            color="#00ADB5"
            :disabled="loading"
            :loading="loading"
            type="primary"
            class="w-100 mt-4"
            @click="handleAcceptGame"
            >Accept game</el-button
          >
          <div v-else class="text-start">
            The game hasn't been verified by our server yet.<br />Please try
            rejoining in a minute.
          </div>
        </div>

        <div v-else class="d-flex flex-column align-content-start mt-4">
          <div class="d-flex align-items-end gap-2">
            Game should start anytime before
            <Timer
              :duration="MINA_APPROX_SLOT_DURATION"
              :startTimestamp="acceptedGame.timestamp"
              :showIcon="false"
              @timeEnded="handleAcceptTimeElapsed"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { useZkAppStore } from '@/store/zkAppModule';
import { storeToRefs } from 'pinia';
import { ElMessage } from 'element-plus';
import { formatAddress, dateToDayHourMin } from '@/utils';
import CopyToClipBoard from '@/components/shared/CopyToClipBoard.vue';
import { computed, onMounted, ref } from 'vue';
import { ElNotification } from 'element-plus';
import { useRoute } from 'vue-router';
import DotsLoader from '@/components/shared/DotsLoader.vue';
import Timer from './shared/Timer.vue';

const {
  zkAppStates,
  loading,
  error,
  zkAppAddress,
  userRole,
  currentTransactionLink,
  game,
} = storeToRefs(useZkAppStore());
const { acceptGame, cancelGame, getZkAppStates, getRole } = useZkAppStore();
const route = useRoute();
const MINA_APPROX_SLOT_DURATION = Number(import.meta.env.VITE_MINA_APPROX_SLOT_DURATION) 
let storedAcceptedGames = localStorage.getItem('acceptedGames')
  ? JSON.parse(localStorage.getItem('acceptedGames')!)
  : {};
const acceptedGame = ref(
  storedAcceptedGames[route?.params?.id as string] || null
);

const isAcceptGameTimeElapsed = ref(
  Date.now() - acceptedGame.value?.timestamp > MINA_APPROX_SLOT_DURATION 
);

const isCancelGameTimeElapsed = ref(
  game.value?.lastCancelTimestamp &&
    Date.now() - game.value?.lastCancelTimestamp > MINA_APPROX_SLOT_DURATION 
);
const isGameCancelled = computed(() => {
  return zkAppStates.value?.rewardAmount === 0;
});
const handleAcceptGame = async () => {
  await acceptGame();
  if (error.value) {
    ElMessage.error({ message: error.value, duration: 6000 });
  } else {
    acceptedGame.value = {
      transactionHash: currentTransactionLink.value,
      timestamp: Date.now(),
    };
    storedAcceptedGames = {
      ...storedAcceptedGames,
      [zkAppAddress.value as string]: { ...acceptedGame.value },
    };
    localStorage.setItem('acceptedGames', JSON.stringify(storedAcceptedGames));
    isAcceptGameTimeElapsed.value = false;
    ElNotification({
      title: 'Success',
      message: `Transaction Hash :  ${currentTransactionLink.value}`,
      type: 'success',
      duration: 5000,
    });
  }
};
const handleCancelGame = async (gameId: string) => {
  await cancelGame(gameId);
  if (error.value) {
    ElMessage.error({ message: error.value, duration: 6000 });
  } else {
    ElNotification({
      title: 'Success',
      message: `Transaction Hash :  ${currentTransactionLink.value}`,
      type: 'success',
      duration: 5000,
    });
    isCancelGameTimeElapsed.value = false;
  }
};
const handleAcceptTimeElapsed = async () => {
  await getZkAppStates();
  isAcceptGameTimeElapsed.value = true;
};
const handleCancelTimeElapsed = async () => {
  await getZkAppStates();
  isCancelGameTimeElapsed.value = true;
};
onMounted(async () => {
  await getRole();
});
</script>
