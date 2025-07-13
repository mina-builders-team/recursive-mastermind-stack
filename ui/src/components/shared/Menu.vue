<template>
  <div
    class="menu-container d-flex justify-content-between align-items-center w-100"
  >
    <!--Todo: change font-weight-->
    <span class="game-title">MASTERMIND</span>
    <div class="d-flex gap-4 align-items-center">
      <span class="fs-14 fw-600">Play</span>
      <span class="fs-14 fw-600">MyGames</span>
      <span class="fs-14 fw-600">Learn</span>
      <span class="fs-14 fw-600">Rank</span>
      <div
        class="d-flex justify-content-center align-items-center gap-2 gray fs-14 wallet-btn"
      >
        <inline-svg src="/icons/wallet.svg" width="14" height="14" />
        <span v-if="publicKeyBase58">{{ formatAddress(publicKeyBase58) }}</span>
        <span v-else>Connect</span>
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { useZkAppStore } from '@/store/zkAppModule';
import { storeToRefs } from 'pinia';
import { formatAddress } from '@/utils';
const { publicKeyBase58 } = storeToRefs(useZkAppStore());
</script>
<style scoped lang="scss">
.game-title {
  letter-spacing: 10px;
  font-size: 15px;
  font-weight: 100;
}
.wallet-btn {
  padding: 8px 16px;
  border-radius: 10px;
  background: linear-gradient(
    180deg,
    rgba(59, 61, 63, 0.5) 0%,
    rgba(25, 27, 29, 0.5) 100%
  );
  background-blend-mode: color-dodge;
  box-shadow: 2px 2px 12px 2px #1e1f22 inset;
  backdrop-filter: blur(10px);
}
</style>
