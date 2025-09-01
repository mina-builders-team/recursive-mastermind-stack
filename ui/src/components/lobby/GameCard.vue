<template>
  <div class="d-flex flex-column gap-2 game-card__container w-100">
    <div class="d-flex justify-content-between">
      <div class="fw-600">{{ game?.roomName }}</div>
      <div class="d-flex align-items-center gap-1 game-status">
        <template v-if="status === 'Waiting'">
          <el-tooltip
            placement="bottom"
            effect="customized"
            popper-class="game-status-tooltip"
          >
            <template #content>
              <div class="fw-600">Game May Starts Soon</div>
              <div class="fs-12">Please look another game</div>
            </template>
            <div class="d-flex align-items-center gap-1 cursor-pointer">
              <div class="status waiting"></div>
              <span class="color-gray fs-14">Waiting</span>
            </div>
          </el-tooltip>
        </template>
        <template v-else>
          <div class="status available"></div>
          <span class="color-gray fs-14">Available</span>
        </template>
      </div>
    </div>
    <div class="d-flex align-items-center justify-content-between">
      <div class="fs-12 game-adr">ID: {{ formatAddress(game?._id) }}</div>
    </div>
    <div class="d-flex gap-1 align-items-center game-date">
      <inline-svg src="/icons/clock.svg"></inline-svg>
      <span class="fs-12">{{ createdSince }}</span>
    </div>
    <div class="d-flex align-items-center gap-2">
      <div
        class="game-reward bg-alpha-20-700-20 border-alpha-20-300-20 d-flex align-items-center gap-2 fw-400 color-snow-white blend-multiply"
      >
        <inline-svg src="/icons/cash.svg"></inline-svg>
        {{ game.rewardAmount / 1e9 }} MINA
      </div>
      <Button
        class="btn-cta3 flex-1 border-alpha-50-300-50 join-btn"
        @click="handleJoinGame"
        size="large"
      >
        <span class="color-snow-white">Join</span>
      </Button>
    </div>
  </div>
</template>
<script setup lang="ts">
import Button from '@/components/shared/Button.vue';
import { formatAddress } from '@/utils';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useRouter } from 'vue-router';
dayjs.extend(relativeTime);

const props = defineProps({
  game: {
    type: Object,
    required: true,
  },
});
const router = useRouter();
const status =
  props.game?.lastAcceptTimestamp &&
  props.game?.lastAcceptTimestamp - Date.now() < 4 * 60 * 1000
    ? 'Waiting'
    : 'Available';
const createdSince = dayjs(props.game.createdAt).fromNow();
const handleJoinGame = () => {
  router.push({
    name: 'gameplay',
    params: {
      id: props.game._id,
    },
  });
};
</script>
<style lang="scss" scoped>
@import '@/style';
.status {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}
.available {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #5bc56b;
}
.waiting {
  background-color: #ffd60a;
}
.game-card__container {
  padding: 20px 18px;
  border-radius: 10px;
  border: 1px solid rgba(59, 61, 63, 0.5);
  background-blend-mode: color-dodge;
  box-shadow: 0 3px 41px 20px $alpha-20-300-20 inset;
  filter: drop-shadow(0 20px 40px rgba(12, 14, 17, 0.4));
  backdrop-filter: blur(7.5px);
}
.game-adr {
  color: rgba(255, 255, 255, 0.2);
}
.game-date {
  color: rgba(255, 255, 255, 0.2);
}
.game-reward {
  border-radius: 10px;
  padding: 9px;
}
.join-btn {
  border-radius: 10px;
  border: 1px solid rgba(59, 61, 63, 0.5);
  background: linear-gradient(
    180deg,
    $alpha-50-300-50 0%,
    $alpha-50-700-50 100%
  );
  background-blend-mode: color-dodge;

  /* Button/Normal */
  box-shadow: 0 2px 15px 0 $color-600 inset;
  backdrop-filter: blur(5px);
}
</style>
<style lang="scss">
.game-status-tooltip.el-popper.is-customized {
  width: 180px;
}
.game-status-tooltip.el-popper.is-customized .el-popper__arrow::before {
  background: #af423b;
  top: 5px;
}
</style>
