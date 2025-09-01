<template>
  <div
    class="menu-container d-flex justify-content-between align-items-center w-100"
  >
    <img class="cursor-pointer" src="/logo.png" @click="redirectToLanding" />
    <div class="d-flex gap-4 align-items-center">
      <span
        class="fs-14 fw-600 cursor-pointer"
        v-for="link in links"
        @click="handleLinkClick(link)"
      >
        {{ link.title }}</span
      >
      <Button
        class="w-100 h-100 btn-cta3 border-alpha-50-300-50"
        @click="handleConnect"
      >
        <div class="color-gray">
          <div class="d-flex align-items-center ps-2">
            <inline-svg
              src="/icons/wallet.svg"
              class="me-1"
              width="14"
              height="14"
            />
            <span v-if="publicKeyBase58">{{
              formatAddress(publicKeyBase58)
            }}</span>
            <span v-else class="me-2">Connect</span>
          </div>
        </div>
      </Button>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { useZkAppStore } from '@/store/zkAppModule';
import { storeToRefs } from 'pinia';
import { formatAddress } from '@/utils';
import { useRouter } from 'vue-router';
import Button from './Button.vue';
const { publicKeyBase58 } = storeToRefs(useZkAppStore());
const { connect } = useZkAppStore();

const router = useRouter();
const links = [
  { title: 'Play', name: 'lobby' },
  { title: 'MyGames', name: 'my-games' },
  { title: 'Learn', name: 'onboarding' },
  { title: 'Rank', name: 'leaderboard' },
];
const handleLinkClick = (item: { title: string; name: string }) => {
  router.push({
    name: item.name,
  });
};
const handleConnect = async () => {
  if (!publicKeyBase58.value) {
    await connect();
  }
};
const redirectToLanding = () => {
  router.push({ name: 'home' });
};
</script>
