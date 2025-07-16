<template>
  <div class="d-flex flex-column align-items-center">
    <div class="w-100">
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
    <!--     <div v-else>
      <Modal>
        <div class="d-flex flex-column gap-2 snow-white">
          <div class="d-flex align-items-end gap-2">
            <div>Setting up game {{ formatAddress(gameId) }} </div>
            <div class=""><DotsLoader /></div>
          </div>
        </div>
      </Modal>
    </div>
 -->
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue';
import { useZkAppStore } from '@/store/zkAppModule';
import { storeToRefs } from 'pinia';
import { useRoute } from 'vue-router';
import GameBoard from '@/components/gameplay/GameBoard.vue';
import GameDetail from '@/components/gameplay/GameDetail.vue';
import Modal from '@/components/shared/Modal.vue';
const route = useRoute();
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
  getRole,
  getGame,
} = useZkAppStore();
const gameId = route?.params?.id as string;
const isGameAcceptedOnChain = ref(false);
const initializeGame = async () => {
  if (compiled.value) {
    await initZkappInstance(gameId);
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
  }
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
