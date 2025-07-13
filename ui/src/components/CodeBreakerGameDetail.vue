<template>
  <div class="d-flex flex-column gap-4">
    <div class="d-flex gap-5">
      <div class="flex-1">
        <div>Game:</div>
        <div
          class="p-10 default-border radius-12 d-flex align-items-center justify-content-center mt-2"
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
          {{ (game?.rewardAmount || 0) / 1e9 }} MINA
        </div>
      </div>
    </div>
    <div>
      <div class="blend-screen bg-alpha-20-300-20 radius-10 p-10 fs-12 fw-600">
        <div class="d-flex justify-content-between mb-2">
          <span> Last Join Attempt: </span>
          <span class="gray fw-400 fs-12">(You)</span>
        </div>
        <div>Last Cancel Attempt:</div>
        <div class="d-flex justify-content-between mb-2">
          <span> Last Accept Game Transaction Hash: </span>
          <span class="gray fw-400 fs-12">421...b3143</span>
        </div>
        <div class="d-flex justify-content-between mb-2">
          <span>
            Please check this transaction before the accepting game:
          </span>
          <el-button class="default-border radius-10 bg-alpha-8-300-8">
            <span class="gray me-2">421...b3143</span>
            <span class="snow-white">Check</span>
          </el-button>
        </div>
      </div>
      <div class="d-flex flex-column align-items-center gap-2">
        <div class="w-100 d-flex justify-content-center fs-12">
          Game should start anytime before:
        </div>
        <Timer
          :duration="MINA_APPROX_SLOT_DURATION"
          :startTimestamp="Date.now()"
        />
      </div>
    </div>
    <div class="d-flex justify-content-between join-modal-footer">
      <el-button
        size="large"
        class="snow-white fw-400 bg-alpha-50-900-50 blend-darken back-btn"
        @click="handleClose"
        >Back</el-button
      >
      <el-button
        size="large"
        class="fw-400 black bg-light-gray search-btn"
        @click="handleAcceptGame"
        >Play Game</el-button
      >
    </div>
  </div>
</template>
<script lang="ts" setup>
import { useZkAppStore } from '@/store/zkAppModule';
import { storeToRefs } from 'pinia';
import { ElMessage, ElNotification } from 'element-plus';
import { updateLocalStorageGames } from '@/utils';
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import CodeMasterGameDetail from './CodeMasterGameDetail.vue';
import Button from './shared/Button.vue';
import CodeBreakerGameDetail from './CodeBreakerGameDetail.vue';
import Timer from './shared/Timer.vue';

const { zkAppStates, error, zkAppAddress, currentTransactionLink, game } =
  storeToRefs(useZkAppStore());
const { acceptGame, cancelGame, getZkAppStates } = useZkAppStore();
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

const handleClose = () => {
  router.push({
    name: 'home',
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
    ElNotification({
      title: 'Success',
      message: `Transaction Hash :  ${currentTransactionLink.value}`,
      type: 'success',
      duration: 5000,
    });
  }
};
const handleAcceptTimeElapsed = async () => {
  await getZkAppStates();
  isAcceptGameTimeElapsed.value = true;
};
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
