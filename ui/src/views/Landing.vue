<template>
  <div
    class="color-snow-white d-flex justify-content-between mt-5 pt-2 align-items-center"
  >
    <div>
      <div class="fw-600 fs-20">Double or Lose game for Masterminds</div>
      <div class="fs-30 fw-700">Proof-Powered Puzzles</div>
      <div class="my-3 fs-16">Put MINA on the table. Beat the code.</div>
      <div class="my-3 fs-16">Keep the whole pot.</div>
      <Button
        class="my-2 btn-cta3 border-alpha-50-300-50 px-5"
        size="large"
        @click="redirectToLobby"
      >
        <span class="color-snow-white"> Play Now </span>
      </Button>
      <div class="d-flex gap-2 my-3">
        <div class="p-10 fs-16 tags">ZKP</div>

        <div class="p-10 fs-16 tags">RECURSIVE</div>
      </div>
    </div>
    <LandingBoard @ended="handleGameEnded" />
  </div>
  <LandingGameResultModal :isGameSolved="isGameSolved" v-if="isGameEnded" />
</template>
<script setup lang="ts">
import LandingBoard from '@/components/landingPage/landingBoard.vue';
import Button from '@/components/shared/Button.vue';
import { useRouter } from 'vue-router';
import { ref } from 'vue';
import LandingGameResultModal from '@/components/modals/LandingGameResultModal.vue';
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
</script>
<style lang="scss" scoped>
.tags {
  backdrop-filter: blur(30px);
  box-shadow: 0px 2px 4px 0px #0000001a;
  border: 1px dashed rgba(59, 61, 63, 0.5);
}
</style>
