<template>
  <div>
    <div class="fw-700 fs-32 my-games my-4">MY GAMES</div>
    <div class="d-flex gap-3">
      <MyStats :stats="myGames.stats" />
      <div class="flex-1 h-100">
        <div>
          <div class="border-alpha-20-300-20 radius-4 p-2 fs-14 fw-600">
            Available Games You've Created
          </div>
          <div class="bg-alpha-8-300-8 active-game-card">
            <div v-if="myGames?.activeGames?.length">
              <div
                v-for="game in myGames?.activeGames"
                :key="game._id"
                class="d-flex align-items-center p-1 px-3 w-100"
              >
                <ActiveGameCard :game="game" />
              </div>
            </div>
            <div
              v-else
              class="color-snow-white ps-3 py-2 d-flex justify-content-between"
            >
              <div>
                <div class="fw-700 fs-16">You Haven't Created a Game</div>
                <div class="fs-12">Launch a game as a Codemaster</div>
              </div>
              <Button
                size="large"
                class="bg-alpha-50-300-50 border-alpha-50-300-50 radius-10"
                @click="handleCreateChallenge"
                ><span class="color-snow-white">Create a Code</span>
              </Button>
            </div>
          </div>
        </div>
        <div
          class="mt-5 p-1 d-flex w-100 justify-content-between align-items-center border-alpha-20-300-20 radius-4 lobby-tab"
        >
          <div class="d-flex">
            <div
              :class="[
                'px-5 py-3 cursor-pointer',
                { 'selected-filter': !playedAs },
              ]"
              @click="filterByRole()"
            >
              ALL
            </div>
            <div
              :class="[
                'px-5 py-3 cursor-pointer',
                { 'selected-filter': playedAs === 'codeBreaker' },
              ]"
              @click="filterByRole('codeBreaker')"
            >
              BREAKER
            </div>
            <div
              :class="[
                'px-5 py-3 cursor-pointer',
                { 'selected-filter': playedAs === 'codeMaster' },
              ]"
              @click="filterByRole('codeMaster')"
            >
              MASTER
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
          class="infinite-list"
          v-infinite-scroll="loadMorePlayedGames"
          :infinite-scroll-disabled="isLoading || reachedEnd"
          :infinite-scroll-immediate="false"
          :infinite-scroll-distance="40"
          style="overflow: auto"
        >
          <PlayedGameCard
            v-for="game in myGames?.playedGames"
            :key="game._id"
            :game="game"
            :public-key-base58="publicKeyBase58"
          />
        </div>
      </div>
    </div>
    <CreateGameModal
      v-if="showCreateChallengeModal"
      @close="handleCloseChallenge"
    />
  </div>
</template>
<script setup lang="ts">
import Button from '@/components/shared/Button.vue';
import { useZkAppStore } from '@/store/zkAppModule';
import axios from 'axios';
import { storeToRefs } from 'pinia';
import { onMounted, ref } from 'vue';

import PlayedGameCard from '@/components/myGames/PlayedGameCard.vue';
import MyStats from '@/components/myGames/MyStats.vue';
import CreateGameModal from '@/components/modals/CreateGameModal.vue';
import ActiveGameCard from '@/components/myGames/ActiveGameCard.vue';
import { Game } from '@/types';

const SERVER_URL = import.meta.env.VITE_SERVER_URL;
const { publicKeyBase58 } = storeToRefs(useZkAppStore());

const myGames = ref<{
  activeGames: Game[];
  playedGames: Game[];
  stats: {
    balance: number;
    totalPlayed: number;
    winsAsCodeBreaker: number;
    winsAsCodeMaster: number;
  };
  totalPlayedCount: number;
}>({
  activeGames: [],
  playedGames: [],
  stats: {
    balance: 0,
    totalPlayed: 0,
    winsAsCodeBreaker: 0,
    winsAsCodeMaster: 0,
  },
  totalPlayedCount: 0,
});
const currentPage = ref(1);
const limit = ref(7);
const playedAs = ref<'codeBreaker' | 'codeMaster' | undefined>(undefined);
const orderBy = ref<'createdAt' | 'rewardAmount'>('createdAt');
const sortOrder = ref<'asc' | 'desc'>('desc');

const isLoading = ref(false);
const reachedEnd = ref(false);
const showCreateChallengeModal = ref(false);
const handleCreateChallenge = () => {
  showCreateChallengeModal.value = true;
};
const handleCloseChallenge = () => {
  showCreateChallengeModal.value = false;
};
const toggleSortOrder = () => {
  if (sortOrder.value === 'desc') {
    sortOrder.value = 'asc';
  } else {
    sortOrder.value = 'desc';
  }
};
const sortBy = async (criteria: 'createdAt' | 'rewardAmount') => {
  currentPage.value = 1;
  reachedEnd.value = false
  if (orderBy.value === criteria) {
    toggleSortOrder();
  } else {
    orderBy.value = criteria;
    sortOrder.value = 'desc';
  }
  await getPlayedGames(true);
};
const filterByRole = async (
  role?: 'codeBreaker' | 'codeMaster' | undefined
) => {
  currentPage.value = 1;
  reachedEnd.value = false
  playedAs.value = role;
  await getPlayedGames(true);
};
const loadMorePlayedGames = async () => {
  if (isLoading.value || reachedEnd.value) return;

  isLoading.value = true;

  await getPlayedGames(true);

  const totalLoaded = myGames.value.playedGames.length;
  if (totalLoaded >= myGames.value.totalPlayedCount) {
    reachedEnd.value = true;
  }

  currentPage.value++;
  isLoading.value = false;
};
const getPlayedGames = async (onlyPlayedGames?: boolean) => {
  const query = new URLSearchParams({
    onlyPlayedGames: onlyPlayedGames ? 'true' : 'false',
    page: currentPage.value.toString(),
    limit: limit.value.toString(),
  });
  if (playedAs.value) query.append('playedAs', playedAs.value);
  if (orderBy.value) query.append('orderBy', orderBy.value);
  if (sortOrder.value) query.append('sortOrder', sortOrder.value);

  const res = await axios.get(
    `${SERVER_URL}/games/my-games/${publicKeyBase58.value}?${query.toString()}`
  );
  if (res?.data) {
    if (onlyPlayedGames) {
      myGames.value.playedGames =
        currentPage.value === 1
          ? [...res.data?.playedGames]
          : [...myGames.value.playedGames, ...res.data?.playedGames];
      myGames.value.totalPlayedCount = res.data.totalPlayedCount;
    } else {
      myGames.value = {
        activeGames: res.data?.activeGames,
        playedGames: res.data?.playedGames,
        stats: res.data?.stats,
        totalPlayedCount: res.data?.totalPlayedCount,
      };
    }
  }
};

onMounted(async () => {
  await getPlayedGames(false);
});
</script>

<style lang="scss" scoped>
.active-game-card {
  border-left: 3px solid $snow-white;
}

.my-games {
  letter-spacing: 10px;
}
.selected-filter {
  border-radius: 8px;
  background: $color-600;
  border: 1px solid rgba(59, 61, 63, 0.5);
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
.infinite-list {
  overflow-y: scroll;
  height: calc(80vh - 200px);
}
</style>

<style lang="scss">
.filter-tooltip.el-popper.is-customized .el-popper__arrow::before {
  content: '';
  background: $color-300 !important;
  top: 5px;
}
.filter-tooltip.el-popper.is-customized {
  width: 120px;
}
</style>
