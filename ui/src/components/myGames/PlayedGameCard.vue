<template>
  <div
    :class="[
      'd-flex align-items-center justify-content-between color-snow-white p-2 played-game-card__container ',
      { looser: !isWinner, winner: isWinner },
    ]"
  >
    <div class="fs-16 fw-700 card-header">
      You
      <span v-if="!isWinner">Lost</span><span v-else>Win</span>
      <div class="fs-12">GameID: {{ formatAddress(game._id) }}</div>
    </div>
    <div>
      <div
        v-if="isCodeMaster"
        class="d-flex align-items-center gap-2 fs-12 role"
      >
        <inline-svg src="/icons/dice.svg"></inline-svg>
        <span class="">CodeMaster</span>
      </div>
      <div v-else class="d-flex align-items-center gap-2 fs-12 role">
        <inline-svg src="/icons/binary.svg"></inline-svg>
        <span class="">CodeBreaker</span>
      </div>
    </div>
    <div class="fs-12 fw-600 opponent-key">
      Opponent:
      <span class="fw-400">
        {{
          isCodeMaster
            ? formatAddress(game.codeBreaker)
            : formatAddress(game.codeMaster)
        }}
      </span>
    </div>
    <div class="d-flex flex-wrap gap-1 rounds">
      <div v-for="round in 7">
        <div
          :style="{
            background:
              round === (Math.floor(game.turnCount / 2) || 1)
                ? isWinner
                  ? '#5BC56B'
                  : '#AF423B'
                : round > (Math.floor(game.turnCount / 2) || 1)
                  ? '#191B1D33'
                  : '#FEFEFE',
          }"
          class="attempts"
        ></div>
      </div>
    </div>

    <div class="fs-12">{{ creationDate }}</div>
    <el-tooltip
      :content="
        game?.status === 'PENALIZED'
          ? `Server penalized ${isWinner ? 'opponent' : 'you'}`
          : 'No server penalization occurred'
      "
      placement="top"
      trigger="hover"
      effect="customized"
      popper-class="server-tooltip"
    >
      <span
        :class="[
          'cursor-pointer',
          game?.status === 'PENALIZED'
            ? 'color-snow-white'
            : 'color-gray-passive',
        ]"
      >
        <inline-svg src="/icons/zk.svg"></inline-svg
      ></span>
    </el-tooltip>
    <el-tooltip
      :content="isWinner ? 'Check Reward' : 'You Lost'"
      placement="top"
      trigger="hover"
      effect="customized"
      popper-class="reward-tooltip"
    >
      <span
        :class="[
          'cursor-pointer',
          isWinner ? 'color-snow-white' : 'color-gray-passive',
        ]"
        @click="showClaimModal"
      >
        <inline-svg src="/icons/claim.svg"></inline-svg
      ></span>
    </el-tooltip>
    <div
      class="radius-10 award bg-alpha-20-700-20 default-border radius-10 blend-multiply p-5-10 d-flex align-items-center justify-content-center gap-1 py-2"
    >
      <inline-svg src="/icons/cash.svg"></inline-svg
      >{{ game?.rewardAmount / 1e9 }} MINA
    </div>
    <ClaimRewardModal
      @close="handleCloseClaimModal"
      :game="game"
      v-if="isClaimRewardVisible"
    />
  </div>
</template>
<script setup lang="ts">
import { formatAddress } from '@/utils';
import dayjs from 'dayjs';
import ClaimRewardModal from '../modals/ClaimRewardModal.vue';
import { ref } from 'vue';

const props = defineProps({
  game: {
    type: Object,
    required: true,
  },
  publicKeyBase58: {
    type: String,
    required: true,
  },
});

const isWinner = props.game.winnerPublicKeyBase58 === props.publicKeyBase58;
const isCodeMaster = props.game.codeMaster === props.publicKeyBase58;
const creationDate = dayjs(props.game.createdAt).format('MM/DD/YYYY');
const isClaimRewardVisible = ref(false);
const showClaimModal = () => {
  if (isWinner) {
    isClaimRewardVisible.value = true;
  }
};
const handleCloseClaimModal = () => {
  isClaimRewardVisible.value = false;
};
</script>
<style lang="scss" scoped>
.winner {
  border-left: 4px solid $green !important;
}
.looser {
  border-left: 4px solid $red !important;
}
.played-game-card__container {
  border: 1px solid $alpha-20-300-20;
  background: $alpha-20-300-20;
  background-blend-mode: plus-lighter !important;
}
.attempts {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}
.role {
  width: 108px;
}
.card-header {
  width: 128px;
}
.opponent-key {
  width: 150px;
}
.rounds {
  width: 50px;
}
.award {
  width: 120px;
}
.icon {
  color: $gray-passive;
}
.icon:hover {
  color: $snow-white;
}
</style>
<style lang="scss">
.server-tooltip.el-popper.is-customized {
  width: 200px;
}
.server-tooltip.el-popper.is-customized .el-popper__arrow::before {
  bottom: 5px;
}
.reward-tooltip.el-popper.is-customized {
  width: 100px;
}
.reward-tooltip.el-popper.is-customized .el-popper__arrow::before {
  bottom: 5px;
}
</style>
