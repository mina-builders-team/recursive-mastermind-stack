<template>
  <div class="w-100 lobby-container mt-5">
    <div class="d-flex justify-content-between align-items-center gap-5">
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
          class="btn-cta2 d-flex align-items-center px-4"
          @click="handleCreateChallenge"
          size="large"
        >
          <div class="color-snow-white d-flex align-items-center gap-2">
            <inline-svg class="me-2" src="/icons/dice.svg"></inline-svg>
            <span class="fw-400 fs-14">Create a Challenge</span>
          </div>
        </Button>
      </div>
      <div class="placeholder"></div>
    </div>
    <div class="d-flex align-items-start gap-5 mt-5 w-100">
      <div class="flex-1">
        <div
          class="p-1 d-flex w-100 justify-content-between align-items-center lobby-tab"
        >
          <div class="d-flex">
            <div
              :class="[
                'option cursor-pointer fw-600',
                { 'lobby-all': gamesType === 'public' },
              ]"
              @click="filterByType('public')"
            >
              AVAILABLE
            </div>
            <div
              :class="[
                'option cursor-pointer fw-600',
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
            <el-tooltip placement="bottom" effect="customized">
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
          class="infinite-list d-flex gap-3 flex-wrap mt-4"
          v-infinite-scroll="loadMoreActiveGames"
          :infinite-scroll-disabled="isLoading || reachedEnd"
          :infinite-scroll-immediate="false"
          :infinite-scroll-distance="40"
          style="overflow: auto"
        >
          <GameCard
            v-for="game in lobbyData?.filteredActiveGames"
            :game="game"
          />
        </div>
      </div>
      <div>
        <Missions />
      </div>
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
import axios from 'axios';
import { storeToRefs } from 'pinia';
import { onMounted, ref } from 'vue';

const { publicKeyBase58 } = storeToRefs(useZkAppStore());
const SERVER_URL = import.meta.env.VITE_SERVER_URL;
const showJoinWithCodeModal = ref(false);
const showCreateChallengeModal = ref(false);
const lobbyData = ref({});

const currentPage = ref(1);
const limit = ref(10);
const gamesType = ref<'public' | 'own'>('public');
const orderBy = ref<'createdAt' | 'rewardAmount'>('createdAt');
const sortOrder = ref<'asc' | 'desc'>('desc');
const isLoading = ref(false);
const reachedEnd = ref(false);

const sortBy = async (criteria: 'createdAt' | 'rewardAmount') => {
  currentPage.value = 1;
  orderBy.value = criteria;
  await getActiveGames();
};
const filterByType = async (type: 'public' | 'own') => {
  currentPage.value = 1;
  gamesType.value = type;
  await getActiveGames();
};
const loadMoreActiveGames = async () => {
  if (isLoading.value || reachedEnd.value) return;

  isLoading.value = true;

  await getActiveGames();

  const totalLoaded = lobbyData.value.length;
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
  if (orderBy.value) query.append('orderBy', orderBy.value);
  if (sortOrder.value) query.append('sortOrder', sortOrder.value);
  const res = await axios.get(
    `${SERVER_URL}/games/active-games/${publicKeyBase58.value}?${query.toString()}`
  );
  lobbyData.value.filteredActiveGames =
    currentPage.value === 1
      ? [...res.data?.filteredActiveGames]
      : [
          ...lobbyData.value.filteredActiveGames,
          ...res.data?.filteredActiveGames,
        ];
  lobbyData.value.totalActiveCount = res.data.totalActiveCount;
  if (includeInProgress) {
    lobbyData.value.inProgressGames = res.data.inProgressGames;
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
.placeholder {
  width: 325px;
  height: 1px;
  background-color: transparent;
}
</style>
