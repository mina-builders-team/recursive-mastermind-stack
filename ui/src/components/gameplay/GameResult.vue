<template>
  <div
    class="radius-20 p-20 bg-alpha-8-300-8 default-border d-flex flex-column align-items-center gap-3"
  >
    <div class="radius-10 p-20 default-border bg-alpha-8-300-8">
      <inline-svg v-if="isWinner" src="/icons/trophy.svg"></inline-svg>
      <inline-svg v-else src="/icons/bug.svg"></inline-svg>
    </div>
    <div class="fw-600 fs-20 color-snow-white">
      <span v-if="isBreakerWinner">Excellent! You Broke The Code!</span>
      <span v-if="isBreakerLoser">
        <span v-if="isPenalized">You Are Late!</span>
        <span v-else>You Were Almost There</span>
        !</span
      >
      <span v-if="isMasterLoser">
        <span v-if="isPenalized">You Are Late!</span>
        <span v-else> Code Cracked!</span>
      </span>
      <span v-if="isMasterWinner">Code Defended!</span>
    </div>
    <div class="fs-12">
      <span v-if="isBreakerWinner">You used excellent logic!</span>
      <span v-if="isBreakerLoser">
        <span v-if="isPenalized"
          >To keep the game fair and fast, you must confirm results within the
          time limit. Since you didn’t respond in time, you’ve forfeited this
          round.</span
        >
        <span v-else>Too Bad! The Code Remained Unbroken!</span>
      </span>
      <span v-if="isMasterLoser">
        <span v-if="isPenalized"
          >To keep the game fair and fast, you must confirm results within the
          time limit. Since you didn’t respond in time, you’ve forfeited this
          round.</span
        >
        <span v-else>Your opponent was clever and broke your secret code!</span>
      </span>
      <span v-if="isMasterWinner"
        >Your secret code stood strong—no one cracked it!</span
      >
    </div>
    <div
      class="radius-10 default-border bg-alpha-8-300-8 p-2 pb-3 d-flex flex-column align-items-center gap-3 color-snow-white w-100"
    >
      <div class="fw-600">
        <div v-if="isWinner">
          <span v-if="isRewardClaimed"> Your reward is Claimed! </span>
          <span v-else>Your reward is on the way!</span>
        </div>
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
            codeBreakerPubKeyBase58
              ? formatAddress(codeBreakerPubKeyBase58)
              : 'Opponent'
          }}</span>
          <span v-else="">{{
            codeMasterPubKeyBase58
              ? formatAddress(codeMasterPubKeyBase58)
              : 'Opponent'
          }}</span>
        </div>
      </div>
      <div class="d-flex align-items-center gap-2">
        <div v-if="isPlayingOnChain && isWinner && !isRewardClaimed">
          You can claim your reward in
          <div
            v-if="remainingSlot !== null && remainingSlot > 0 && isPenalized"
            class="d-flex justify-content-center"
          >
            <Timer
              customClass="fit-content mt-2"
              :duration="remainingSlot * MINA_APPROX_SLOT_DURATION"
              :startTimestamp="Date.now()"
            />
          </div>
          <div class="w-100" v-else>
            <Button
              class="cta-1 default-border radius-10 flex-1 w-100 mt-2"
              size="large"
              @click="handleClaimReward"
              :loading="loading"
              ><span class="color-black">
                <span v-if="!lastTransactionLink">Claim Reward</span>
                <span v-else>Re-Claim Reward</span>
              </span>
            </Button>
          </div>
        </div>
      </div>
      <div class="d-flex align-items-center gap-2">
        <span v-if="!isPlayingOnChain">⚡Auto-Claim is active.</span>
        <a
          class="link d-flex gap-1 align-items-center"
          v-if="lastTransactionLink"
          :href="`https://minascan.io/devnet/tx/${lastTransactionLink}?type=zk-tx`"
          target="_blank"
          rel="noopener noreferrer"
        >
          <span class="gray">Track on-chain</span>
          <inline-svg src="/icons/tips.svg"></inline-svg>
        </a>
      </div>
      <div class="color-gray fs-12">
        You can always find your rewards under
        <span class="text-underline cursor-pointer" @click="redirectToGames"
          >My Games</span
        >
      </div>
    </div>
    <div class="w-100 d-flex gap-2">
      <Button
        class="default-border p-10-30 btn-cta3 flex-1"
        size="large"
        @click="redirectToLobby"
        ><span class="color-snow-white">Back to Lobby</span>
      </Button>
      <ShareButton
        v-if="isMasterWinner || isBreakerWinner"
        class="cta-1 default-border radius-10 flex-1"
        size="large"
        :message="
          isMasterWinner
            ? masterWinnerTweet.message
            : breakerWinnerTweet.message
        "
        :hashtag="
          isMasterWinner
            ? masterWinnerTweet.hashtag
            : breakerWinnerTweet.hashtag
        "
      />
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import Button from '@/components/shared/Button.vue';
import { formatAddress } from '@/utils';
import ShareButton from '../shared/ShareButton.vue';
import { useRouter } from 'vue-router';
import Timer from '../shared/Timer.vue';
import { useZkAppStore } from '@/store/zkAppModule';
import { storeToRefs } from 'pinia';
import { useCustomMessage } from '@/composables/useCustomMessage';
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
    required: false,
  },
  codeMasterPubKeyBase58: {
    type: String,
    required: false,
  },
  turnCount: {
    type: Number,
    required: true,
  },
  isPenalized: {
    type: Boolean,
    required: true,
  },
});
const { showMessage } = useCustomMessage();
const { fetchCurrentSlot, claimRewardTransaction, getZkAppStates } =
  useZkAppStore();
