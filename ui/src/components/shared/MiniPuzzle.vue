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
        <Round
          :clue="clues?.[row]"
          :guess="guess"
          :editable="row === lastGuessIndex"
          @change="handleSetColor($event, row)"
          :isCurrentRound="row === lastGuessIndex"
          :showBtn="false"
        />
      </div>
      <div class="d-flex mt-3">
        <Button @click="resetSecret" size="large" class="cta-3 fw-400"
          >Reset</Button
        >
        <Button @click="submitGuess" size="large" class="cta-3 fw-400"
          >Submit</Button
        >
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref } from 'vue';
import { AvailableColor } from '@/types';
import { initialColor } from '@/constants/colors';
import Button from '@/components/shared/Button.vue';
import Round from './Round.vue';
import { generateClue, generateRandomSecret } from '@/utils';

const secret = ref<Array<number>>(generateRandomSecret());
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

const submitGuess = () => {
  const { clue } = generateClue(
    guesses.value[lastGuessIndex.value],
    secret.value
  );
  clues.value[lastGuessIndex.value] = clue;
  lastGuessIndex.value += 1;
};
const resetSecret = () => {
  secret.value = generateRandomSecret();
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
