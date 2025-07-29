<template>
  <div class="d-flex flex-column gap-2 game-card__container">
    <div class="d-flex gap-5">
      <div class="fw-600">{{ game?.roomName }}</div>
      <div class="d-flex align-items-center gap-1 game-status">
        <template v-if="status === 'Waiting'">
          <el-tooltip placement="bottom" effect="customized" popper-class="game-status-tooltip" >
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
      <inline-svg src="/icons/zk.svg"></inline-svg>
    </div>
    <div class="d-flex gap-1 align-items-center game-date">
      <inline-svg src="/icons/clock.svg"></inline-svg>
      <span class="fs-12">{{ createdSince }}</span>
    </div>
    <div class="d-flex align-items-center gap-2">
      <div
        class="game-reward d-flex align-items-center gap-2 fw-400 f-14 color-snow-white"
      >
        <inline-svg src="/icons/cash.svg"></inline-svg>
        {{ game.rewardAmount / 1e9 }} MINA
      </div>
      <Button class="btn-cta3 flex-1 border-alpha-50-300-50" @click="handleJoinGame">
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
  background: linear-gradient(
    180deg,
    rgba(59, 61, 63, 0.5) 0%,
    rgba(25, 27, 29, 0.5) 100%
  );
  background-blend-mode: color-dodge;
  border: 1px solid #2b2d30;
  backdrop-filter: blur(15px);

  box-shadow: 0px 20px 40px -10px #0c0e1166;
  border-radius: 10px;
}
.game-adr {
  color: rgba(255, 255, 255, 0.2);
}
.game-date {
  color: rgba(255, 255, 255, 0.2);
}
.game-reward {
  border-radius: 10px;
  padding: 5px 10px;
}
</style>
<style lang="scss">
/* .el-popper.is-customized {
  padding: 6px 12px;
  background: #27282a80 !important ;
  color: $snow-white !important;
  backdrop-filter: blur(20px);
}
.el-popper__arrow {
  height: 100%;
  transform: unset !important;
}
.game-status-tooltip.el-popper.is-customized .el-popper__arrow::before {
  content: '';
  width: 6px;
  background: #af423b;
  transform: unset;
  height: 100%;
  border-top-left-radius: 4px;
  border-bottom-left-radius: 4px;
  top: 5px;
}
 */</style>
