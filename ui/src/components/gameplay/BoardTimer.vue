<template>
  <div
    class="bg-alpha-8-300-8 border-alpha-50-300-50 mt-2 radius-10 p-2 d-flex flex-column gap-2 align-items-center color-snow-white"
  >
    <template v-if="!isPlayingOnChain">
      <div>
        <div v-if="isCurrentUserTurn">
          <span v-if="!isTurnTimeExceeded">Waiting for your next move in</span>
          <span v-else>Make Your Move ASAP. You May Lose Anytime.</span>
        </div>
        <div v-else>
          <span v-if="isTurnPlayed">Verifying on server</span>
          <span v-else>Opponents Turn</span>
        </div>
      </div>
      <Timer
        v-if="!isTurnTimeExceeded"
        :duration="duration"
        :startTimestamp="startTimestamp"
        :criticalOn="30000"
        @timeEnded="handleTurnEnded"
      />
      <div
        v-else
        class="d-flex align-items-center gap-1 fw-400 p-10 radius-10 fs-16 fw-600 critical"
      >
        <inline-svg class="me-1" src="/icons/alert.svg"></inline-svg>
        URGENT
      </div>
    </template>
    <template v-else>
      <div
        v-if="lastTurnTransactionHash"
        class="d-flex w-100 justify-content-between align-items-center"
      >
        <div class="fs-12">
          TX sent. Avoid resending unless
          <span class="text-underline">
            <a
              class="link"
              :href="`https://minascan.io/devnet/tx/${lastTurnTransactionHash}?type=zk-tx`"
              target="_blank"
              rel="noopener noreferrer"
            >
              it fails
            </a>
          </span>
        </div>
        <div class="d-flex gap-2 align-items-center">
          <div class="timer-status bg-yellow"></div>
          <Timer
            :duration="MINA_APPROX_SLOT_DURATION"
            :startTimestamp="Date.now()"
          />
        </div>
      </div>
      <div
        v-else-if="isTurnTimeExceeded"
        class="d-flex w-100 justify-content-between align-items-center"
      >
        <div v-if="isCurrentUserTurn">
          <div class="fs-12">Make Your Move ASAP. You May Lose Anytime.</div>
          <div class="color-red fs-12">
            May take 3min to get approval by validator.
          </div>
        </div>
        <div v-else>
          <div class="fs-12">Your opponent is running out of time</div>
          <div class="color-red fs-12">If they don't act soon, you'll win.</div>
        </div>
        <div class="d-flex align-items-center">
          <div class="timer-status bg-pink-2"></div>
          <div
            class="d-flex align-items-center gap-1 fw-400 p-10 radius-10 fs-16 fw-600 bg-alpha-8-300-8 color-snow-white border-50-300-50"
          >
            URGENT
          </div>
        </div>
      </div>
      <div
        v-else
        class="d-flex justify-content-between align-items-center w-100"
      >
        <div>
          <div class="fw-600 fs-12">
            <span v-if="isCurrentUserTurn">Your Turn</span
            ><span v-else>Opponents Turn</span> .
          </div>
          <div class="color-gray">Playing on Mainnet.</div>
        </div>
        <div class="d-flex align-items-center gap-2">
          <div class="timer-status bg-green"></div>
          <Timer
            :duration="duration"
            :startTimestamp="Date.now()"
            @timeEnded="handleTurnEnded"
            customClass="p-10 fw-600 fs-16"
          />
        </div>
      </div>
    </template>
  </div>
</template>
<script setup lang="ts">
import Timer from '../shared/Timer.vue';

const emit = defineEmits(['timeEnded']);
defineProps({
  duration: {
    type: Number,
    required: true,
  },
  startTimestamp: {
    type: Number,
    required: true,
  },
  isTurnTimeExceeded: {
    type: Boolean,
    required: true,
  },
  isCurrentUserTurn: {
    type: Boolean,
    required: true,
  },
  isPlayingOnChain: {
    type: Boolean,
    required: true,
  },
  lastTurnTransactionHash: {
    type: String,
    required: true,
  },
  isTurnPlayed: {
    type: Boolean,
    required: true,
  },
});
const MINA_APPROX_SLOT_DURATION = Number(
  import.meta.env.VITE_MINA_APPROX_SLOT_DURATION
);
const handleTurnEnded = () => {
  emit('timeEnded');
};
</script>
<style lang="scss" scoped>
.timer-status {
  width: 18px;
  height: 18px;
  border-radius: 50%;
}
.critical {
  background: #ff375f4d;
  border: 1px solid #ff375f;
}
</style>
