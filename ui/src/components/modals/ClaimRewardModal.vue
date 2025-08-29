<template>
  <Modal @close="handleModalClose" class="w-400">
    <div class="radius-20 p-20 d-flex flex-column align-items-center gap-3">
      <div class="radius-10 p-20 default-border bg-alpha-8-300-8">
        <inline-svg src="/icons/trophy.svg"></inline-svg>
      </div>
      <div
        class="radius-10 default-border bg-alpha-8-300-8 p-2 pb-3 d-flex flex-column align-items-center gap-3 color-snow-white w-100"
      >
        <template v-if="!isRewardClaimed">
          <div class="fw-600">
            <span class="fw-600"> Your reward is on the way! </span>
          </div>
          <div class="fs-12 text-center">
            You should have receive your tokens automaticaly in 3 minutes.
          </div>
        </template>
        <template v-else>
          <div class="fw-600">
            <span class="fw-600"> Your reward is Claimed! </span>
          </div>
        </template>
        <template v-if="finalTransaction">
          <div class="fs-12 color-gray">
            Transaction ID: {{ formatAddress(finalTransaction || '') }}
          </div>
          <div class="fs-12 color-gray">
            Transaction Time:
            {{
              dayjs
                .utc(game?.finalTransactionTimestamp)
                .format('MM/DD/YYYY HH:mm')
            }}
            UTC
          </div>
        </template>

        <div
          class="d-flex align-items-center justify-content-center w-100 gap-3"
        >
          <div class="p-5-10 radius-10 default-border bg-alpha-20-300-20">
            <inline-svg src="/icons/cash.svg"></inline-svg>
            {{ game?.rewardAmount / 1e9 }} MINA
          </div>
          <inline-svg src="/icons/arrow-right-from-line.svg"></inline-svg>
          <div
            class="p-5-10 radius-10 default-border bg-alpha-20-300-20 d-flex align-items-center justify-content-start gap-4"
          >
            <inline-svg src="/icons/person.svg"></inline-svg>
            <span>You</span>
          </div>
        </div>
        <div class="d-flex align-items-center gap-2" v-if="finalTransaction">
          <a
            class="link d-flex gap-1 align-items-center"
            :href="`https://minascan.io/devnet/tx/${finalTransaction}?type=zk-tx`"
            target="_blank"
            rel="noopener noreferrer"
          >
            <span class="color-gray">Track on-chain</span>
            <inline-svg src="/icons/tips.svg"></inline-svg>
          </a>
        </div>
      </div>
      <div class="w-100 d-flex">
        <Button
          class="default-border p-10-30 btn-cta3 flex-1"
          size="large"
          @click="handleModalClose"
          ><span class="color-snow-white">Back</span>
        </Button>
        <Button
          class="cta-1 default-border radius-10 flex-1 bg-snow-white"
          size="large"
          @click="handleClaimReward"
          :loading="loading"
          :disabled="isClaimRewardDisabled"
          v-if="
            zkAppStates &&
            zkAppStates?.rewardAmount !== 0 &&
            (!isLastProofSubmitted || (remainingSlot && remainingSlot <= 0))
          "
          ><Timer
            class="px-0 pe-1"
            v-if="isClaimRewardDisabled"
            transparent
            :duration="MINA_APPROX_SLOT_DURATION"
            :startTimestamp="timerStartTime"
            @timeEnded="handleClaimTimeElapsed"
          />
          <span class="color-black">Claim Reward</span>
        </Button>
      </div>
    </div>
  </Modal>
</template>
<script setup lang="ts">
import Button from '@/components/shared/Button.vue';
import Modal from '../shared/Modal.vue';
import { formatAddress, getStoredGame } from '@/utils';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useZkAppStore } from '@/store/zkAppModule';
import { useCustomMessage } from '@/composables/useCustomMessage';
import Timer from '../shared/Timer.vue';

dayjs.extend(utc);

const {
  compiled,
  zkAppStates,
  error,
  claimRewardTransactionHash,
  currentSlot,
  zkProofStates,
  publicKeyBase58,
  loading,
  submitGameTransactionHash,
} = storeToRefs(useZkAppStore());
const {
  initZkappInstance,
  getZkAppStates,
  claimRewardTransaction,
  fetchCurrentSlot,
  setLastProof,
  getZkProofStates,
  submitGameProof,
  getStoredTransactionsHash,
} = useZkAppStore();
const props = defineProps({
  game: {
    type: Object,
    required: true,
  },
});
const { showMessage } = useCustomMessage();
const emit = defineEmits(['close']);
const intervalId = ref<number | null>(null);
const MINA_APPROX_SLOT_DURATION = Number(
  import.meta.env.VITE_MINA_APPROX_SLOT_DURATION
);
const timerStartTime = ref(Date.now());
const isClaimRewardDisabled = ref(false);
const handleModalClose = () => {
  emit('close');
};
const handleClaimReward = async () => {
   if (!isLastProofSubmitted.value && lastProof.value) {
    await submitGameProof(lastProof.value, publicKeyBase58.value);
  } else {
    await claimRewardTransaction();
  } 
  if (error.value) {
    showMessage({
      title: 'Error',
      description: error.value,
      duration: 6000,
      type: 'error',
    });
  } else {
    timerStartTime.value = Date.now();
    isClaimRewardDisabled.value = true;
  }
};
const handleClaimTimeElapsed = () => {
  isClaimRewardDisabled.value = false;
};
const finalTransaction = computed(() => {
  return (
    claimRewardTransactionHash.value ||
    submitGameTransactionHash.value ||
    props.game?.settlementTransactionHash ||
    props.game?.penalizationTransactionHash
  );
});

const remainingSlot = computed(() => {
  return zkAppStates.value?.finalizeSlot && currentSlot.value
    ? zkAppStates.value?.finalizeSlot - currentSlot.value
    : null;
});

const isLastProofSubmitted = computed(() => {
  return zkAppStates.value && zkProofStates.value
    ? zkAppStates.value?.turnCount >= zkProofStates?.value?.turnCount
    : true;
});
const lastProof = ref(null);
const initializeGame = async () => {
  if (compiled.value) {
    await initZkappInstance(props.game?._id);
    await getZkAppStates();

    intervalId.value = setInterval(async () => {
      await getZkAppStates();
      if (zkAppStates.value?.rewardAmount === 0) {
        if (intervalId.value) {
          clearInterval(intervalId.value);
        }
      }
    }, 30000);
  }
};

watch(
  () => compiled.value,
  async () => {
    await initializeGame();
  }
);
const isRewardClaimed = computed(() => {
  return zkAppStates.value?.rewardAmount === 0;
});
onMounted(async () => {
  await initializeGame();
  await fetchCurrentSlot();
  const game = getStoredGame(props.game?._id as string);
  lastProof.value = game?.lastProof;
  if (lastProof.value) {
    await setLastProof(lastProof.value);
    await getZkProofStates();
  }
  getStoredTransactionsHash();
});
onUnmounted(() => {
  if (intervalId.value) {
    clearInterval(intervalId.value);
  }
});
</script>

<style lang="scss" scoped>
:deep(.el-button.is-disabled) {
  background: unset;
}
</style>
