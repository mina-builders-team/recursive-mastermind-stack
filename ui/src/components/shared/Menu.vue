<template>
  <div class="menu-container d-flex justify-content-between align-items-center w-100">
    <img class="cursor-pointer" src="/logo.png" @click="redirectToLanding" />

    <!-- Desktop Menu -->
    <div class="d-none d-md-flex gap-4 align-items-center position-relative">
      <span v-for="link in linksToShow" :key="link.name" class="fs-14 fw-600 cursor-pointer"
        :class="{ announcement: link.name === 'announcement' }" @click="
          !isTournamentActive || link.name !== 'leaderboard'
            ? handleLinkClick(link)
            : toggleRankDropdown()
          ">
        {{ link.title }}
      </span>

      <div v-if="isRankOpen && isTournamentActive" class="rank-dropdown">
        <div class="dropdown-item" @click="navigateTo('leaderboard')">
          Global Leaderboard
        </div>
        <div class="dropdown-item" @click="navigateTo('tournamentRank', tournamentNAME)">
          Game Night Leaderboard
        </div>
      </div>

      <Button class="w-100 h-100 btn-cta3 border-alpha-50-300-50" @click="handleConnect">
        <div class="color-gray">
          <div class="d-flex align-items-center ps-2">
            <inline-svg src="/icons/wallet.svg" class="me-1" width="14" height="14" />
            <span v-if="publicKeyBase58">{{
              formatAddress(publicKeyBase58)
              }}</span>
            <span v-else class="me-2">Connect</span>
          </div>
        </div>
      </Button>
    </div>

    <!-- Mobile Menu -->
    <div class="d-md-none">
      <button class="hamburger" @click="toggleMenu">
        <span :class="{ open: isOpen }"></span>
        <span :class="{ open: isOpen }"></span>
        <span :class="{ open: isOpen }"></span>
      </button>
    </div>
    <transition name="slide">
      <div v-if="isOpen" class="mobile-menu">
        <div v-for="link in linksToShow" :key="link.name">
          <div class="menu-item" @click="
            !isTournamentActive || link.name !== 'leaderboard'
              ? handleMobileClick(link)
              : toggleMobileRankDropdown()
            ">
            {{ link.title }}
          </div>
          <div v-if="
            isMobileRankOpen &&
            link.name === 'leaderboard' &&
            isTournamentActive
          " class="mobile-rank-dropdown">
            <div class="dropdown-item" @click="navigateTo('leaderboard')">
              Global Leaderboard
            </div>
            <div class="dropdown-item" @click="navigateTo('tournamentRank', tournamentNAME)">
              Game Night Leaderboard
            </div>
          </div>
        </div>
        <Button class="w-100 btn-cta3 border-alpha-50-300-50 mt-3" @click="handleConnect">
          <div class="color-gray text-center">
            <inline-svg src="/icons/wallet.svg" class="me-1" width="14" height="14" />
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

// TODO:: Implement a helper function
const isInTournamentPeriod = () => {
  const tournamentStart = import.meta.env.VITE_TOURNAMENT_START;
  const tournamentEnd = import.meta.env.VITE_TOURNAMENT_END;
  if (!tournamentStart || !tournamentEnd) return false;
  const now = new Date().getTime();
  const start = new Date(tournamentStart).getTime();
  const end = new Date(tournamentEnd).getTime();
  return now >= start && now <= end;
};
const isTournamentActive = ref(isInTournamentPeriod());

const isInAnnouncementPeriod = () => {
  const announcementStart = import.meta.env.VITE_ANNOUNCEMENT_START_AT;
  const announcementEnd = import.meta.env.VITE_ANNOUNCEMENT_END_AT;
  if (!announcementStart || !announcementEnd) return false;
  const now = new Date().getTime();
  const start = new Date(announcementStart).getTime();
  const end = new Date(announcementEnd).getTime();
  return now >= start && now <= end;
};
const tournamentNAME = import.meta.env.VITE_TOURNAMENT_NAME;

const mainMenu = [
  { title: 'Play', name: 'lobby' },
  { title: 'MyGames', name: 'my-games' },
  { title: 'Learn', name: 'onboarding' },
  { title: 'Rank', name: 'leaderboard' },
  { title: 'Tutorial', name: 'tutorial' },
];

const linksToShow = isInAnnouncementPeriod()
  ? [...mainMenu, { title: 'Announcement', name: 'announcement' }]
  : mainMenu;

const isOpen = ref(false);
const isRankOpen = ref(false);
const isMobileRankOpen = ref(false);

const toggleMenu = () => {
  isOpen.value = !isOpen.value;
  isMobileRankOpen.value = false;
};

const toggleRankDropdown = () => {
  if (isTournamentActive.value) isRankOpen.value = !isRankOpen.value;
};

const toggleMobileRankDropdown = () => {
  if (isTournamentActive.value)
    isMobileRankOpen.value = !isMobileRankOpen.value;
};

const handleLinkClick = (item: { title: string; name: string }) => {
  if (item.name === 'tutorial') {
    window.open('https://mastermind-demo.pages.dev/', '_blank');
  } else {
    router.push({ name: item.name });
  }
  isRankOpen.value = false;
};

const handleMobileClick = (item: { title: string; name: string }) => {
  handleLinkClick(item);
  isOpen.value = false;
  isMobileRankOpen.value = false;
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

const navigateTo = (routeName: string, name?: string) => {
  router.push({ name: routeName, params: name ? { name } : undefined });
  isRankOpen.value = false;
  isMobileRankOpen.value = false;
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

.rank-dropdown {
  position: absolute;
  top: 30px;
  background: black;
  border-radius: 8px;
  padding: 0.5rem 0;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  z-index: 1000;
}

.mobile-rank-dropdown {
  padding-left: 1rem;
  display: flex;
  flex-direction: column;
}

.dropdown-item {
  padding: 0.5rem 1rem;
  cursor: pointer;
  font-weight: 500;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }
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

.announcement {
  animation: blink 1s infinite;
}

@keyframes blink {

  0%,
  100% {
    opacity: 0.2;
  }

  50% {
    opacity: 1;
  }
}
</style>
