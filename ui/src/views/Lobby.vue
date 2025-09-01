<template>
  <div class="w-100 lobby-container mt-5">
    <div class="w-100 d-flex top-bar">
      <div class="d-flex align-items-center flex-1 gap-5">
        <div class="flex-1">
          <h2 class="fw-bold play-title">PLAY</h2>
          <div>Discover and join available Mina Mastermind games.</div>
        </div>
        <div
          class="d-flex gap-2 flex-wrap align-items-center justify-content-center"
        >
          <Button
            class="btn-cta1 px-4 d-flex align-items-center"
            @click="handleJoinWithCode"
            size="large"
          >
            <div class="color-black d-flex align-items-center gap-2">
              <inline-svg class="me-2" src="/icons/binary.svg"></inline-svg>
              <span class="fw-700">Join with Code</span>
            </div>
          </Button>
          <Button
            class="btn-cta3 border-alpha-50-300-50 radius-60 d-flex align-items-center px-4"
            @click="handleCreateChallenge"
            size="large"
          >
            <div class="color-snow-white d-flex align-items-center gap-2">
              <inline-svg class="me-2" src="/icons/dice.svg"></inline-svg>
              <span class="fw-400 fs-14">Create a Challenge</span>
            </div>
          </Button>
        </div>
      </div>
      <div></div>
    </div>

    <div class="d-flex align-items-start w-100 mt-3 lobby-body">
      <div class="flex-1">
        <div
          class="p-1 d-flex w-100 justify-content-between align-items-center lobby-tab"
        >
          <div class="d-flex me-1">
            <div
              :class="[
                'option cursor-pointer fw-600 d-flex align-items-center justify-content-center',
                { 'lobby-all': gamesType === 'public' },
              ]"
              @click="filterByType('public')"
            >
              AVAILABLE
            </div>
            <div
              :class="[
                'option cursor-pointer fw-600 d-flex align-items-center justify-content-center text-center',
                { 'lobby-all': gamesType === 'own' },
              ]"
              @click="filterByType('own')"
            >
              YOUR GAMES
            </div>
          </div>
          <div class="d-flex me-3 filter-icons">
            <el-tooltip
              placement="bottom"
              effect="customized"
              popper-class="filter-tooltip"
            >
              <template #content>
                <span>Highest Amount</span>
              </template>
              <Button
                @click="sortBy('rewardAmount')"
                class="btn-cta3 border-alpha-20-300-20 p-5-10"
              >
                <div>
                  <inline-svg src="/icons/sort.svg"></inline-svg>
                </div>
              </Button>
            </el-tooltip>
            <el-tooltip
              placement="bottom"
              effect="customized"
              popper-class="filter-tooltip"
            >
              <template #content>
                <span>Last Created</span>
              </template>
              <Button
                @click="sortBy('createdAt')"
                class="btn-cta3 border-alpha-20-300-20 p-5-10"
              >
                <div>
                  <inline-svg src="/icons/upload.svg"></inline-svg>
                </div>
              </Button>
            </el-tooltip>
          </div>
        </div>
        <div
          v-for="game in lobbyData.inProgressGames"
          :key="game._id"
          class="py-2"
        >
          <InProgressGameCard
            :public-key-base58="publicKeyBase58"
            :game="game"
          />
        </div>
        <div
          v-if="!isLoading && !lobbyData?.filteredActiveGames?.length"
          class="bg-alpha-8-300-8 border-alpha-50-300-50 backdrop-blur-10 w-100 d-flex flex-column align-items-center justify-content-center gap-3 p-5 mt-3 radius-10 text-center"
        >
          <span class="fs-16">The Arena is Empty</span>
          <div class="fw-600 fs-16">
            Be the one to start the next great match!
          </div>
          <Button
            class="btn-cta3 border-alpha-50-300-50 radius-60 d-flex align-items-center px-4 mt-4"
            @click="handleCreateChallenge"
            size="large"
          >
            <div class="color-snow-white d-flex align-items-center gap-2">
              <inline-svg class="me-2" src="/icons/dice.svg"></inline-svg>
              <span class="fw-400 fs-14">Create a Challenge</span>
            </div>
          </Button>
        </div>
        <div
          v-else
          class="infinite-list mt-4 flex-1"
          v-infinite-scroll="loadMoreActiveGames"
          :infinite-scroll-disabled="isLoading || reachedEnd"
          :infinite-scroll-immediate="false"
          :infinite-scroll-distance="40"
        >
          <GameCard
            v-for="game in lobbyData?.filteredActiveGames"
            :key="game._id"
            :game="game"
          />
        </div>
      </div>
    </div>
    <div class="missions-container mt-3">
      <Missions />
    </div>
    <JoinWithCodeModal
      v-if="showJoinWithCodeModal"
      @close="handleJoinWithCodeClose"
    />
    <CreateGameModal
      v-if="showCreateChallengeModal"
      @close="handleCloseChallenge"
    />
  </div>
</template>
<script setup lang="ts">
import GameCard from '@/components/lobby/GameCard.vue';
import InProgressGameCard from '@/components/lobby/InProgressGameCard.vue';
import Missions from '@/components/lobby/Missions.vue';
import CreateGameModal from '@/components/modals/CreateGameModal.vue';
import JoinWithCodeModal from '@/components/modals/JoinWithCodeModal.vue';
import Button from '@/components/shared/Button.vue';
import { useZkAppStore } from '@/store/zkAppModule';
import { Game } from '@/types';
import axios from 'axios';
import { storeToRefs } from 'pinia';
import { onMounted, ref } from 'vue';

