<template>
  <div class="snow-white d-flex flex-column gap-2">
    <div class="d-flex justify-content-between align-items-center">
      <div>
        <div class="mb-2">Game Room Name</div>
        <div>🪶 {{ game?.roomName }}</div>
      </div>
      <div
        class="c-highlighted p-5-10 snow-white default-border d-flex align-items-center gap-1"
      >
        <inline-svg src="/icons/cash.svg"></inline-svg>
        {{ (game?.rewardAmount || 0) / 1e9 }} Mina
      </div>
    </div>
    <div
      class="c-idle p-5-10 default-border radius-10 snow-white d-flex flex-column align-items-center"
    >
      <div class="d-flex gap-2 align-items-end">
        {{ gameStatus.text }} <DotsLoader />
      </div>
      <div
        v-if="gameStatus.waitTime"
        class="c-idle p-5-10 default-border radius-10 snow-white d-flex align-items-center justify-content-center mt-2 gap-3 fit-content"
      >
        <div v-if="!zkAppStates">
          Tx Hash: {{ formatAddress(game?.gameCreationTransactionHash || '') }}
        </div>
        <div>Estimated Time:</div>
        <Timer
          :key="timerKey"
          :duration="gameStatus.waitTime"
          :startTimestamp="Date.now()"
        />
      </div>
    </div>
    <div v-if="game?.status === 'ACTIVE'">
      <div class="default-border my-2"></div>
      <div class="d-flex justify-content-between">
        <Button class="cta-3" size="large"> Return to Lobby </Button>
        <Button class="cta-3" size="large">
          <inline-svg class="me-2" src="/icons/share.svg"></inline-svg>
          <span>Invite your friend to challange</span>
        </Button>
        <Button class="cta-1 radius-10" size="large">
          <inline-svg src="/icons/twitter.svg"></inline-svg>
          Share on X
        </Button>
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import Timer from './shared/Timer.vue';
import Button from './shared/Button.vue';
import { useZkAppStore } from '@/store/zkAppModule';
import { storeToRefs } from 'pinia';
import { formatAddress } from '@/utils';
import { computed, onMounted, ref } from 'vue';
import { checkZkappTransaction, fetchTransactionStatus } from 'o1js';
import DotsLoader from './shared/DotsLoader.vue';
import { useRoute } from 'vue-router';

const { zkAppStates, game, compiled } = storeToRefs(useZkAppStore());
const { getGame } = useZkAppStore();
const route = useRoute();
const gameId = route?.params?.id as string;

const checkGamedeploymentInterval = ref<number | null>(null);
const gameDeploymentTxStatus = ref('pending');
const MINA_APPROX_SLOT_DURATION = Number(
  import.meta.env.VITE_MINA_APPROX_SLOT_DURATION
);
const serverCheckInterval = ref<number | null>(null);
const timerKey = ref(0);
const gameStatus = computed(() =>
  !compiled.value
    ? { state: 'COMPILING', text: 'Compiling...' }
    : !zkAppStates.value
      ? {
          state: 'DEPLOYING',
          text: 'Deploying',
          waitTime: MINA_APPROX_SLOT_DURATION,
        }
      : game.value?.status === 'PENDING'
        ? {
            state: 'VERIFYING',
            text: 'Verifying game on server...',
            waitTime: 60 * 1000,
          }
        : { state: 'WAITING', text: 'Waiting for code breaker' }
);
onMounted(async () => {
  if (gameStatus.value.state === 'VERIFYING') {
    serverCheckInterval.value = setInterval(async () => {
      await getGame(gameId);
    },60 * 1000);
  }
});
</script>
