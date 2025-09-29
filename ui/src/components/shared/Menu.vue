<template>
  <div
    class="menu-container d-flex justify-content-between align-items-center w-100"
  >
    <img class="cursor-pointer" src="/logo.png" @click="redirectToLanding" />
    <div class="d-none d-md-flex gap-4 align-items-center">
      <span
        class="fs-14 fw-600 cursor-pointer"
        v-for="link in links"
        :key="link.name"
        @click="handleLinkClick(link)"
      >
        {{ link.title }}
      </span>
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

    <div class="d-md-none">
      <button class="hamburger" @click="toggleMenu">
        <span :class="{ open: isOpen }"></span>
        <span :class="{ open: isOpen }"></span>
        <span :class="{ open: isOpen }"></span>
      </button>
    </div>
    <transition name="slide">
      <div v-if="isOpen" class="mobile-menu">
        <div
          class="menu-item"
          v-for="link in links"
          :key="link.name"
          @click="handleMobileClick(link)"
        >
          {{ link.title }}
        </div>
        <Button
          class="w-100 btn-cta3 border-alpha-50-300-50 mt-3"
          @click="handleConnect"
        >
          <div class="color-gray text-center">
            <inline-svg
              src="/icons/wallet.svg"
              class="me-1"
              width="14"
              height="14"
            />
            <span v-if="publicKeyBase58">{{
              formatAddress(publicKeyBase58)
            }}</span>
            <span v-else>Connect</span>
          </div>
        </Button>
      </div>
    </transition>
  </div>
</template>
<script lang="ts" setup>
import { ref } from 'vue';
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
  { title: 'Tutorial', name: 'tutorial' },
];

const isOpen = ref(false);
const toggleMenu = () => {
  isOpen.value = !isOpen.value;
};
const handleLinkClick = (item: { title: string; name: string }) => {
  if (item.name === 'tutorial') {
    window.open('https://mastermind-demo.pages.dev/', '_blank');
  } else {
    router.push({ name: item.name });
  }
};
const handleMobileClick = (item: { title: string; name: string }) => {
  handleLinkClick(item);
  isOpen.value = false;
};
const handleConnect = async () => {
  if (!publicKeyBase58.value) {
    await connect();
  }
  isOpen.value = false;
};
const redirectToLanding = () => {
  router.push({ name: 'home' });
};
</script>

<style scoped lang="scss">
.hamburger {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  width: 22px;
  height: 18px;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
}
.hamburger span {
  display: block;
  height: 3px;
  width: 100%;
  background: #333;
  border-radius: 2px;
  transition: all 0.3s ease;
}
.hamburger span.open:nth-child(1) {
  transform: rotate(45deg) translateY(7px);
}
.hamburger span.open:nth-child(2) {
  opacity: 0;
}
.hamburger span.open:nth-child(3) {
  transform: rotate(-45deg) translateY(-7px);
}

.mobile-menu {
  position: absolute;
  top: 60px;
  right: 0;
  width: 70%;
  max-width: 250px;
  background: black;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15);
  padding: 1rem;
  border-radius: 8px;
  z-index: 1000;
}
.menu-item {
  padding: 0.75rem 0;
  font-weight: 600;
  cursor: pointer;
}
.menu-item:last-child {
  border-bottom: none;
}

.slide-enter-active,
.slide-leave-active {
  transition: all 0.3s ease;
}
.slide-enter-from {
  transform: translateX(100%);
  opacity: 0;
}
.slide-enter-to {
  transform: translateX(0);
  opacity: 1;
}
.slide-leave-from {
  transform: translateX(0);
  opacity: 1;
}
.slide-leave-to {
  transform: translateX(100%);
  opacity: 0;
}
</style>
