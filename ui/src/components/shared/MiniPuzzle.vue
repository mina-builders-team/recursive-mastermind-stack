<template>
  <div class="default-border radius-10 bg-alpha-50-900-50 p-20 snow-white">
    <div class="d-flex justify-content-between align-items-center">
      <div>
        <div class="fs-5 fw-600">Mini Puzzle</div>
        <div>(Numbers are between 0-7)</div>
      </div>
    </div>
    <div
      class="d-flex flex-column align-items-center default-border radius-10 mt-2 py-2"
    >
      <div
        v-for="(guess, row) in guesses"
        class="d-flex gap-2 align-items-center my-1"
      >
        <Clue :clue="clues?.[row]" />
        <CodePicker
          :secret="guess"
          :editable="row === lastGuessIndex"
          @change="handleSetColor($event, row)"
        />
      </div>
      <div class="d-flex mt-3">
        <Button @click="resetSecret" size="large" class="cta-3 fw-400"
          >Reset</Button
        >
        <Button @click="generateClue" size="large" class="cta-3 fw-400"
          >Submit</Button
        >
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref } from 'vue';
import { AvailableColor } from '@/types';
import { cluesColors, initialColor } from '@/constants/colors';
import Button from '@/components/shared/Button.vue';
import CodePicker from '@/components/shared/CodePicker.vue';
import Clue from '@/components/shared/Clue.vue';

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
const secret = ref<Array<number>>(generateSecret());
const hitColor = cluesColors.find((c) => c.value === 2);
const blowColor = cluesColors.find((c) => c.value === 1);
const missColor = cluesColors.find((c) => c.value === 0);
const lastGuessIndex = ref(0);
const guesses = ref<Array<AvailableColor[]>>(
  Array.from({ length: 3 }, () => Array.from({ length: 4 }, () => initialColor))
);
const clues = ref<Array<AvailableColor[]>>(
  Array.from({ length: 3 }, () => Array.from({ length: 4 }, () => initialColor))
);

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
};
const resetSecret = () => {
  secret.value = generateSecret();
  guesses.value = Array.from({ length: 3 }, () =>
    Array.from({ length: 4 }, () => initialColor)
  );
  clues.value = Array.from({ length: 3 }, () =>
    Array.from({ length: 4 }, () => initialColor)
  );
  lastGuessIndex.value = 0;
};
</script>
<style lang="scss" scoped></style>
