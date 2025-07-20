<template>
  <div class="landing-board__container">
    <div class="board-title mb-4">
      <div class="gray michroma fs-16 letter-spacing-3">WELCOME</div>
      <span class="fs-21 michroma fw-400 snow-white letter-spacing-3"
        >CodeBreaker</span
      >
    </div>
    <div class="d-flex gap-5">
      <div class="game-reward">
        <inline-svg src="/icons/cash.svg"></inline-svg>
        100 MINA
      </div>
      <div class="d-flex gap-2">
        <CodePicker
          :editable="false"
          :secret="
            Array.from({ length: 4 }, () => ({ value: '?', color: '#fff' }))
          "
        />
      </div>
    </div>
    <div class="d-flex flex-column-reverse align-items-center mt-2 py-2">
      <div
        v-for="(guess, row) in guesses"
        class="d-flex gap-2 align-items-center my-1 w-100"
      >
        <Clue :clue="clues?.[row]" />
        <CodePicker
          :secret="guess"
          :editable="row === lastGuessIndex"
          @change="handleSetColor($event, row)"
        />
        <div class="btn-container w-100 h-100">
          <Button
            @click="generateClue"
            class="button-3 black radius-10 w-100 ps-0"
            size="large"
            v-if="row === lastGuessIndex && !isGameSolved"
          >
            <inline-svg src="/icons/send.svg" class="me-1" />
            <span>Send</span>
          </Button>
          <div
            class="button-placeholder radius-10  px-5"
            v-else
          ></div>
        </div>
      </div>
    </div>
  </div>
  <Modal v-if="isGameSolved || lastGuessIndex === 7" class="w-500">
    <div class="snow-white">
      <div class="d-flex justify-content-between bg-alpha-8-300-8 radius-10 py-2 px-3 default-border mb-3 fw-700 fs-16">
        <span v-if="isGameSolved"> Well Played! </span>
        <span v-else> That Was Just a Practice Run</span>

        <inline-svg src="/icons/diamond.svg"></inline-svg>
      </div>
      <div class="mt-2 fs-16²">
        <div v-if="isGameSolved">You've passed the test.</div>
        <div v-else>Don't worry, that's what practice is for.</div>
        <div class="my-3">Let's begin the tutorial and learn the winning strategies.</div>
      </div>
      <Button class="radius-10 w-100 black" size="large" @click="startOnboarding"> Go to Tutorial!</Button>
    </div>
  </Modal>
</template>

<script lang="ts" setup>
import Button from '@/components/shared/Button.vue';
import Clue from '@/components/shared/Clue.vue';
import CodePicker from '@/components/shared/CodePicker.vue';
import Modal from '@/components/shared/Modal.vue';
import { cluesColors, initialColor } from '@/constants/colors';
import { AvailableColor } from '@/types';
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const generateSecret = (): Array<number> => {
  const solution: Array<number> = [];
  while (solution.length < 4) {
    const r = Math.floor(Math.random() * 8);
    if (!solution.includes(r)) {
      solution.push(r);
    }
  }
  return solution;
};
const router = useRouter()
const hitColor = cluesColors.find((c) => c.value === 2);
const blowColor = cluesColors.find((c) => c.value === 1);
const missColor = cluesColors.find((c) => c.value === 0);
const lastGuessIndex = ref(0);
const secret = ref<Array<number>>(generateSecret());
const guesses = ref<Array<AvailableColor[]>>(
  Array.from({ length: 7 }, () => Array.from({ length: 4 }, () => initialColor))
);
const clues = ref<Array<AvailableColor[]>>(
  Array.from({ length: 7 }, () => Array.from({ length: 4 }, () => initialColor))
);
const isGameSolved = ref(false);
const handleSetColor = (secretCode: AvailableColor[], row: number) => {
  guesses.value[row] = [...secretCode];
};

const generateClue = () => {
  let hits = 0;
  let blows = 0;
  guesses.value[lastGuessIndex.value].map((e, index) => {
    if (secret.value.includes(e.value)) {
      if (secret.value[index] === e.value) {
        hits++;
      } else {
        blows++;
      }
    }
  });
  clues.value[lastGuessIndex.value] = [
    ...Array.from({ length: Number(hits) }, () => hitColor!),
    ...Array.from({ length: Number(blows) }, () => blowColor!),
    ...Array.from(
      { length: 4 - (Number(hits) + Number(blows)) },
      () => missColor!
    ),
  ];
  lastGuessIndex.value += 1;
  if (hits === 4) {
    isGameSolved.value = true;
  }
};
const startOnboarding = () => {
  router.push({name:'onboarding'})
}
</script>
<style lang="scss" scoped>
.btn-container {
  width: 96px;
  height: 46px;
}

.button-placeholder {
  background-blend-mode: luminosity;
  background: #0000001a;
  height: 45px;
  border: 1px solid #3B3D3F80;
}
.landing-board__container {
  background: $color-800;
  border: 2px solid rgba(59, 61, 63, 0.5);
  padding: 15px;
  border-radius: 20px;
}
</style>
