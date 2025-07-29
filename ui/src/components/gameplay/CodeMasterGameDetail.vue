<template>
  <div class="color-snow-white d-flex flex-column gap-2">
    <div class="d-flex justify-content-between align-items-center">
      <div>
        <div class="mb-2">Game Room Name</div>
        <div>🪶 {{ game?.roomName }}</div>
      </div>
      <div
        class="c-highlighted p-5-10 color-snow-white default-border d-flex align-items-center gap-1"
      >
        <inline-svg src="/icons/cash.svg"></inline-svg>
        {{ (game?.rewardAmount || 0) / 1e9 }} Mina
      </div>
    </div>
    <div
      class="c-idle p-5-10 default-border radius-10 color-snow-white d-flex flex-column align-items-center"
    >
      <div class="d-flex gap-2 align-items-end">
        {{ gameStatus.text }} <DotsLoader />
      </div>
      <div
        v-if="gameStatus.waitTime"
        class="c-idle p-5-10 default-border radius-10 color-snow-white d-flex align-items-center justify-content-center mt-2 gap-3 fit-content"
      >
        <div v-if="!zkAppStates">
          Tx Hash: {{ formatAddress(game?.gameCreationTransactionHash || '') }}
        </div>
        <div>Estimated Time:</div>
        <Timer
          :key="timerKey"
          :duration="gameStatus.waitTime"
          :startTimestamp="timerStartTime"
          @timeEnded="resetTimer"
        />
      </div>
    </div>
    <div v-if="game?.status === 'ACTIVE'">
      <div class="default-border my-2"></div>
      <div class="d-flex justify-content-between">
        <Button class="cta-3" size="large" @click="returnToLobby">
          Return to Lobby
        </Button>
        <CopyToClipBoard :text="game?._id || ''">
          <Button class="cta-3" size="large">
            <inline-svg class="me-2" src="/icons/share.svg"></inline-svg>
            <span>Invite your friend to challange</span>
          </Button>
        </CopyToClipBoard>

        <ShareButton
          :message="'Lets play now https://www.minamastermind.com/' + game?._id"
          hashtag="Mina MASTERMIND"
          class="radius-10"
        />
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import Timer from '@/components/shared/Timer.vue';
import Button from '@/components/shared/Button.vue';
import { useZkAppStore } from '@/store/zkAppModule';
import { storeToRefs } from 'pinia';
import { formatAddress } from '@/utils';
import { computed, ref, watch } from 'vue';
import DotsLoader from '@/components/shared/DotsLoader.vue';
import { useRoute, useRouter } from 'vue-router';
import ShareButton from '../shared/ShareButton.vue';
import CopyToClipBoard from '../shared/CopyToClipBoard.vue';

const { zkAppStates, game, compiled } = storeToRefs(useZkAppStore());
const { getGame } = useZkAppStore();
const route = useRoute();
const router = useRouter();
const gameId = route?.params?.id as string;
const timerKey = ref(0);
const MINA_APPROX_SLOT_DURATION = Number(
  import.meta.env.VITE_MINA_APPROX_SLOT_DURATION
);
const gameStatus = computed(() =>
  !compiled.value
    ? { state: 'COMPILING', text: 'Compiling' }
    : !zkAppStates.value
      ? {
          state: 'DEPLOYING',
          text: 'Checking For Game Deployment',
          waitTime: MINA_APPROX_SLOT_DURATION,
        }
      : game.value?.status === 'PENDING'
        ? {
            state: 'VERIFYING',
            text: 'Verifying Game On Server',
            waitTime: 60 * 1000,
          }
        : { state: 'WAITING', text: 'Waiting For Code Breaker' }
);
const timerStartTime = ref(Date.now());
const resetTimer = async () => {
  timerStartTime.value = Date.now();
  timerKey.value += 1;
  await getGame(gameId);
};
const returnToLobby = () => {
  router.push({ name: 'lobby' });
};
watch(
  () => gameStatus.value.state,
  async () => {
    timerStartTime.value = Date.now();
    timerKey.value += 1;
    if (gameStatus.value.state === 'VERIFYING') {
      await getGame(gameId);
    }
  }
);
</script>
