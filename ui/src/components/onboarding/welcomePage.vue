<template>
  <div
    class="default-border radius-10 bg-alpha-50-900-50 p-20 color-snow-white mt-5 w-400"
  >
    <div class="fw-700 fs-24 text-center">Welcome to Mastermind on Mina!</div>
    <div class="fs-14 color-snow-white">
      <div class="mt-3">This isn't standard Mastermind.</div>
      <div class="mt-4">
        This is where strategy meets privacy, powered by ZK. We'll make you an
        expert codebreaker in just 3 simple steps.
      </div>
      <div class="mt-4">No waiting. Just learning, then winning.</div>
    </div>
    <div class="w-100 d-flex justify-content-center mt-4">
      <Button
        size="large"
        class="color-black radius-10 px-5 w-100 mx-3 mt-2"
        @click="handleNextStep"
      >
        <inline-svg src="/icons/rocket.svg" class="me-2"></inline-svg>
        <span class="fs-14 fw-400">Enter the Journey!</span>
      </Button>
    </div>
  </div>
</template>
<script lang="ts" setup>
import Button from '../shared/Button.vue';

const emit = defineEmits(['next']);
const handleNextStep = () => {
  emit('next');
};
</script>
<style lang="scss" scoped></style>
