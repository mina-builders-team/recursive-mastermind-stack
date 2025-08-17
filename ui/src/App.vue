<template>
  <MatrixBackground />
  <div class="d-flex justify-content-center main-container">
    <div class="h-100 w-100">
      <Menu v-if="showMenu"></Menu>
      <div class="w-100 h-100">
        <ConnectModal
          v-if="
            (!isOnValidChain || !publicKeyBase58) &&
            routeName &&
            !['home', 'onboarding'].includes(routeName as string)
          "
        />
        <router-view v-else />
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useZkAppStore } from '@/store/zkAppModule';
import MatrixBackground from './components/MatrixBackground.vue';
import Menu from '@/components/shared/Menu.vue';
import { useRoute } from 'vue-router';
import { storeToRefs } from 'pinia';
import ConnectModal from '@/components/modals/ConnectModal.vue';
const { setupZkApp } = useZkAppStore();
const { publicKeyBase58, isOnValidChain } = storeToRefs(useZkAppStore());
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
const routeName = computed(() => route.name);
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
  font-size: 14px;
  padding: 5% 4%;
}

@media (min-width: 576px) {
  .main-container {
    padding: 5% 6%;
  }
}

@media (min-width: 768px) {
  .main-container {
    padding: 5% 8%;
  }
}

@media (min-width: 992px) {
  .main-container {
    padding: 5% 10%;
  }
}

@media (min-width: 1300px) {
  .main-container {
    padding: 5% 10%;
  }
}
</style>
