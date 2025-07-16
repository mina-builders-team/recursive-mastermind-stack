<template>
    <div
    class="default-border radius-10 bg-alpha-50-900-50 p-20 snow-white"

  >
    <div class="fs-21 fw-700 mb-3">Congratulations! You're Ready!</div>
    <div class="d-flex gap-2 w-100 mb-4">
      <div class="c-idle radius-10 gray p-2 w-50">
        <div
          class="d-flex align-items-center justify-content-between snow-white"
        >
          <div>
            <div class="gray fs-12 fw-600">Game Mode 1</div>
            <div>Codebreaker</div>
          </div>
          <inline-svg src="/icons/binary.svg"></inline-svg>
        </div>
        <div class="snow-white fs-12 mt-2">
          Crack the secret codes of other players and earn Mina rewards!
        </div>
      </div>
      <div class="c-idle radius-10 gray p-2 w-50">
        <div
          class="d-flex align-items-center justify-content-between snow-white"
        >
          <div>
            <div class="gray fs-12 fw-600">Game Mode 2</div>
            <div>Codemaker</div>
          </div>
          <inline-svg src="/icons/dice.svg"></inline-svg>
        </div>
        <div class="snow-white fs-12 mt-2">
          Create unbreakable codes and earn Mina rewards when others fail to
          guess them.
        </div>
      </div>
    </div>
    <div class="d-flex">
      You've learned all the core strategies. Now it's time to play for real
      rewards on Mainnet!
    </div>
    <div class="my-4">Here is mainnet rules:</div>
    <div class="d-flex gap-2 my-3">
      <inline-svg src="/icons/alarm.svg"></inline-svg>
      <div>
        Each turn is timed at 2.5 minutes; running out of time is a loss.
      </div>
    </div>
    <div class="d-flex gap-2 my-3">
      <inline-svg src="/icons/ordered-list.svg"></inline-svg>
      <div>
        The code must be solved within 7 guesses for the Codebreaker to win.
      </div>
    </div>
    <div class="d-flex gap-2 my-3">
      <inline-svg src="/icons/key.svg"></inline-svg>
      <div>The code is created using numbers from 1 to 8.</div>
    </div>

    <div>
      <div class="radius-10 my-4 fs-12 info-container">
        On the decentralized Mina blockchain, each of your actions remains
        private, while the game's integrity is recursively proven using advanced
        recursive proofs.
      </div>
    </div>
    <Button size="large" class="cta-1 radius-10 w-100" @click="goToPlay">
      <inline-svg src="/icons/celebrate.svg" class="me-2"></inline-svg>
      Go To Play
    </Button>
  </div>
</template>
<script lang="ts" setup>
import Button from '@/components/shared/Button.vue';

const emit = defineEmits(['next']);
const goToPlay = () => {
  localStorage.setItem("completedOnboarding","true")
  emit('next');
};

</script>

<style lang="scss" scoped>
</style>