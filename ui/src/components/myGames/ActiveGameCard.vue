<template>
  <div
    class="d-flex w-100 color-snow-white align-items-center justify-content-between gap-2 py-2 px-3 active-card-container"
  >
    <div>
      <div class="fw-700 fs-16">
        <span v-if="game.status === 'CANCELLED'">Cancelled</span
        ><span v-else>Open</span> Game
      </div>
      <div class="fs-12">
        {{ dayjs(game.createdAt).fromNow() }}
      </div>
    </div>
    <div class="d-flex justify-content-center align-items-center gap-4">
      <ShareButton
        v-if="game.status !== 'CANCELLED'"
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
    </div>
    <div
      class="bg-alpha-20-700-20 blend-multiply border-alpha-20-300-20 p-10 radius-10 d-flex align-items-center justify-content-center gap-1 reward-container"
    >
      <inline-svg src="/icons/cash.svg"></inline-svg
      >{{ game?.rewardAmount / 1e9 }} MINA
    </div>
    <div
      class="d-flex gap-2 align-items-center"
      v-if="game?.cancelTransactionHash"
    >
      <div class="mt-1">
        <CopyToClipBoard color="#27282a" :text="game?._id || ''" />
      </div>
      <div class="fs-12 color-snow-white game-id">
        <a
          class="link d-flex gap-1 align-items-center"
          :href="`https://minascan.io/devnet/tx/${game?.cancelTransactionHash}?type=zk-tx`"
          target="_blank"
          rel="noopener noreferrer"
        >
          Tx Hash: {{ formatAddress(game?.cancelTransactionHash) }}.</a
        >
      </div>
    </div>
    <el-tooltip
      :disabled="game?.status !== 'CANCELLED'"
      content="Make sure that previous Tx has failed before making a new cancel request "
      placement="top"
      trigger="hover"
      effect="customized"
      popper-class="cancel-btn-tooltip"
    >
      <Button
        :loading="loading"
        class="bg-red radius-10 cancel-btn px-4"
        size="large"
        @click="cancelGameById(game._id)"
        ><span class="color-snow-white" v-if="game.status === 'CANCELLED'">
          Cancel Again
        </span>
        <span class="color-snow-white" v-else> Cancel </span>
      </Button>
    </el-tooltip>
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

defineProps({
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
  background-blend-mode: plus-lighter;
  border: 1px solid;
  border-image-source: linear-gradient(
    180deg,
    rgba(59, 61, 63, 0.5) 100%,
    rgba(255, 255, 255, 0.5) 100%
  );
  backdrop-filter: blur(15px);
}
.cancel-btn:hover {
  box-shadow: 0px 2px 30px 0px rgba(255, 255, 255, 0.4) inset;
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
.active-card-container {
  background: $alpha-8-300-8;
  background-blend-mode: plus-lighter;
  backdrop-filter: blur(5px);
  border: 0.5px solid $alpha-50-300-50;
  backdrop-filter: blur(15px);
  box-shadow: 0px 3px 41px 56px $alpha-20-300-20 inset;
}
:deep(.is-loading) {
  color:$snow-white;
}
</style>
<style lang="scss">
.cancel-btn-tooltip.el-popper.is-customized .el-popper__arrow::before {
  bottom: 5px;
}
</style>
