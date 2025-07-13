<template>
  <MatrixBackground />
  <div class="d-flex justify-content-center">
    <div class="h-100 main-container">
      <Menu></Menu>
      <div class="w-100">
        <router-view />
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { onMounted, watch } from 'vue';
import { useZkAppStore } from '@/store/zkAppModule';
import { storeToRefs } from 'pinia';
import MatrixBackground from './components/MatrixBackground.vue';
import Menu from '@/components/shared/Menu.vue';
const { zkappWorkerClient, hasBeenSetup, accountExists } =
  storeToRefs(useZkAppStore());
const { checkAccountExists, setupZkApp } = useZkAppStore();
onMounted(async () => {
  await setupZkApp();
  removePastGames();
});
const removePastGames = () => {
  const now = Date.now();
  let games: any = {};
  const storedGames = localStorage.getItem('games');
  if (storedGames) {
    games = { ...JSON.parse(storedGames) };
    for (const gameId of Object.keys(games)) {
      const lastUpdatedAt = games[gameId].lastUpdatedAt;
      if (now - lastUpdatedAt > 1000 * 3600 * 24) {
        delete games[gameId];
      }
      localStorage.setItem('games', JSON.stringify(games));
    }
  }
};
watch(
  [
    () => zkappWorkerClient.value,
    () => hasBeenSetup.value,
    () => accountExists.value,
  ],
  async () => {
    if (hasBeenSetup.value && !accountExists.value) {
      await checkAccountExists();
    }
  }
);
</script>
<style scoped>
.main-container {
  padding: 5%;
  display: flex;
  flex-direction: column;
  align-items: center;
  font-size: 14px;
  width: 69%;
}
</style>
