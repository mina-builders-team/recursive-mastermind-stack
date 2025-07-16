<template>
  <div class="default-border radius-10 bg-alpha-50-900-50 p-20 snow-white">
    <div class="fw-700 fs-24">One Last Thing!</div>
    <div class="fs-12 my-4">
      Thanks to Mina's ZK technology, you can play a secure, private, provably
      fair blockchain game right here in your browser.
    </div>
    <div class="fs-12 my-4">
      To make this privacy possible, your browser does some heavy lifting in the
      background. This "proof generation" process can take a few seconds.
    </div>
    <div v-if="benchmark">
      <div class="d-flex gap-2 w-100">
        <div class="c-idle radius-10 gray p-2 w-50">
          Create Game Transaction: ~ {{ benchmark?.initGameTxDuration }}s
        </div>
        <div class="c-idle radius-10 gray p-2 w-50">
          Create Game Proof: ~ {{ benchmark?.createGameProofDuration }}s
        </div>
      </div>
      <div class="d-flex mt-2 gap-2">
        <div class="c-idle radius-10 gray p-2 w-50">
          Make Guess Proof: ~ {{ benchmark?.guessProofDuration }}s
        </div>
        <div class="c-idle radius-10 gray p-2 w-50">
          Give Clue Proof: ~ {{ benchmark?.clueProofDuration }}s
        </div>
      </div>
      <div class="radius-10 my-4 info-container">
        <div class="fw-600">The good news?</div>
        <div class="fs-14">
          Your browser can securely handle these proofs in about 10 seconds!
          Have fun!
        </div>
      </div>
    </div>
    <div v-else class="d-flex align-items-end gap-2">
      <span>Please wait while we generate your performance report</span>  
      <DotsLoader />
    </div>
    <Button size="large" class="cta-2 radius-10 me-4"> Back to Home </Button>
    <Button size="large" class="cta-1 radius-10 px-5" @click="handleNextStep">
      <inline-svg src="/icons/rocket.svg" class="me-2"></inline-svg>
      Next
    </Button>
  </div>
</template>
<script setup lang="ts">
import { useZkAppStore } from '@/store/zkAppModule';
import { storeToRefs } from 'pinia';
import Button from '@/components/shared/Button.vue';
import DotsLoader from '@/components/shared/DotsLoader.vue';

const { benchmark } = storeToRefs(useZkAppStore());
const emit = defineEmits(['next']);
const handleNextStep = () => {
  emit('next');
};
</script>
<style lang="scss" scoped></style>
