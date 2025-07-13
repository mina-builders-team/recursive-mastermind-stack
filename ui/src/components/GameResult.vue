<template>
  <div
    class="radius-20 p-20 bg-alpha-8-300-8 default-border d-flex flex-column align-items-center gap-3"
  >
    <div class="radius-10 p-20 default-border bg-alpha-8-300-8">
      <inline-svg v-if="isWinner" src="/icons/trophy.svg"></inline-svg>
      <inline-svg v-else src="/icons/bug.svg"></inline-svg>
    </div>
    <div class="fw-600 fs-20 snow-white">
      <span v-if="isBreakerWinner">Excellent! You Broke The Code!</span>
      <span v-if="isBreakerLoser">You Were Almost There!</span>
      <span v-if="isMasterLoser">Code Cracked!</span>
      <span v-if="isMasterWinner">Code Defended!</span>
    </div>
    <div class="fs-12">
      <span v-if="isBreakerWinner">You used excellent logic!</span>
      <span v-if="isBreakerLoser">Too Bad! The Code Remained Unbroken!</span>
      <span v-if="isMasterLoser"
        >Your opponent was clever and broke your secret code!</span
      >
      <span v-if="isMasterWinner"
        >Your secret code stood strong—no one cracked it!</span
      >
    </div>
    <div
      class="radius-10 default-border bg-alpha-8-300-8 p-2 pb-3 d-flex flex-column align-items-center gap-3 snow-white w-100"
    >
      <div class="fw-600">
        <span v-if="isWinner"> Your reward is on the way! </span>
        <span v-else> Your opponent will receive </span>
      </div>
      <div class="d-flex align-items-center justify-content-center w-100 gap-3">
        <div class="p-5-10 radius-10 default-border bg-alpha-20-300-20">
          <inline-svg src="/icons/cash.svg"></inline-svg>
          {{ gameReward / 1e9 }} MINA
        </div>
        <inline-svg src="/icons/arrow-right-from-line.svg"></inline-svg>
        <div
          class="p-5-10 radius-10 default-border bg-alpha-20-300-20 d-flex align-items-center justify-content-start gap-4"
        >
          <inline-svg src="/icons/person.svg"></inline-svg>
          <span v-if="isWinner">You</span>
          <span v-else-if="userRole === 'CODE_MASTER'">{{
            formatAddress(codeBreakerPubKeyBase58)
          }}</span>
          <span v-else="">{{ formatAddress(codeMasterPubKeyBase58) }}</span>
        </div>
      </div>
      <div class="d-flex align-items-center gap-2">
        ⚡Auto-Claim is active.
        <a
          class="link d-flex gap-1 align-items-center"
          v-if="finalTransaction"
          :href="`https://minascan.io/devnet/tx/${finalTransaction}?type=zk-tx`"
          target="_blank"
          rel="noopener noreferrer"
        >
          <span class="gray">Track on-chain</span>
          <inline-svg src="/icons/tips.svg"></inline-svg>
        </a>
      </div>
      <div class="gray fs-12">
        You can always find your rewards under
        <span class="text-underline">My Games</span>
      </div>
    </div>
    <div class="w-100 d-flex">
      <Button class="default-border p-10-30 cta-3 flex-1">Back to Lobby</Button>
      <Button class="cta-1 default-border radius-10 flex-1">Post on X</Button>
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed } from 'vue';
import Button from './shared/Button.vue';
import { formatAddress } from '@/utils';
const props = defineProps({
  isWinner: {
    type: Boolean,
    required: true,
  },
  userRole: {
    type: String,
    required: true,
  },
  gameReward: {
    type: Number,
    required: true,
  },
  codeBreakerPubKeyBase58: {
    type: String,
    required: true,
  },
  codeMasterPubKeyBase58: {
    type: String,
    required: true,
  },
  finalTransaction: {
    type: String,
    required: false,
  },
});
const isBreakerWinner = computed(
  () => props.userRole === 'CODE_BREAKER' && props.isWinner
);
const isBreakerLoser = computed(
  () => props.userRole === 'CODE_BREAKER' && !props.isWinner
);
const isMasterWinner = computed(
  () => props.userRole === 'CODE_MASTER' && props.isWinner
);
const isMasterLoser = computed(
  () => props.userRole === 'CODE_MASTER' && !props.isWinner
);
</script>

<style lang="scss" scoped>
 
</style>
