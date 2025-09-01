<template>
  <div class="w-205">
    <div
      class="d-flex flex-column gap-2 bg-alpha-20-700-20 border-alpha-50-300-50 fit-content h-fit-content py-2 ps-2 pe-4 radius-4 w-100 stat-container"
    >
      <div class="d-flex gap-2">
        <div
          class="bg-alpha-8-300-8 border-alpha-50-300-50 d-flex radius-10 p-10 px-3 align-items-center justify-content-center color-snow-white"
        >
          <inline-svg src="/icons/cash.svg"></inline-svg>
        </div>
        <div>
          <div class="fw-600 fs-12">Net Rewards</div>
          <div class="color-green fw-600 fs-21">
            {{ stats?.balance / 1e9 }} MINA
          </div>
        </div>
      </div>
      <div class="d-flex gap-2">
        <div
          class="bg-alpha-8-300-8 border-alpha-50-300-50 d-flex radius-10 p-10 px-3 align-items-center justify-content-center color-snow-white"
        >
          <inline-svg src="/icons/cash.svg"></inline-svg>
        </div>
        <div>
          <div class="fw-600 fs-12">CodeBreaker</div>
          <div class="fw-600 fs-21">{{ stats?.winsAsCodeBreaker }} WIN</div>
        </div>
      </div>
      <div class="d-flex gap-2">
        <div
          class="bg-alpha-8-300-8 border-alpha-50-300-50 d-flex radius-10 p-10 px-3 align-items-center justify-content-center color-snow-white"
        >
          <inline-svg src="/icons/cash.svg"></inline-svg>
        </div>
        <div>
          <div class="fw-600 fs-12">CodeMaster</div>
          <div class="fw-600 fs-21">{{ stats?.winsAsCodeMaster }} WIN</div>
        </div>
      </div>
      <div class="d-flex gap-2 mb-3">
        <div
          class="bg-alpha-8-300-8 border-alpha-50-300-50 d-flex radius-10 p-10 px-3 align-items-center justify-content-center color-snow-white"
        >
          <inline-svg src="/icons/cash.svg"></inline-svg>
        </div>
        <div>
          <div class="fw-600 fs-12">Total Games</div>
          <div class="fw-600 fs-21">{{ stats?.totalPlayed }}</div>
        </div>
      </div>
      <ShareButton
        :message="tweet.message"
        :hashtag="tweet.hashtag"
        btnClass="fw-400 fs-14 btn-cta3  default-border color-snow-white "
      />
    </div>
    <div class="d-flex gap-2 flex-wrap w-100 mt-4 cursor-pointer">
      <el-tooltip
        v-for="badge in BADGES"
        placement="top"
        effect="customized"
        popper-class="badge-tooltip"
      >
        <template #content>
          <div>{{ badge.name }}</div>
        </template>
        <div
          :class="[
            'border-alpha-50-300-50',
            userHasBadge(badge.name) ? 'has-badge' : 'missing-badge',
          ]"
        >
          <inline-svg :src="badge.icon"> </inline-svg>
        </div>
      </el-tooltip>
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed } from 'vue';
import ShareButton from '../shared/ShareButton.vue';
import { BADGES } from '@/constants/badges';
const props = defineProps({
  stats: {
    required: true,
    type: Object,
  },
});
const tweet = computed(() => {
  return {
    message: `🔥 My Mastermind zkApp Stats on @MinaProtocol 🔐
🎯 Total Games: ${props.stats?.totalPlayed}
🧠 Code Breaker Wins: ${props.stats?.winsAsCodeBreaker}
🛡️ Code Master Wins: ${props.stats?.winsAsCodeMaster}
💰 Net Rewards: ${props.stats?.balance / 1e9} MINA

Play, strategize, and earn on-chain with zk tech!
Join the challenge → https://www.minamastermind.com
`,
    hashtag: 'MinaProtocol ,Web3Gaming ,CryptoGaming',
  };
});
const userHasBadge = (badgeName: string) => {
  return props.stats?.badges?.includes(badgeName) || false;
};
</script>
<style lang="scss" scoped>
.has-badge {
  background: linear-gradient(
    180deg,
    rgba(59, 61, 63, 0.5) 100%,
    rgba(255, 255, 255, 0.5) 100%
  );
  background-blend-mode: screen;
  padding: 10px;
  border-radius: 10px;
}
.missing-badge {
  background: $alpha-20-700-20;
  background-blend-mode: multiply;
  padding: 10px;
  border-radius: 10px;
  color: $gray;
}
.stat-container {
  backdrop-filter: blur(15px);
  box-shadow: 0px 3px 41px 56px $alpha-20-300-20 inset;
}
</style>

<style lang="scss">
.badge-tooltip.el-popper.is-customized {
  width: 120px;
}
.badge-tooltip.el-popper.is-customized .el-popper__arrow::before {
  content: '';
  bottom: 5px;
}
</style>
