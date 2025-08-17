<template>
  <el-dialog
    :model-value="true"
    class="w-400 bg-alpha-50-900-50 radius-10"
    :close-on-click-modal="false"
    width="700"
    header-class="dialog-header"
    :show-close="false"
    modal-class="mask-class"
    :destroy-on-close="true"
    :close-on-press-escape="false"
  >
    <div
      class="color-snow-white d-flex flex-column gap-3 p-3 bg-alpha-50-900-50 border-alpha-50-300-50 radius-10"
    >
      <div v-if="hasWallet === false">
        It looks like you don't have the Auro Wallet installed. To continue,
        please install it first.
      </div>
      <div v-else class="text-center">
        This page requires a connected wallet on {{ MINA_NETWORK }},<br />
        please connect your wallet and make sure you're on the correct network
        first.
      </div>
      <div class="d-flex">
        <Button
          class="btn-cta3 border-alpha-50-300-50 color-snow-white flex-1"
          @click="backToHome"
        >
          Back To Home
        </Button>
        <Button
          class="border-alpha-50-300-50 snow-white flex-1 color-black radius-10"
          @click="handleButtonClick"
        >
          <div class="color-black">
            <div class="d-flex align-items-center ps-2">
              <inline-svg
                src="/icons/wallet.svg"
                class="me-1"
                width="14"
                height="14"
              />
              <span class="me-2">
                <span v-if="hasWallet === false">Install Auro Wallet</span>
                <span v-else>Connect</span>
              </span>
            </div>
          </div>
        </Button>
      </div>
    </div>
  </el-dialog>
</template>
<script setup lang="ts">
import { useZkAppStore } from '@/store/zkAppModule';
import Button from '../shared/Button.vue';
import { storeToRefs } from 'pinia';
import { useRouter } from 'vue-router';
const { hasWallet } = storeToRefs(useZkAppStore());
const { connect } = useZkAppStore();
const router = useRouter();
const MINA_NETWORK = import.meta.env.VITE_MINA_NETWORK;
const handleButtonClick = async () => {
  if (hasWallet.value === false) {
    window.open('https://www.aurowallet.com/', '_blank');
  } else {
    await connect();
  }
};
const backToHome = () => {
  router.push({ name: 'home' });
};
</script>
