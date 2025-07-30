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
      <inline-svg
        class="color-gray-passive"
        src="/icons/share.svg"
      ></inline-svg>
      <div class="d-flex gap-2 align-items-center">
        <div class="mt-1">
          <CopyToClipBoard color="#27282a" :text="game?._id || ''" />
        </div>
        <div class="fs-12 color-snow-white">
          ID: {{ formatAddress(game?._id) }}
        </div>
      </div>
      <inline-svg src="/icons/zk.svg"></inline-svg>
    </div>
    <div
      class="bg-alpha-20-700-20 border-20-300-20 p-10 radius-10 d-flex align-items-center justify-content-center gap-1"
    >
      <inline-svg src="/icons/cash.svg"></inline-svg
      >{{ game?.rewardAmount / 1e9 }} MINA
    </div>
    <el-tooltip
      placement="right"
      effect="customized"
      v-if="game?.cancelTransactionHash"
    >
      <template #content>
        You may want to recheck your transactions status by
        <span class="text-underline"
          ><a
            :href="`https://minascan.io/devnet/tx/${game?.cancelTransactionHash}?type=zk-tx`"
            target="_blank"
            rel="noopener noreferrer"
            class="link"
            >here
          </a></span
        >. You may also resend your transaction with the costs
      </template>
      <Button
        class="bg-red radius-10 cancel-btn"
        size="large"
        @click="cancelGameById(game._id)"
        ><span class="color-snow-white"> Re-try Cancel </span></Button
      >
    </el-tooltip>
    <Button
      v-else
      class="bg-red radius-10 cancel-btn"
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
dayjs.extend(relativeTime);

const props = defineProps({
  game: {
    type: Object,
    required: true,
  },
});
const { cancelGame } = useZkAppStore();

const cancelGameById = async (gameId: string) => {
  const cancelTxHash = await cancelGame(gameId);
  /* myGames.value.activeGames = myGames?.value?.activeGames.map((e) =>
    e._id === gameId ? { ...e, cancelTransactionHash: cancelTxHash } : e
  ); */
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
</style>
