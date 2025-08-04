<template>
  <Modal class="w-500">
    <div class="color-snow-white">
      <div
        class="d-flex justify-content-between bg-alpha-8-300-8 radius-10 py-2 px-3 default-border mb-3 fw-700 fs-16"
      >
        <span v-if="isGameSolved"> Well Played! </span>
        <span v-else> That Was Just a Practice Run</span>

        <inline-svg src="/icons/diamond.svg"></inline-svg>
      </div>
      <div class="mt-2 fs-16²">
        <div v-if="isGameSolved">You've passed the test.</div>
        <div v-else>Don't worry, that's what practice is for.</div>
        <div class="my-3">
          Let's begin the tutorial and learn the winning strategies.
        </div>
      </div>
      <Button
        class="radius-10 w-100 color-black"
        size="large"
        @click="startOnboarding"
      >
        Go to Tutorial!</Button
      >
    </div>
  </Modal>
</template>
<script setup lang="ts">
import { useRouter } from 'vue-router';
import Modal from '../shared/Modal.vue';
import Button from '../shared/Button.vue';
defineProps({
  isGameSolved: {
    type: Boolean,
    required: true,
  },
});
const router = useRouter();
const startOnboarding = () => {
  router.push({ name: 'onboarding' });
};
</script>
<style lang="scss" scoped></style>
