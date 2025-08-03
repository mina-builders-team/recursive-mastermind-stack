<template>
  <div
    class="d-flex w-100 color-snow-white align-items-center justify-content-between gap-2"
  >
    <div>
      <div class="fw-700 fs-16">Open Game</div>
      <div class="fs-12">
        {{ dayjs(game.createdAt).fromNow() }}
      </div>
    </div>
    <div class="d-flex justify-content-center align-items-center gap-4">
      <ShareButton
        :message="`🧠 I just created a new Mastermind game on Web3, powered by zero-knowledge proofs & @MinaProtocol!
Think you can crack my code? 🕵️‍♂️
Join now as the Code Breaker 👇
🎯 https://www.minamastermind.com/${game?._id}

 `"
        hashtag="MinaProtocol ,zkApps ,Web3Gaming ,ZeroKnowledge ,MastermindGame"
      >
        <inline-svg
          class="color-gray-passive cursor-pointer share-btn"
          src="/icons/share.svg"
        ></inline-svg>
      </ShareButton>

      <div class="d-flex gap-2 align-items-center">
        <div class="mt-1">
          <CopyToClipBoard color="#27282a" :text="game?._id || ''" />
        </div>
        <div class="fs-12 color-snow-white game-id">
          ID: {{ formatAddress(game?._id) }}
        </div>
      </div>
      <inline-svg src="/icons/zk.svg"></inline-svg>
    </div>
    <div
      class="bg-alpha-20-700-20 border-20-300-20 p-10 radius-10 d-flex align-items-center justify-content-center gap-1 reward-container"
    >
      <inline-svg src="/icons/cash.svg"></inline-svg
      >{{ game?.rewardAmount / 1e9 }} MINA
    </div>

    <Button
      :loading="loading"
      class="bg-red radius-10 cancel-btn px-4"
      size="large"
      @click="cancelGameById(game._id)"
      ><span class="color-snow-white"> Cancel </span></Button
    >
  </div>
</template>
<script lang="ts" setup>
import { useZkAppStore } from '@/store/zkAppModule';
import CopyToClipBoard from '@/components/shared/CopyToClipBoard.vue';
import Button from '../shared/Button.vue';
import { formatAddress } from '@/utils';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { storeToRefs } from 'pinia';
import ShareButton from '../shared/ShareButton.vue';
dayjs.extend(relativeTime);

const props = defineProps({
  game: {
    type: Object,
    required: true,
  },
});
const emit = defineEmits(['cancel']);
const { cancelGame } = useZkAppStore();
const { loading } = storeToRefs(useZkAppStore());
const cancelGameById = async (gameId: string) => {
  const cancelTx = await cancelGame(gameId);
  if (cancelTx) {
    emit('cancel', cancelTx);
  }
};
</script>
<style lang="scss" scoped>
.cancel-btn {
  box-shadow: 0px 2px 15px 0px $color-600 inset;
  backdrop-filter: blur(10px);
  border: 1px solid;
  border-image-source: linear-gradient(
    180deg,
    rgba(59, 61, 63, 0.5) 100%,
    rgba(255, 255, 255, 0.5) 100%
  );
}
.reward-container {
  width: 101px;
}
.game-id {
  width: 120px;
}
.share-btn:hover {
  color: $snow-white !important;
}
</style>
