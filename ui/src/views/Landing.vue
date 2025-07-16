<template>
  <div class="snow-white d-flex justify-content-between">
    <div>
      <div class="fw-600 fs-21">Double or lose game for master minds</div>
      <div class="fs-30 fw-700">Proof-Powered Puzzles</div>
      <div class="my-3 fs-16">Put MINA on the table. Beat the code.</div>
      <div class="my-3 fs-16">Keep the whole pot.</div>
      <Button class="my-2"> Play Now</Button>
      <div class="d-flex gap-2 my-3">
        <div>ZKP</div>
        <div>RECURSIVE</div>
      </div>
    </div>
    <LandingBoard />
  </div>
</template>
<script setup lang="ts">
import LandingBoard from '@/components/landingPage/landingBoard.vue';

</script>
<style lang="scss" scoped></style>
