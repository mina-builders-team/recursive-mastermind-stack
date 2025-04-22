<template>
  <div>
    <div v-if="isGameCancelled">Code master has cancelled this game!</div>
    <div class="d-flex flex-column gap-4 align-items-start w-100" v-else>
      <div class="d-flex align-items-center gap-2">
        Game ID : {{ formatAddress(zkAppAddress as string) }}
        <CopyToClipBoard :text="zkAppAddress as string" />
      </div>
      <div>Reward Amount : {{ zkAppStates.rewardAmount / 1e9 }} MINA</div>
      <div>
        Last Join Attempt : {{ dateToDayHourMin(game?.lastAcceptTimestamp) }}
      </div>
      <div>
        Last Cancel Attempt : {{ dateToDayHourMin(game?.lastCancelTimestamp) }}
      </div>
      <div v-if="game?.status === 'CANCELLED'" class="d-flex align-items-center gap-2">
        Last Cancel Transaction Hash :
        {{ formatAddress(game?.cancelTransactionHash) }}
        <CopyToClipBoard :text="game?.cancelTransactionHash" />
      </div>
      <div
        v-if="userRole === 'CODE_MASTER'"
        class="d-flex flex-column align-content-start gap-5"
      >
        <div class="d-flex align-items-end gap-2">
          Waiting for code breaker to accept the game
          <DotsLoader />
        </div>
        <el-button
          v-if="['ACTIVE', 'PENDING'].includes(game?.status)"
          :disabled="loading"
          :loading="loading"
          color="#9d2c2c"
          size="large"
          type="primary"
          class="me-3"
          @click="handleCancelGame(game?._id)"
          >Cancel Game</el-button
        >
      </div>
      <el-button
        v-else-if="!isLastAcceptedGame"
        size="large"
        color="#00ADB5"
        :disabled="loading"
        :loading="loading"
        type="primary"
        class="w-100"
        @click="handleAcceptGame"
        >Accept game</el-button
      >
      <div class="d-flex align-items-end gap-2" v-else>
        Waiting for the game to start
        <DotsLoader />
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

const {
  zkAppStates,
  loading,
  error,
  zkAppAddress,
  userRole,
  currentTransactionLink,
  game,
} = storeToRefs(useZkAppStore());
const { acceptGame, getRole, cancelGame } = useZkAppStore();
const acceptedGameId = ref();
const route = useRoute();
const isGameCancelled = computed(() => {
  return zkAppStates.value?.rewardAmount === '0';
});
const handleAcceptGame = async () => {
  await acceptGame();
  if (error.value) {
    ElMessage.error({ message: error.value, duration: 6000 });
  } else {
    acceptedGameId.value = route?.params?.id;
    localStorage.setItem('lastAcceptedGame', acceptedGameId.value);
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
  }
};
const isLastAcceptedGame = computed(() => {
  return acceptedGameId.value === route?.params?.id;
});
onMounted(async () => {
  await getRole();
  acceptedGameId.value = localStorage.getItem('lastAcceptedGame');
  if (zkAppStates.value?.rewardAmount === '0') {
  }
});
</script>
