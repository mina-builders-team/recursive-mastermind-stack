<template>
  <div class="banner-container p-2 radius-10 d-flex justify-content-center">
    <div>
      <span class="fw-600 me-1">🏆 {{ tournamentNAME }} 🏆 is live!</span>
      <span>Compete until <strong>{{tournamentEnd}}</strong></span>
      <span class="fs-16">🎁 Win {{ maxPrize }} MINA !</span>
      <span
        class="action-btn ms-1 fw-600 cursor-pointer"
        @click="redirectToLeaderboard"
      >
        See Leaderboard
      </span>
    </div>
  </div>
</template>
<script setup lang="ts">
import { useRouter } from 'vue-router';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
dayjs.extend(utc);
const tournamentEnd = dayjs.utc(import.meta.env.VITE_TOURNAMENT_END).format('MMMM D, YYYY HH:mm [UTC]');
const tournamentNAME = import.meta.env.VITE_TOURNAMENT_NAME;
const maxPrize = import.meta.env.VITE_TOURNAMENT_MAX_PRIZE;
const router = useRouter();
const redirectToLeaderboard = () => {
  router.push({
    name: 'tournamentRank',
    params: { name: tournamentNAME },
  });
};
</script>
<style lang="scss" scoped>
.banner-container {
  background: rgba(59, 61, 63, 0.08);
  border: 1px solid #2f3135;
  backdrop-filter: blur(10px);
  position: fixed;
  top: 10px;
  left: 10px;
  width: 99%;
}
.action-btn {
  text-decoration: underline;
}
.marquee {
  animation: scroll-left 10s linear infinite;
  padding-right: 2rem;
}

@keyframes scroll-left {
  0% {
    transform: translateX(0%);
  }
  100% {
    transform: translateX(100%);
  }
}
</style>
