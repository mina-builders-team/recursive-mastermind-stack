<template>
  <div class="d-flex justify-content-between">
    <div class="fs-21 mb-4">
      <div class="color-gray michroma fs-15 letter-spacing-3">WELCOME</div>
      <span
        class="fs-21 michroma color-snow-white letter-spacing-3"
        v-if="userRole === 'CODE_BREAKER'"
        >Code Breaker</span
      >
      <span
        class="fs-21 michroma color-snow-white letter-spacing-3"
        v-else-if="userRole === 'CODE_MASTER'"
        >Code Master</span
      >
    </div>
    <div class="d-flex align-items-center gap-2 me-5 cursor-pointer">
      <el-tooltip
        placement="bottom"
        effect="customized"
        popper-class="server-status"
      >
        <template #content>
          <div>
            <div class="fs-12">
              <span v-if="!isPlayingOnChain">
                You are playing this game on a server without compromising
                decentralization or privacy!
              </span>
              <span v-else> You are playing on mainnet! </span>
            </div>
          </div>
        </template>
        <div class="d-flex align-items-center gap-2">
          <div class="online bg-green"></div>
          <span v-if="!isPlayingOnChain">Server</span>
          <span v-else>Mainnet</span>
        </div>
      </el-tooltip>
    </div>
  </div>
  <div class="d-flex gap-5 align-items-center">
    <div
      class="black-game-reward border-alpha-20-300-20 d-flex align-items-center gap-2 fw-400 f-14 color-snow-white p-2 fit-content"
    >
      <inline-svg src="/icons/cash.svg"></inline-svg>
      {{ rewardAmount / 1e9 }} MINA
    </div>
    <div class="d-flex gap-2">
      <RoundedColor
        :editable="false"
        v-for="code in secret"
        :value="code.value"
      />
    </div>
  </div>
</template>
<script setup lang="ts">
import RoundedColor from './RoundedColor.vue';

const props = defineProps({
  rewardAmount: {
    type: Number,
    required: false,
    default: 10 * 1e9,
  },
  userRole: {
    type: String,
    required: false,
    default: 'CODE_BREAKER',
  },
  secret: {
    required: true,
    type: Object,
  },
  isPlayingOnChain: {
    required: false,
    type: Boolean,
    default: false,
  },
});
</script>
<style lang="scss" scoped>
.online {
  width: 5px;
  height: 5px;
  border-radius: 50%;
}
</style>
<style lang="scss">
.server-status.el-popper.is-customized {
  width: 180px;
}
.server-status.el-popper.is-customized .el-popper__arrow::before {
  top: 5px;
}
</style>
