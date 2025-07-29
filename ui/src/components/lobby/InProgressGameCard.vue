<template>
  <div
    class="d-flex align-items-center justify-content-between radius-10 idle-container border-alpha-50-300-50  color-snow-white ps-4 pe-5 py-3"
  >
    <div
      class="idle-container border-alpha-50-300-50 radius-10 d-flex align-items-center gap-2 fw-400 f-14 color-snow-white p-2 fit-content"
    >
      <inline-svg src="/icons/cash.svg"></inline-svg>
      {{ game?.rewardAmount! / 1e9 }} MINA
    </div>
    <div class="d-flex" v-if="isUserTurn">Waiting for your next move in</div>
    <Timer
      :duration="2 * 1000 * 60"
      :startTimestamp="game.timestamp"
      v-if="isUserTurn"
    />

    <div v-if="!isUserTurn" class="d-flex align-items-center">
      Opponents Turn
    </div>
    <Timer
      :duration="2.5 * 1000 * 60"
      :startTimestamp="game.timestamp"
      v-if="!isUserTurn"
    />
    <div class="fs-12">ID: {{ formatAddress(game._id) }}</div>
    <Button
      class="color-gray-passive d-flex align-items-center p-4 radius-60"
      @click="joinGame"
    >
      <inline-svg
        class="me-2"
        :src="
          game.codeMaster === publicKeyBase58
            ? '/icons/dice.svg'
            : '/icons/binary.svg'
        "
      ></inline-svg>
      Continue
    </Button>
  </div>
</template>
<script setup lang="ts">
import { formatAddress } from '@/utils';
import Button from '../shared/Button.vue';
import Timer from '../shared/Timer.vue';
import { useRouter } from 'vue-router';

const props = defineProps({
  publicKeyBase58: {
    type: String,
    required: true,
  },
  game: {
    type: Object,
    required: true,
  },
});

const router = useRouter();
const joinGame = () => {
  router.push({ name: 'gameplay', params: { id: props.game._id } });
};

const isUserTurn =
  props.game.turnCount % 2 === 0 &&
  props.game.codeMaster === props.publicKeyBase58;
</script>
<style lang="scss" scoped></style>