const {
  currentSlot,
  zkAppStates,
  loading,
  error,
  isPlayingOnChain,
  claimRewardTransactionHash,
  game,
} = storeToRefs(useZkAppStore());
const roundCount = Math.floor(props.turnCount / 2);
const MINA_APPROX_SLOT_DURATION = Number(
  import.meta.env.VITE_MINA_APPROX_SLOT_DURATION
);
const intervalId = ref<number | null>(null);

const lastTransactionLink = computed(() => {
  return isPlayingOnChain.value
    ? claimRewardTransactionHash.value
    : game.value?.penalizationTransactionHash ||
        game.value?.settlementTransactionHash;
});
const remainingSlot = computed(() => {
  return zkAppStates.value?.finalizeSlot && currentSlot.value
    ? zkAppStates.value?.finalizeSlot - currentSlot.value
    : null;
});

const masterWinnerTweet = {
  message: `My latest creation was unbreakable! My opponent couldn't crack my code in Mina Mastermind. Sometimes the best offense is a good defense. 😉
 Come try to break my next one. If you dare.
 https://www.minamastermind.com
  `,
  hashtag: 'MinaMastermind ,Puzzle ,Web3',
};
const breakerWinnerTweet = {
  message: `Nailed it! Solved the code in ${roundCount} guess ${roundCount > 1 ? 's' : ''} in Mina Mastermind. A "Perfect Game" on the ZK-powered grid.
 Can you match this? https://www.minamastermind.com
  `,
  hashtag: 'MinaMastermind ,Puzzle ,Web3',
};
const router = useRouter();
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
const isRewardClaimed = computed(() => {
  return zkAppStates.value?.rewardAmount === 0;
});
const redirectToGames = () => {
  router.push({ name: 'my-games' });
};
const redirectToLobby = () => {
  router.push({ name: 'lobby' });
};
const handleClaimReward = async () => {
  await claimRewardTransaction();

  if (error.value) {
    showMessage({
      title: 'Error',
      description: error.value,
      duration: 6000,
      type: 'error',
    });
  }
};
onMounted(async () => {
  intervalId.value = setInterval(async () => {
    await getZkAppStates();
    if (zkAppStates.value?.rewardAmount === 0) {
      if (intervalId.value) {
        clearInterval(intervalId.value);
      }
    }
  }, 30000);
  if (isPlayingOnChain.value) {
    await fetchCurrentSlot();
  }
});
onUnmounted(() => {
  if (intervalId.value) {
    clearInterval(intervalId.value);
  }
});
</script>
<style lang="scss" scoped></style>
