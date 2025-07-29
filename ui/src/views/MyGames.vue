<template>
  <div>
    <div class="fw-700 fs-32 my-games my-4">MY GAMES</div>
    <div class="d-flex gap-3">
      <MyStats :stats="myGames.stats" />
      <div class="flex-1 h-100">
        <div>
          <div class="c-disabled p-2 fs-14 fw-600">
            Available Games You've Created
          </div>
          <div class="c-idle active-game-card">
            <div v-if="myGames?.activeGames?.length">
              <div
                v-for="game in myGames?.activeGames"
                class="d-flex align-items-center p-1 px-3 w-100"
              >
                <div
                  class="d-flex w-100 color-snow-white align-items-center justify-content-between gap-2"
                >
                  <div>
                    <div class="fw-700 fs-16">Open Game</div>
                    <div class="fs-12">
                      {{ dayjs(game.createdAt).fromNow() }}
                    </div>
                  </div>
                  <div
                    class="d-flex justify-content-center align-items-center gap-4"
                  >
                    <inline-svg
                      class="color-gray-passive"
                      src="/icons/share.svg"
                    ></inline-svg>
                    <div class="d-flex gap-2 align-items-center">
                      <CopyToClipBoard
                        color="#27282a"
                        :text="game?._id || ''"
                      />
                      <div class="fs-12 color-snow-white">
                        ID: {{ formatAddress(game?._id) }}
                      </div>
                    </div>
                    <inline-svg src="/icons/zk.svg"></inline-svg>
                  </div>
                  <div
                    class="c-disabled radius-10 p-5-10 d-flex align-items-center justify-content-center gap-1"
                  >
                    <inline-svg src="/icons/cash.svg"></inline-svg
                    >{{ game?.rewardAmount / 1e9 }} MINA
                  </div>
                  <el-tooltip
                    placement="right"
                    effect="customized"
                    v-if="game?.cancelTransactionHash"
                  >
                    <template #content>
                      You may want to recheck your transactions status by
                      <span class="text-underline"
                        ><a
                          :href="`https://minascan.io/devnet/tx/${game?.cancelTransactionHash}?type=zk-tx`"
                          target="_blank"
                          rel="noopener noreferrer"
                          class="link"
                          >here
                        </a></span
                      >. You may also resend your transaction with the costs
                    </template>
                    <Button
                      class="bg-red radius-10 cancel-btn"
                      size="large"
                      @click="cancelGameById(game._id)"
                      ><span class="color-snow-white">
                        Re-try Cancel
                      </span></Button
                    >
                  </el-tooltip>
                  <Button
                    v-else
                    class="bg-red radius-10 cancel-btn"
                    size="large"
                    @click="cancelGameById(game._id)"
                    ><span class="color-snow-white"> Cancel </span></Button
                  >
                </div>
              </div>
            </div>
            <div v-else class="color-snow-white ps-3 py-1">
              <div class="fw-700 fs-16">You Haven't Created a Game</div>
              <div class="fs-12">Launch a game as a Codemaster</div>
            </div>
          </div>
        </div>
        <div
          class="mt-5 p-1 d-flex w-100 justify-content-between align-items-center lobby-tab"
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
              SOLVER
            </div>
          </div>
          <div class="d-flex gap-2 me-3 filter-icons">
            <div
              class="sort-icon cursor-pointer"
              @click="sortBy('rewardAmount')"
            >
              <inline-svg src="/icons/sort.svg"></inline-svg>
            </div>
            <div class="sort-icon cursor-pointer" @click="sortBy('createdAt')">
              <inline-svg src="/icons/upload.svg"></inline-svg>
            </div>
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
  </div>
</template>
<script setup lang="ts">
import Button from '@/components/shared/Button.vue';
import { useZkAppStore } from '@/store/zkAppModule';
import { formatAddress } from '@/utils';
import axios from 'axios';
import { storeToRefs } from 'pinia';
import { onMounted, ref } from 'vue';

import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import CopyToClipBoard from '@/components/shared/CopyToClipBoard.vue';
import PlayedGameCard from '@/components/myGames/PlayedGameCard.vue';
import MyStats from '@/components/myGames/MyStats.vue';
dayjs.extend(relativeTime);

const SERVER_URL = import.meta.env.VITE_SERVER_URL;
const { publicKeyBase58, loading } = storeToRefs(useZkAppStore());
const { cancelGame } = useZkAppStore();

const myGames = ref({
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
const limit = ref(10);
const playedAs = ref<'codeBreaker' | 'codeMaster' | undefined>(undefined);
const orderBy = ref<'createdAt' | 'rewardAmount'>('createdAt');
const sortOrder = ref<'asc' | 'desc'>('desc');

const isLoading = ref(false);
const reachedEnd = ref(false);

const sortBy = async (criteria: 'createdAt' | 'rewardAmount') => {
  currentPage.value = 1;
  orderBy.value = criteria;
  await getPlayedGames();
};
const filterByRole = async (
  role?: 'codeBreaker' | 'codeMaster' | undefined
) => {
  currentPage.value = 1;
  playedAs.value = role;
  await getPlayedGames();
};
const loadMorePlayedGames = async () => {
  if (isLoading.value || reachedEnd.value) return;

  isLoading.value = true;

  await getPlayedGames();

  const totalLoaded = myGames.value.playedGames.length;
  if (totalLoaded >= myGames.value.totalPlayedCount) {
    reachedEnd.value = true;
  }

  currentPage.value++;
  isLoading.value = false;
};
const getInitialLobbyData = async () => {
  const res = await axios.get(
    `${SERVER_URL}/games/my-games/${publicKeyBase58.value}`
  );
  if (res?.data) {
    myGames.value = {
      activeGames: res.data?.activeGames,
      playedGames: res.data?.playedGames,
      stats: res.data?.stats,
      totalPlayedCount: res.data?.totalPlayedCount,
    };
  }
};
const getPlayedGames = async () => {
  const query = new URLSearchParams({
    onlyPlayedGames: 'true',
    page: currentPage.value.toString(),
    limit: limit.value.toString(),
  });
  if (playedAs.value) query.append('playedAs', playedAs.value);
  if (orderBy.value) query.append('orderBy', orderBy.value);
  if (sortOrder.value) query.append('sortOrder', sortOrder.value);

  const res = await axios.get(
    `${SERVER_URL}/games/my-games/${publicKeyBase58.value}?${query.toString()}`
  );
  myGames.value.playedGames =
    currentPage.value === 1
      ? [...res.data?.playedGames]
      : [...myGames.value.playedGames, ...res.data?.playedGames];
  myGames.value.totalPlayedCount = res.data.totalPlayedCount;
};
const cancelGameById = async (gameId: string) => {
  const cancelTxHash = await cancelGame(gameId);
  myGames.value.activeGames = myGames?.value?.activeGames.map((e) =>
    e._id === gameId ? { ...e, cancelTransactionHash: cancelTxHash } : e
  );
};
onMounted(async () => {
  await getInitialLobbyData();
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
  border: 1px solid;
  border-image-source: linear-gradient(
    180deg,
    rgba(59, 61, 63, 0.5) 100%,
    rgba(255, 255, 255, 0.5) 100%
  );
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
  overflow: scroll;
}
.cancel-btn {
  box-shadow: 0px 2px 15px 0px $color-600 inset;
  backdrop-filter: blur(10px);
  border: 1px solid;
  border-image-source: linear-gradient(
    180deg,
    rgba(59, 61, 63, 0.5) 100%,
    rgba(255, 255, 255, 0.5) 100%
  );
}
</style>
