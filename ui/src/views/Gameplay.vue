<template>
  <div class="d-flex flex-column align-items-center">
    <div v-if="isLoading">
      <Modal class="w-500">
        <GameBoardSkeleton />
      </Modal>
    </div>
    <div v-else-if="isNotAvailableGame">
      <Modal class="w-400">
        <NotFound />
      </Modal>
    </div>
    <div v-else class="w-100">
      <Modal
        v-if="
          !isGameAcceptedOnChain ||
          (!isPlayingOnChain &&
            ['ACTIVE', 'PENDING'].includes(game?.status || ''))
        "
        background="transparent"
        border="unset"
        padding="0px"
      >
        <GameDetail />
      </Modal>
      <GameBoard v-else />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useZkAppStore } from '@/store/zkAppModule';
import { storeToRefs } from 'pinia';
import { useRoute } from 'vue-router';
import GameBoard from '@/components/gameplay/GameBoard.vue';
import GameDetail from '@/components/gameplay/GameDetail.vue';
import Modal from '@/components/shared/Modal.vue';
import GameBoardSkeleton from '@/components/gameplay/skeleton/GameBoardSkeleton.vue';
import NotFound from '@/views/NotFound.vue';
const route = useRoute();
const {
  compiled,
  zkAppStates,
  game,
  isPlayingOnChain,
  publicKeyBase58,
  error,
  userRole,
} = storeToRefs(useZkAppStore());
const {
  initZkappInstance,
  joinGame,
  getZkAppStates,
  startGame,
  clearGame,
  setPlayingOnChain,
  establishConnection,
  getRole,
  getGame,
} = useZkAppStore();
const gameId = route?.params?.id as string;
const isGameAcceptedOnChain = ref(false);
const isLoading = ref(true);
const requestGameStart = async () => {
  isGameAcceptedOnChain.value =
    zkAppStates.value?.codeBreakerId &&
    zkAppStates.value?.codeBreakerId !== '0';
  if (
    game.value?.status &&
    ['ACTIVE', 'PENDING', 'CANCELLED'].includes(game.value?.status) &&
    isGameAcceptedOnChain.value
  ) {
    await establishConnection();
    startGame();
  }
};
const initializeGame = async () => {
  if (compiled.value) {
    await initZkappInstance(gameId);
    await getZkAppStates();
    await joinGame(gameId);
    await getRole();

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
onMounted(async () => {
  await initializeGame();
  if (!game.value) {
    await getGame(gameId);
    if (error.value === 'Network Error') {
      setPlayingOnChain(true, gameId);
    }
  }
  isLoading.value = false;
  await requestGameStart();
});
const isNotAvailableGame = computed(() => {
  return (
    (!isPlayingOnChain.value &&
      ((!game.value && compiled.value && userRole.value !== 'CODE_MASTER') ||
        (game.value?.status === 'PENDING' &&
          game.value?.codeMaster !== publicKeyBase58.value))) ||
    (isPlayingOnChain.value &&
      zkAppStates.value?.codeBreakerId === '0' &&
      userRole.value !== 'CODE_MASTER')
  );
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
    await requestGameStart();
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
<style lang="scss" scoped></style>
