<template>
  <div
    class="snow-white d-flex justify-content-between mt-5 align-items-center"
  >
    <div>
      <div class="fw-600 fs-21">Double or lose game for master minds</div>
      <div class="fs-30 fw-700">Proof-Powered Puzzles</div>
      <div class="my-3 fs-16">Put MINA on the table. Beat the code.</div>
      <div class="my-3 fs-16">Keep the whole pot.</div>
      <Button class="my-2 button-4 px-5" size="large"> Play Now</Button>
      <div class="d-flex gap-2 my-3">
        <div class="tags fs-16">ZKP</div>

        <div class="tags fs-16">RECURSIVE</div>
      </div>
    </div>
    <LandingBoard />
  </div>
</template>
<script setup lang="ts">
import LandingBoard from '@/components/landingPage/landingBoard.vue';
import Button from '@/components/shared/Button.vue';
</script>
<style lang="scss" scoped>
.tags {
  backdrop-filter: blur(30px);
  box-shadow: 0px 2px 4px 0px #0000001a;
  border: 1px dashed rgba(59, 61, 63, 0.5);
  padding: 10px 10px;
  background: $alpha-8-300-8;

}
</style>
