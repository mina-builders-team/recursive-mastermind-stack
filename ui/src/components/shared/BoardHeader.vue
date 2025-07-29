<template>
  <div class="fs-21 mb-4">
    <div class="color-gray fs-14">Welcome</div>
    <span v-if="userRole === 'CODE_BREAKER'">Code Breaker</span>
    <span v-else-if="userRole === 'CODE_MASTER'">Code Master</span>
  </div>
  <div class="d-flex gap-5">
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
});
</script>
<style lang="scss" scoped></style>