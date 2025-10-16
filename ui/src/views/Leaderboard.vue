<template>
  <div class="mt-5 w-100">
    <div class="fs-32 fw-700 mb-3">
      <span v-if="tournamentName">{{ tournamentName }}</span>
      <span v-else>Leaderboard</span>
    </div>
    <div
      v-if="leaderboardData?.user"
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
        <div class="fs-21 fw-600" v-if="leaderboardData?.user?.rank">
          {{ getTitleByRank(leaderboardData.user.rank)?.title }}
        </div>
        <div
          class="fs-12 gray"
          v-if="
            leaderboardData?.user?.rank &&
            getNextTitleInfo(leaderboardData.user.rank)?.ranksToNext
          "
        >
          {{ getNextTitleInfo(leaderboardData?.user?.rank)?.ranksToNext }} for
          {{ getNextTitleInfo(leaderboardData?.user?.rank)?.nextTitle }}!
        </div>
      </div>
      <div class="align-self-center">
        <ShareButton
          :message="tweet.message"
          :hashtag="tweet.hashtag"
          btnClass=" btn-cta3  default-border color-snow-white"
        />
      </div>
    </div>
    <div class="mt-3">
      <div
        class="d-flex justify-content-between white fw-600 ps-3 pe-4 py-3 rank-list__header"
      >
        <div class="d-flex gap-5">
          <div>RANK</div>
          <div class="me-4">CODE MASTER</div>
          <div class="title">TITLE</div>
        </div>
        <div class="d-flex gap-5">
          <div>UNBREAKEN</div>
          <div>SOLVED</div>
          <div>POINTS</div>
        </div>
      </div>
      <div
        class="infinite-list"
        v-infinite-scroll="loadMorePlayer"
        :infinite-scroll-disabled="isLoading || reachedEnd"
        :infinite-scroll-immediate="false"
        :infinite-scroll-distance="40"
      >
        <div v-for="(player, index) in leaderboardData?.players">
          <PlayerCard
            :player="
              tournamentName && player.tournaments
                ? { ...player, ...player.tournaments }
                : player
            "
            :index="index"
          />
        </div>
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import PlayerCard from '@/components/leaderboard/PlayerCard.vue';
import ShareButton from '@/components/shared/ShareButton.vue';
import { useZkAppStore } from '@/store/zkAppModule';
import { Player } from '@/types';
import { getNextTitleInfo, getTitleByRank } from '@/utils';
import axios from 'axios';
import { storeToRefs } from 'pinia';
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
const SERVER_URL = import.meta.env.VITE_SERVER_URL;
const { publicKeyBase58 } = storeToRefs(useZkAppStore());
const route = useRoute();
const tournamentName = route?.params?.name;
const leaderboardData = ref<{
  user: Player & { rank: number };
  players: Array<Player>;
  totalPlayers: number;
}>({
  user: {} as Player & { rank: number },
  players: [],
  totalPlayers: 0,
});
const isLoading = ref(false);
const reachedEnd = ref(false);
const currentPage = ref(1);
const limit = ref(7);

const loadMorePlayer = async () => {
  if (isLoading.value || reachedEnd.value) return;
  isLoading.value = true;
  await getPlayers(true);
  const totalLoaded = leaderboardData.value!.players.length;
  if (totalLoaded >= leaderboardData.value!.totalPlayers) {
    reachedEnd.value = true;
  }
  currentPage.value++;
  isLoading.value = false;
};

const apiUrl = tournamentName
  ? `${SERVER_URL}/player/leaderboard/tournament/${tournamentName}/${publicKeyBase58.value}`
  : `${SERVER_URL}/player/leaderboard/${publicKeyBase58.value}`;
const getPlayers = async (onlyPlayers?: boolean) => {
  const query = new URLSearchParams({
    onlyPlayers: onlyPlayers ? 'true' : 'false',
    page: currentPage.value.toString(),
    limit: limit.value.toString(),
  });
  const res = await axios.get(`${apiUrl}?${query.toString()}`);
  if (res?.data) {
    if (onlyPlayers) {
      leaderboardData.value.players =
        currentPage.value === 1
          ? [...res.data?.players]
          : [...leaderboardData.value.players, ...res.data?.players];
      leaderboardData.value.totalPlayers = res.data.totalPlayers;
    } else {
      leaderboardData.value = res.data;
    }
  }
};
const tweet = computed(() => {
  return {
    message: `📊 Just checked my ${tournamentName ? tournamentName : ' Mastermind leaderboard '} stats on @MinaProtocol:
🏅 Rank: ${leaderboardData.value?.user?.rank}
🎖️ Title: ${getTitleByRank(leaderboardData.value?.user?.rank)?.title}
🧠 Solved Codes: ${leaderboardData.value?.user?.winsAsCodeBreaker}
🛡️ Unbreaked Codes: ${leaderboardData.value?.user?.winsAsCodeMaster}
💯 Score: ${leaderboardData.value?.user?.totalScore} pts
Climb the ranks & earn with zk!
Play now 👉 https://www.minamastermind.com`,
    hashtag: 'zkApps ,MinaProtocol ,Web3Gaming',
  };
});
onMounted(async () => {
  await getPlayers();
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
.infinite-list {
  overflow-y: scroll;
  height: calc(80vh - 200px);
}
.title {
  min-width: 125px;
}
</style>
