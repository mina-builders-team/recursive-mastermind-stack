<template>
  <div class="mt-5 w-100">
    <div class="fs-32 fw-700 mb-3">LEADERBOARD</div>
    <div
      class="d-flex w-100 justify-content-between p-3 radius-10 color-snow-white user-rank__container"
    >
      <div>
        <div class="fs-12 fw-600">RANK</div>
        <div class="fs-21 fw-600">{{ leaderboardData?.user?.rank }}</div>
        <div class="fs-12 gray">
          {{ leaderboardData?.user?.totalScore }} Points
        </div>
      </div>
      <div>
        <div class="fs-12 fw-600">SOLVED CODES</div>
        <div class="fs-21 fw-600">
          {{ leaderboardData?.user?.winsAsCodeBreaker }}
        </div>
      </div>
      <div>
        <div class="fs-12 fw-600">UNBREAKED CODES</div>
        <div class="fs-21 fw-600">
          {{ leaderboardData?.user?.winsAsCodeMaster }}
        </div>
      </div>
      <div>
        <div class="fs-12 fw-600">CURRENT TITLE</div>
        <div class="fs-21 fw-600">
          {{ getTitleByRank(leaderboardData?.user?.rank) }}
        </div>
        <div class="fs-12 gray">
          {{ getNextTitleInfo(leaderboardData?.user?.rank)?.ranksToNext }} for
          {{ getNextTitleInfo(leaderboardData?.user?.rank)?.nextTitle }}!
        </div>
      </div>
      <div class="align-self-center">
        <ShareButton message="" hashtag="" />
      </div>
    </div>
    <div class="mt-3">
      <div
        class="d-flex justify-content-between white fw-600 ps-3 pe-4 py-3 rank-list__header"
      >
        <div class="d-flex gap-5">
          <div>RANK</div>
          <div>CODE MASTER</div>
          <div>TITLE</div>
        </div>
        <div class="d-flex gap-5">
          <div>UNBREAKEN</div>
          <div>SOLVED</div>
          <div>POINTS</div>
        </div>
      </div>
      <div v-for="(player, index) in leaderboardData.leaderboard">
        <div
          class="d-flex justify-content-between align-items-center color-snow-white py-2 px-3 player"
        >
          <div class="d-flex gap-4 align-items-center">
            <div class="tags d-flex align-items-center h-fit-content py-2 px-4">
              {{ index }}
            </div>
            <div
              class="d-flex align-items-center gap-1 px-2 py-3 tags radius-10"
            >
              <inline-svg src="/icons/person.svg"></inline-svg>
              {{ formatAddress(player._id) }}
            </div>
            <div>
              {{ getTitleByRank(index)?.title }}
            </div>
          </div>
          <div class="d-flex gap-5">
            <div class="fs-12 fw-600 d-flex justify-content-end pe-3 stat">
              {{ player.winsAsCodeMaster }}
            </div>
            <div class="fs-12 fw-600 d-flex justify-content-end pe-3 stat">
              {{ player.winsAsCodeBreaker }}
            </div>
            <div class="d-flex justify-content-end stat">
              {{ player.totalScore }} Points
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import ShareButton from '@/components/shared/ShareButton.vue';
import { useZkAppStore } from '@/store/zkAppModule';
import { formatAddress, getNextTitleInfo, getTitleByRank } from '@/utils';
import axios from 'axios';
import { storeToRefs } from 'pinia';
import { onMounted, ref } from 'vue';
const SERVER_URL = import.meta.env.VITE_SERVER_URL;
const { publicKeyBase58 } = storeToRefs(useZkAppStore());

const leaderboardData = ref({});
const isLoading = ref(false);
const reachedEnd = ref(false);
const currentPage = ref(1);
const limit = ref(10);

const getInitialLobbyData = async () => {
  const res = await axios.get(
    `${SERVER_URL}/games/leaderboard/${publicKeyBase58.value}`
  );
  if (res?.data) {
    leaderboardData.value = res?.data;
  }
};

onMounted(async () => {
  await getInitialLobbyData();
});
</script>
<style lang="scss" scoped>
.user-rank__container {
  background: $alpha-8-300-8;
  border: 1px solid rgba(59, 61, 63, 0.5);
  backdrop-filter: blur(15px);
  box-shadow: 0px 20px 40px -10px #0c0e1166;
  box-shadow: 0px 3px 41px 56px var(--ALPHA20300-20) inset;
}
.rank-list__header {
  background: $alpha-20-700-20;
  background-blend-mode: multiply;
  border: 1px solid $alpha-20-300-20;
  border-bottom-left-radius: 0px;
  border-bottom-right-radius: 0px;
}
.player {
  background: $alpha-8-300-8;
  border: 1px solid rgba(170, 170, 170, 0.1);
  backdrop-filter: blur(10px);
}
.tags {
  background: $alpha-20-700-20;
  background-blend-mode: multiply;
  border: 1px solid $alpha-20-300-20;
  border-radius: 40px;
}
.stat {
  width: 70px;
}
</style>
