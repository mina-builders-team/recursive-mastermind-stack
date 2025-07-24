<template>
  <div class="landing-board__container">
    <div class="mb-4 d-flex justify-content-between">
      <div>
        <div class="color-gray michroma fs-15 letter-spacing-3">WELCOME</div>
        <span class="fs-21 michroma color-color-snow-white letter-spacing-3"
          >CodeBreaker</span
        >
      </div>
      <div class="d-flex align-items-center gap-2">
        <div class="online bg-green mb-1"></div>
        <span>Server</span>
      </div>
    </div>
    <div class="d-flex gap-5 align-items-center">
      <div class="black-game-reward h-fit-content p-10">
        <inline-svg src="/icons/cash.svg"></inline-svg>
        0 MINA
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
    <div class="d-flex flex-column-reverse align-items-center mt-2 py-2 w-100">
      <div class="w-100" v-for="(guess, row) in guesses">
        <Round
          :clue="clues?.[row]"
          :guess="guess"
          :editable="row === lastGuessIndex"
          @change="handleSetColor($event, row)"
          :isCurrentRound="row === lastGuessIndex"
          @turnPlayed="submitGuess"
          currentUserRole="CODE_BREAKER"
          :isCodeMasterTurn="false"
          :isOldRound="row < lastGuessIndex"
        />
      </div>
    </div>
  </div>

</template>

<script lang="ts" setup>
import CodePicker from '@/components/shared/CodePicker.vue';
import { initialColor } from '@/constants/colors';
import { AvailableColor } from '@/types';
import { ref } from 'vue';
import Round from '../shared/Round.vue';
import { generateClue, generateRandomSecret } from '@/utils';
const emit = defineEmits(['ended'])
const lastGuessIndex = ref(0);
const secret = ref<Array<number>>(generateRandomSecret());
const guesses = ref<Array<AvailableColor[]>>(
  Array.from({ length: 7 }, () => Array.from({ length: 4 }, () => initialColor))
);
const clues = ref<Array<AvailableColor[]>>(
  Array.from({ length: 7 }, () => Array.from({ length: 4 }, () => initialColor))
);
const handleSetColor = (secretCode: AvailableColor[], row: number) => {
  guesses.value[row] = [...secretCode];
};

const submitGuess = () => {
  const { clue, isSolved } = generateClue(
    guesses.value[lastGuessIndex.value],
    secret.value
  );
  clues.value[lastGuessIndex.value] = clue;
  lastGuessIndex.value += 1;
  if (lastGuessIndex.value === 7 || isSolved) {
    emit("ended",isSolved)
  }
};
</script>
<style lang="scss" scoped>
.btn-container {
  width: 96px;
  height: 46px;
  background: #0000001a;
}

.button-placeholder {
  background-blend-mode: luminosity;
  background: #0000001a;
  height: 45px;
  border: 1px solid #aaaaaa1a;
}
.landing-board__container {
  background: $color-800;
  border: 2px solid rgba(59, 61, 63, 0.5);
  padding: 15px;
  border-radius: 20px;
}
.online {
  width: 5px;
  height: 5px;
  border-radius: 50%;
}
</style>
