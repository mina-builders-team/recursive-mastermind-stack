<template>
  <div class="d-flex flex-column gap-2">
    <div
      class="w-100 d-flex flex-column align-items-center gap-3 default-border radius-20 bg-alpha-50-900-50 p-20"
      v-if="isGameCancelled"
    >
      <div class="snow-white">Game has been cancelled</div>
      <Button class="cta-3" size="large"> Return to Lobby </Button>
    </div>
    <div v-else class="default-border radius-20 bg-alpha-50-900-50 p-20">
      <CodeMasterGameDetail v-if="isCodeMaster" />
      <CodeBreakerGameDetail v-else />
    </div>
    <MiniPuzzle />
  </div>
</template>
<script lang="ts" setup>
import { useZkAppStore } from '@/store/zkAppModule';
import { storeToRefs } from 'pinia';
import { computed } from 'vue';
import CodeMasterGameDetail from './CodeMasterGameDetail.vue';
import Button from '@/components/shared/Button.vue';
import CodeBreakerGameDetail from './CodeBreakerGameDetail.vue';
import MiniPuzzle from '@/components/shared/MiniPuzzle.vue';

const { zkAppStates, publicKeyBase58, userRole, game } =
  storeToRefs(useZkAppStore());

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
