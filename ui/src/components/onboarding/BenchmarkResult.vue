<template>
  <div
    class="default-border radius-10 bg-alpha-50-900-50 p-20 color-snow-white w-520"
  >
    <div class="fw-700 fs-24">One Last Thing!</div>
    <div class="fs-12 my-4">
      Thanks to Mina's ZK technology, you can play a
      <span class="color-green">secure</span>,
      <span class="color-green">private</span>,
      <span class="color-green">provably</span> fair blockchain game right here
      <span class="color-green">in your browser.</span>
    </div>
    <div class="fs-12 my-4">
      To make this privacy possible, your browser does some heavy lifting in the
      background. This "proof generation" process can take a few seconds.
    </div>
    <div v-if="userBenchmark">
      <div class="d-flex gap-2 w-100">
        <div class="bg-800 border-alpha-50-300-50 radius-4 color-gray p-2 w-50">
          Create Game Transaction: ~ {{ userBenchmark?.initGameTxDuration }}s
        </div>
        <div class="bg-800 border-alpha-50-300-50 radius-4 color-gray p-2 w-50">
          Create Game Proof: ~ {{ userBenchmark?.createGameProofDuration }}s
        </div>
      </div>
      <div class="d-flex mt-2 gap-2">
        <div class="bg-800 border-alpha-50-300-50 radius-4 color-gray p-2 w-50">
          Make Guess Proof: ~ {{ userBenchmark?.guessProofDuration }}s
        </div>
        <div class="bg-800 border-alpha-50-300-50 radius-4 color-gray p-2 w-50">
          Give Clue Proof: ~ {{ userBenchmark?.clueProofDuration }}s
        </div>
      </div>
      <div
        class="my-4 info-container"
        v-if="averageBenchmark && averageBenchmark < 35"
      >
        <div class="fw-700">The good news?</div>
        <div class="fw-400">
          Your browser can securely handle these proofs in about
          {{ averageBenchmark }}
          seconds! Have fun!
        </div>
      </div>
      <div class="my-4 info-container" v-else>
        <div class="fw-700">OUPS!</div>
        <div class="fw-400">
          Your browser can securely handle these proofs in approximately
          {{ averageBenchmark }} seconds. Unfortunately, this isn't fast enough
          for fair gameplay. We recommend using a different computer for a
          better experience.
        </div>
      </div>
    </div>
    <div v-else class="d-flex align-items-end gap-2 my-4">
      <span>Please wait while we generate your performance report</span>
      <DotsLoader />
    </div>
    <div class="d-flex">
      <Button
        size="large"
        class="bg-alpha-8-300-8 border-alpha-50-300-50 color-snow-white radius-10 me-4 p-4"
        @click="backToHome"
      >
        Back to Home
      </Button>
      <Button
        size="large"
        class="radius-10 py-4 flex-1 color-black"
        @click="handleNextStep"
      >
        <inline-svg src="/icons/rocket.svg" class="me-2"></inline-svg>
        Next
      </Button>
    </div>
  </div>
</template>
<script setup lang="ts">
import { useZkAppStore } from '@/store/zkAppModule';
import { storeToRefs } from 'pinia';
import Button from '@/components/shared/Button.vue';
import DotsLoader from '@/components/shared/DotsLoader.vue';
import { useRouter } from 'vue-router';
import { computed } from 'vue';

const { benchmark } = storeToRefs(useZkAppStore());
const emit = defineEmits(['next']);
const router = useRouter();

const userBenchmark = computed(() => {
  const storedBenchmark = localStorage.getItem('benchmark');
  if (storedBenchmark) {
    return JSON.parse(storedBenchmark);
  }
  return benchmark.value;
});

const averageBenchmark = computed(() => {
  if (userBenchmark.value) {
    return Math.ceil(
      (Number(userBenchmark.value?.initGameTxDuration) +
        Number(userBenchmark.value?.clueProofDuration) +
        Number(userBenchmark.value?.guessProofDuration) +
        Number(userBenchmark.value?.createGameProofDuration)) /
        4
    );
  }
  return 0;
});
const handleNextStep = () => {
  emit('next');
};
const backToHome = () => {
  router.push({ name: 'home' });
};
</script>
<style lang="scss" scoped></style>
