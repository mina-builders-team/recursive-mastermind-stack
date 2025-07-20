<template>
  <MatrixBackground />
  <div class="d-flex justify-content-center">
    <div class="h-100 main-container">
      <Menu v-if="showMenu"></Menu>
      <div class="w-100">
        <router-view />
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { useZkAppStore } from '@/store/zkAppModule';
import MatrixBackground from './components/MatrixBackground.vue';
import Menu from '@/components/shared/Menu.vue';
import { useRoute } from 'vue-router';
const { setupZkApp } = useZkAppStore();
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
const route = useRoute();
const showMenu = ref(true);
watch(
  () => route.name,
  () => {
    if (route.name === 'onboarding') {
      showMenu.value = false;
    } else {
      showMenu.value = true;
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
  width: 90%;
}
</style>
