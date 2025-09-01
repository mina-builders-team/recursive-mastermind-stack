<template>
  <div class="default-border radius-10 p-20 color-snow-white puzzle-container">
    <div class="d-flex justify-content-between align-items-center">
      <div>
        <div class="fs-5 fw-600 fs-16">Mini Puzzle</div>
        <div class="fs-12">(Numbers are between 0-7)</div>
      </div>
    </div>
    <div
      class="d-flex flex-column align-items-center mt-2 py-2 puzzle-board__container"
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
        <Button
          @click="resetSecret"
          size="large"
          class="btn-cta3 color-snow-white fw-400 px-5 default-border"
          >Reset</Button
        >
        <Button
          @click="submitGuess"
          size="large"
          class="btn-cta3 color-snow-white fw-400 px-5 default-border"
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
import {
  generateClue,
  generateRandomSecret,
  validateColorCombination,
} from '@/utils';
import { useCustomMessage } from '@/composables/useCustomMessage';
const { showMessage } = useCustomMessage();
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
  const { isValid, message } = validateColorCombination(
    guesses.value[lastGuessIndex.value]
  );
  if (isValid) {
    const { clue } = generateClue(
      guesses.value[lastGuessIndex.value],
      secret.value
    );
    clues.value[lastGuessIndex.value] = clue;
    lastGuessIndex.value += 1;
  } else {
    showMessage({
      title: 'Invalid Combination',
      description: message,
      type: 'error',
      duration: 3000,
      showClose: false,
    });
  }
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
<style lang="scss" scoped>
.puzzle-container {
  background:
    linear-gradient(0deg, $alpha-20-900-20 0%, $alpha-20-900-20 100%),
    $alpha-50-900-50;
  background-blend-mode: darken;
}
.puzzle-board__container {
  border-radius: 4px;
  border: 1px solid $alpha-20-300-20;
  background: $alpha-20-700-20;
  background-blend-mode: multiply;
}
</style>
