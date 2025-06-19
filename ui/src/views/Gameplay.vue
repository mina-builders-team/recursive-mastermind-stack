<template>
  <div class="d-flex flex-column align-items-center">
    <div
      class="exit-game cursor-pointer mb-4 d-flex align-items-center gap-2"
      @click="handleLeaveGame"
    >
      <el-icon class="pt-1 fw-bold"><Back /></el-icon>
      Exit game
    </div>
    <div v-if="zkAppStates" class="w-100">
      <GameDetail
        v-if="
          !isGameAcceptedOnChain ||
          (!isPlayingOnChain &&
            ['ACTIVE', 'PENDING'].includes(game?.status || ''))
        "
      />
      <GameBoard v-else />
    </div>
    <div v-else class="mt-5">
      <GameBoardSkeleton />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue';
import { useZkAppStore } from '@/store/zkAppModule';
import { storeToRefs } from 'pinia';
import { useRoute, useRouter } from 'vue-router';
import GameBoard from '@/components/GameBoard.vue';
import GameDetail from '@/components/GameDetail.vue';
import GameBoardSkeleton from '@/components/GameBoardSkeleton.vue';
const route = useRoute();
const router = useRouter();
const { compiled, zkAppStates, game, isPlayingOnChain } =
  storeToRefs(useZkAppStore());
const {
  initZkappInstance,
  joinGame,
  getZkAppStates,
  startGame,
  clearGame,
  setPlayingOnChain,
  establishConnection,
} = useZkAppStore();
const gameId = route?.params?.id as string;
const isGameAcceptedOnChain = ref(false);
const initializeGame = async () => {
  if (compiled.value) {
    await initZkappInstance(gameId);
    await joinGame(gameId);
    intervalId.value = setInterval(async () => {
      await getZkAppStates();
      if (zkAppStates.value && zkAppStates.value.codeBreakerId !== '0') {
        if (intervalId.value) {
          clearInterval(intervalId.value);
        }
      }
    }, 30000);
  }
};
const handleLeaveGame = () => {
  router.push({ name: 'home' });
};
onMounted(async () => {
  await initializeGame();
});
watch(
  () => compiled.value,
  async () => {
    await initializeGame();
  }
);
watch(
  () => zkAppStates.value?.codeBreakerId,
  async () => {
    await establishConnection();

    isGameAcceptedOnChain.value =
      zkAppStates.value?.codeBreakerId &&
      zkAppStates.value?.codeBreakerId !== '0';
    if (
      game.value?.status &&
      ['ACTIVE', 'PENDING', 'CANCELLED'].includes(game.value?.status) &&
      isGameAcceptedOnChain.value
    ) {
      startGame();
    }
  }
);

const intervalId = ref<number | null>(null);

onUnmounted(async () => {
  clearGame();
  if (intervalId.value) {
    clearInterval(intervalId.value);
  }
  if (isPlayingOnChain.value) {
    setPlayingOnChain(false);
  }
});
</script>
<style lang="css" scoped>
.board__container {
  border: 1px solid #222;
  box-shadow: 0 0 10px #00ffcc55;
}
.exit-game {
  color: #00ffcc;
}
</style>
