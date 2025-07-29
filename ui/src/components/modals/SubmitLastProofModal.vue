<template>
  <Modal class="w-450">
    <div class="color-snow-white d-flex flex-column gap-3">
      <div class="fw-700 fs-24">Playing On Mainnet</div>
      <div class="fs-12 mt-4">
        Since server has down, instead of playing game on your browser with ZKP
        security & privacy you will play the game on Mainnet!
      </div>
      <div class="d-flex w-100 justify-content-between">
        <div
          class="bg-8-300-8 border-alpha-50-300-50 radius-12 p-10 d-flex align-items-center gap-3"
        >
          <div class="bg-green rounded"></div>
          <div>
            <div class="fs-16">Safe Area</div>
            <div class="fs-16">You Have 3 min for play.</div>
          </div>
        </div>
        <div
          class="bg-8-300-8 border-alpha-50-300-50 radius-12 p-10 d-flex align-items-center gap-3"
        >
          <div class="bg-yellow rounded"></div>
          <div>
            <div class="fs-16">Validator Approval</div>
            <div class="fs-16">May Take 3min.</div>
          </div>
        </div>
      </div>
      <div class="d-flex gap-2 align-items-center">
        <inline-svg src="/icons/alarm.svg"></inline-svg>
        <div>Safe Move Area: 3 Minute Move Period.</div>
      </div>
      <div class="d-flex gap-2 align-items-center">
        <inline-svg src="/icons/key.svg"></inline-svg>
        <div>All the actions are on-chain!</div>
      </div>
      <Button
        v-if="!submitGameTransactionHash"
        class="w-100 radius-10"
        size="large"
        @click="submitLastProof"
        :loading="loading"
      >
        <span class="color-black fw-600 fs-16"
          >Click to Submit Your Last Proof</span
        >
      </Button>
      <div v-else class="w-100">
        <div
          class="d-flex align-items-center justify-content-center w-100 mt-3 mb-4"
        >
          Game Should Have Starts on
          <Timer
            :duration="MINA_APPROX_SLOT_DURATION"
            :startTimestamp="timerStartTime"
            customClass="ms-1 p-0 bg-transaprent"
            :key="timerStartTime"
          />
          .
          <div class="ms-1 d-flex">
            Check
            <span class="ms-1 text-underline"
              ><a
                class="link d-flex gap-1 align-items-center"
                :href="`https://minascan.io/devnet/tx/${submitGameTransactionHash}?type=zk-tx`"
                target="_blank"
                rel="noopener noreferrer"
                >transaction.</a
              ></span
            >
          </div>
        </div>
        <Button
          class="bg-pink-2 border-alpha-50-300-50 w-100 radius-8"
          size="large"
          @click="submitLastProof"
          :loading="loading"
        >
          <span class="color-snow-white fw-600 fs-16">Resend Again</span>
        </Button>
      </div>
    </div>
  </Modal>
</template>
<script setup lang="ts">
import { useZkAppStore } from '@/store/zkAppModule';
import Button from '../shared/Button.vue';
import Modal from '../shared/Modal.vue';
import { useCustomMessage } from '@/composables/useCustomMessage';
import { getStoredGame } from '@/utils';
import { storeToRefs } from 'pinia';
import Timer from '../shared/Timer.vue';
import { ref } from 'vue';
const { submitGameProof } = useZkAppStore();
const {
  error,
  loading,
  submitGameTransactionHash,
  zkAppAddress,
} = storeToRefs(useZkAppStore());
const { showMessage } = useCustomMessage();
const MINA_APPROX_SLOT_DURATION = Number(
  import.meta.env.VITE_MINA_APPROX_SLOT_DURATION
);
const timerStartTime = ref(Date.now());

const submitLastProof = async () => {
  const game: any = getStoredGame(zkAppAddress.value as string);
  const proof = game?.lastProof;
  if (proof) {
    await submitGameProof(proof);
    timerStartTime.value = Date.now();
    if (error.value) {
      showMessage({
        type: 'error',
        duration: 6000,
        title: 'Error!',
        description: error.value,
      });
    }
  } else {
    showMessage({
      type: 'error',
      duration: 6000,
      title: 'Error!',
      description: 'Proof is not available',
    });
  }
};

</script>
<style lang="scss" scoped>
.rounded {
  width: 11px;
  height: 11px;
  border-radius: 50%;
}
</style>
