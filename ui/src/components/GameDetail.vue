<template>
  <div
    class="w-100 d-flex flex-column align-items-center gap-3"
    v-if="isGameCancelled"
  >
    <div class="snow-white">Game has been cancelled</div>
    <Button class="cta-3" size="large"> Return to Lobby </Button>
  </div>
  <CodeMasterGameDetail v-else-if="isCodeMaster" />
  <CodeBreakerGameDetail v-else />
</template>
<script lang="ts" setup>
import { useZkAppStore } from '@/store/zkAppModule';
import { storeToRefs } from 'pinia';
import { ElMessage } from 'element-plus';
import { updateLocalStorageGames } from '@/utils';
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import CodeMasterGameDetail from './CodeMasterGameDetail.vue';
import Button from './shared/Button.vue';
import CodeBreakerGameDetail from './CodeBreakerGameDetail.vue';

const { zkAppStates, publicKeyBase58, userRole, game } =
  storeToRefs(useZkAppStore());
const route = useRoute();
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

const isCancelGameTimeElapsed = ref(
  game.value?.lastCancelTimestamp &&
    Date.now() - game.value?.lastCancelTimestamp > MINA_APPROX_SLOT_DURATION
);
const isGameCancelled = computed(() => {
  return zkAppStates.value?.rewardAmount === 0;
});
const isCodeMaster = computed(
  () =>
    userRole.value === 'CODE_MASTER' ||
    game.value?.codeMaster === publicKeyBase58.value
);
</script>
<style lang="scss" scoped>
.warning-text {
  font-size: 12px;
  text-align: start;
}
.transaction-notice {
  background: #313a41;
  padding: 20px;
  margin-top: 10px;
  border-radius: 10px;
}
</style>