const { publicKeyBase58 } = storeToRefs(useZkAppStore());
const SERVER_URL = import.meta.env.VITE_SERVER_URL;
const showJoinWithCodeModal = ref(false);
const showCreateChallengeModal = ref(false);
const lobbyData = ref<{
  totalActiveCount: number;
  page: number;
  limit: number;
  inProgressGames: Array<Game>;
  filteredActiveGames: Array<Game>;
}>({
  totalActiveCount: 0,
  page: 1,
  limit: 10,
  inProgressGames: [],
  filteredActiveGames: [],
});

const currentPage = ref(1);
const limit = ref(9);
const gamesType = ref<'public' | 'own'>('public');
const orderBy = ref<'createdAt' | 'rewardAmount'>('createdAt');
const sortOrder = ref<'asc' | 'desc'>('desc');
const isLoading = ref(false);
const reachedEnd = ref(false);

const toggleSortOrder = () => {
  if (sortOrder.value === 'desc') {
    sortOrder.value = 'asc';
  } else {
    sortOrder.value = 'desc';
  }
};
const sortBy = async (criteria: 'createdAt' | 'rewardAmount') => {
  currentPage.value = 1;
  reachedEnd.value = false;
  if (orderBy.value === criteria) {
    toggleSortOrder();
  } else {
    orderBy.value = criteria;
    sortOrder.value = 'desc';
  }
  await getActiveGames();
};
const filterByType = async (type: 'public' | 'own') => {
  currentPage.value = 1;
  reachedEnd.value = false;
  gamesType.value = type;
  await getActiveGames();
};
const loadMoreActiveGames = async () => {
  if (isLoading.value || reachedEnd.value) return;

  isLoading.value = true;

  await getActiveGames();

  const totalLoaded = lobbyData.value.filteredActiveGames.length;
  if (totalLoaded >= lobbyData.value.totalActiveCount) {
    reachedEnd.value = true;
  }

  currentPage.value++;
  isLoading.value = false;
};
const getActiveGames = async (includeInProgress?: boolean) => {
  const query = new URLSearchParams({
    includeInProgress: includeInProgress ? 'true' : 'false',
    page: currentPage.value.toString(),
    limit: limit.value.toString(),
  });
  if (gamesType.value) query.append('filter', gamesType.value);
  if (orderBy.value) query.append('sortBy', orderBy.value);
  if (sortOrder.value) query.append('sortOrder', sortOrder.value);
  const res = await axios.get(
    `${SERVER_URL}/games/active-games/${publicKeyBase58.value}?${query.toString()}`
  );
  lobbyData.value.filteredActiveGames =
    currentPage.value === 1
      ? res.data?.filteredActiveGames
      : [
          ...lobbyData.value.filteredActiveGames,
          ...res.data?.filteredActiveGames,
        ];
  lobbyData.value.totalActiveCount = res.data?.totalActiveCount;
  if (includeInProgress) {
    lobbyData.value.inProgressGames = res.data?.inProgressGames;
  }
};

const handleJoinWithCode = () => {
  showJoinWithCodeModal.value = true;
};
const handleJoinWithCodeClose = () => {
  showJoinWithCodeModal.value = false;
};
const handleCreateChallenge = () => {
  showCreateChallengeModal.value = true;
};
const handleCloseChallenge = () => {
  showCreateChallengeModal.value = false;
};

onMounted(async () => {
  await getActiveGames(true);
});
</script>
<style scoped lang="scss">
.lobby-container {
  display: grid;
  grid-template-columns: 1fr 300px;
  grid-template-rows: 1fr;
  gap: 1rem 2rem;
}
.top-bar {
  grid-column: 1 / 2;
  grid-row: 1;
}
.lobby-body {
  grid-column: 1 / 2;
  grid-row: 2;
}
.infinite-list {
  overflow-y: scroll;
  height: calc(70vh - 200px);
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  align-items: start;
  grid-auto-rows: min-content;
  gap: 10px;
}
.play-title {
  letter-spacing: 10px;
  font-size: 32px;
}
.challenge-btn {
  border-radius: 60px;
  padding: 20px;
  box-shadow: 0px 2px 15px 0px #1e1f22 inset;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: #1e1f22;
}
.lobby-tab {
  border-radius: 26px;
  background: rgba(59, 61, 63, 0.08);
  border: 1px solid #2f3135;
  backdrop-filter: blur(10px);
}
.lobby-all {
  background: linear-gradient(
    180deg,
    rgba(59, 61, 63, 0.5) 0%,
    rgba(25, 27, 29, 0.5) 100%
  );
  background-blend-mode: color-dodge;
  border: 1px solid #333436;
  padding: 10px 35px;
  border-radius: 60px;
  box-shadow: 0px -4px 4px 0px #2c2e30 inset;
}
.option {
  padding: 10px 35px;
}
.sort-icon {
  background: #1e1f22;
  box-shadow: 0px 2px 15px 0px #1e1f22 inset;
  backdrop-filter: blur(10px);
  border: 1px solid #333539;
  border-radius: 10px;
  padding: 10px 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.missions-container {
  grid-column: 2;
  grid-row: 2;
  height: 50vh;
  overflow-y: scroll;
}
</style>
<style lang="scss">
.filter-tooltip.el-popper.is-customized {
  width: 120px;
}
.filter-tooltip.el-popper.is-customized .el-popper__arrow::before {
  content: '';
  background: $color-300 !important;
  top: 5px;
}
</style>
