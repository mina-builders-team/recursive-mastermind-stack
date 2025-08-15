<template>
  <div
    class="default-border radius-10 bg-alpha-50-900-50 p-20 color-snow-white w-450"
  >
    <div class="fs-24 fw-700 mb-3 title">Congratulations! You're Ready!</div>
    <div class="d-flex gap-2 w-100 mb-4">
      <div
        class="idle-container border-alpha-50-300-50 radius-10 p-2 px-3 w-50"
      >
        <div
          class="d-flex align-items-center justify-content-between color-snow-white"
        >
          <div>
            <div class="color-gray fs-12 fw-600">Game Mode 1</div>
            <div class="fs-16">Codebreaker</div>
          </div>
          <inline-svg src="/icons/binary.svg"></inline-svg>
        </div>
        <div class="color-snow-white fs-12 mt-2">Crack codes. Earn Mina.</div>
      </div>
      <div
        class="idle-container border-alpha-50-300-50 radius-10 p-2 px-3 w-50"
      >
        <div
          class="d-flex align-items-center justify-content-between color-snow-white"
        >
          <div>
            <div class="color-gray fs-12 fw-600">Game Mode 2</div>
            <div class="fs-16">Codemaker</div>
          </div>
          <inline-svg src="/icons/dice.svg"></inline-svg>
        </div>
        <div class="snow-white fs-12 mt-2">Create codes. Earn Mina.</div>
      </div>
    </div>
    <div class="d-flex">Now it's time to play for real rewards on Mainnet!</div>
    <div class="my-4">Here is mainnet rules:</div>
    <div class="d-flex gap-2 align-items-center my-3">
      <inline-svg src="/icons/alarm.svg"></inline-svg>
      <div>3 Minute Turn Timer</div>
    </div>
    <div class="d-flex gap-2 align-items-center my-3">
      <inline-svg src="/icons/ordered-list.svg"></inline-svg>
      <div>7 Guesses to Win</div>
    </div>
    <div class="d-flex gap-2 align-items-center my-3">
      <inline-svg src="/icons/key.svg"></inline-svg>
      <div>Numbers 0-7, No Repeats</div>
    </div>
    <div class="fw-600">
      Note: Unlike the Web2 version, the Code Master must be present each turn
      to give a clue using the Give Clue button. Missing a turn without giving a
      clue will result in a penalty.
    </div>
    <div>
      <div class="my-4 fs-12 info-container">
        On the decentralized Mina blockchain, each of your actions remains
        private, while the game's integrity is recursively proven using advanced
        recursive proofs.
      </div>
    </div>
    <Button size="large" class="color-black radius-10 w-100" @click="goToPlay">
      <inline-svg src="/icons/celebrate.svg" class="me-2"></inline-svg>
      Go To Play
    </Button>
  </div>
</template>
<script lang="ts" setup>
import Button from '@/components/shared/Button.vue';
import confetti from 'canvas-confetti';
import { onMounted } from 'vue';

const emit = defineEmits(['next']);
const goToPlay = () => {
  localStorage.setItem('completedOnboarding', 'true');
  emit('next');
};
const startConfettiCelebration = () => {
  const duration = 3000;
  const animationEnd = Date.now() + duration;
  const defaults = {
    startVelocity: 30,
    spread: 360,
    ticks: 60,
    zIndex: 1000,
  };

  const randomInRange = (min: number, max: number) =>
    Math.random() * (max - min) + min;

  const interval = setInterval(() => {
    const timeLeft = animationEnd - Date.now();
    if (timeLeft <= 0) {
      clearInterval(interval);
      return;
    }

    const particleCount = 50 * (timeLeft / duration);

    confetti(
      Object.assign({}, defaults, {
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
      })
    );
    confetti(
      Object.assign({}, defaults, {
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
      })
    );
  }, 250);
};

onMounted(() => {
  startConfettiCelebration();
});
</script>

<style lang="scss" scoped>
.title {
  letter-spacing: 1.5px;
}
</style>
