<template>
  <div
    class="d-flex justify-content-between align-items-center color-snow-white py-2 px-3 player"
  >
    <div class="d-flex gap-4 align-items-center">
      <div class="tags rank d-flex align-items-center justify-content-center h-fit-content py-2 px-4">
        {{ index + 1 }}
      </div>
      <div
        class="d-flex align-items-center gap-1 ms-2 me-2 px-2 py-3 tags radius-10 player-id"
      >
        <inline-svg src="/icons/person.svg"></inline-svg>
        {{ formatAddress(player._id) }}
      </div>
      <div class="player-title">
        {{ getTitleByRank(index + 1)?.title }}
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
</template>
<script lang="ts" setup>
import { formatAddress, getTitleByRank } from '@/utils';

defineProps({
  player: {
    required: true,
    type: Object,
  },
  index: {
    required: true,
    type: Number,
  },
});
</script>
<style lang="scss" scoped>
.player-id {
  width: 145px;
  display: flex;
  justify-content: center;
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
.rank {
  width: 50px;
}
.player-title {min-width: 125px;}
</style>
