<template>
  <div
    class="color-snow-white d-flex justify-content-between mt-5 align-items-center"
  >
    <div>
      <div class="fw-600 fs-20">Double or lose game for master minds</div>
      <div class="fs-30 fw-700">Proof-Powered Puzzles</div>
      <div class="my-3 fs-16">Put MINA on the table. Beat the code.</div>
      <div class="my-3 fs-16">Keep the whole pot.</div>
      <Button class="my-2 btn-cta3 px-5" size="large" @click="redirectToLobby">
        <span class="color-color-snow-white"> Play Now </span>
      </Button>
      <div class="d-flex gap-2 my-3">
        <div class="p-10 fs-16 tags">ZKP</div>

        <div class="p-10 fs-16 tags">RECURSIVE</div>
      </div>
    </div>
    <LandingBoard @ended="handleGameEnded" />
  </div>
  <Modal v-if="isGameEnded" class="w-500">
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
import LandingBoard from '@/components/landingPage/landingBoard.vue';
import Button from '@/components/shared/Button.vue';
import { useRouter } from 'vue-router';
import Modal from '@/components/shared/Modal.vue';
import { ref } from 'vue';
const router = useRouter();

const isGameSolved = ref(false);
const isGameEnded = ref(false);

const handleGameEnded = (isSolved: boolean) => {
  isGameEnded.value = true;
  isGameSolved.value = isSolved;
};
const redirectToLobby = () => {
  router.push({ name: 'lobby' });
};
const startOnboarding = () => {
  router.push({ name: 'onboarding' });
};
</script>
<style lang="scss" scoped>
.tags {
  backdrop-filter: blur(30px);
  box-shadow: 0px 2px 4px 0px #0000001a;
  border: 1px dashed rgba(59, 61, 63, 0.5);
}
</style>
