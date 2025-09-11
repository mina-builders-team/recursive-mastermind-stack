<template>
  <div
    class="default-border radius-10 bg-alpha-50-900-50 p-20 color-snow-white w-500"
  >
    <div class="fs-24 fw-700 w-100 title mb-2">Mastermind Game Guide</div>
    <strong class="mb-2 fs-16">Roles:</strong>
    <div class="w-100">
      <div class="mb-2">The game involves two players:</div>
      <div class="d-flex gap-2 w-100 mb-2">
        <div
          class="idle-container border-alpha-50-300-50 radius-10 p-2 px-3 w-50"
        >
          <div
            class="d-flex align-items-center justify-content-between color-snow-white"
          >
            <div>
              <div class="color-gray fw-600">Codemaster</div>
            </div>
            <inline-svg src="/icons/binary.svg"></inline-svg>
          </div>
          <div class="color-snow-white fs-12 mt-2">
            Sets a secret combination.
          </div>
        </div>
        <div
          class="idle-container border-alpha-50-300-50 radius-10 p-2 px-3 w-50"
        >
          <div
            class="d-flex align-items-center justify-content-between color-snow-white"
          >
            <div>
              <div class="color-gray fw-600">Codebreaker</div>
            </div>
            <inline-svg src="/icons/dice.svg"></inline-svg>
          </div>
          <div class="snow-white fs-12 mt-2">Tries to guess it</div>
        </div>
      </div>
    </div>
    <strong class="mb-2 fs-16">Gameplay flow:</strong>
    <ol class="mt-2">
      <li>The Code Breaker makes a guess.</li>
      <li>
        The Code Master immediately provides a <em>clue</em> to give feedback on
        that guess.
      </li>
      <li>
        Based on the clue, the Code Breaker adjusts their next guess and tries
        again.
      </li>
      <li>
        This continues until the Code Breaker finds the exact secret code or
        runs out of attempts.
      </li>
    </ol>
    <div class="d-flex flex-column align-items-start w-100">
      <strong class="mb-2 fs-16">Example:</strong>
      <div class="w-100 d-flex flex-column align-items-center justify-content-start gap-3">
        <div class="d-flex gap-2 align-items-center w-100">
          <div class="my-2 label">Secret Code:</div>
          <CodePicker :editable="false" :secret="secret" />
        </div>
        <div class="d-flex gap-2 align-items-center w-100">
          <div class="my-2 label">Guess And Clue:</div>
          <CodePicker :editable="false" :secret="guess" />
          <Clue :clue="[hitClue, hitClue, blowClue, missClue]" />
        </div>
      </div>
      <div class="mt-2">Result: 2 hits (green), 1 blow (white) and 1 miss (black).</div>
      <div class="mt-3">
        The game continues with alternating guesses and clues until the Code
        Breaker achieves 4 hits and uncovers the secret combination or fails to
        do so within <strong>the maximum allowed attempts.</strong>
      </div>
    </div>

    <Button size="large" class="color-black radius-10 w-100 mt-3" @click="goToPlay">
      <inline-svg src="/icons/rocket.svg" class="me-2" /> Next
    </Button>
  </div>
</template>
<script lang="ts" setup>
import Button from '@/components/shared/Button.vue';
import { ref } from 'vue';
import CodePicker from '../shared/CodePicker.vue';
import Clue from '../shared/Clue.vue';
import { cluesColors } from '@/constants/colors';
const secret = ref([
  { color: '#f9f9f9', value: 5 },
  { color: '#A1887F', value: 0 },
  { color: '#FFD54F', value: 3 },
  { color: '#22AC6A', value: 4 },
]);
const guess = ref([
  { color: '#f9f9f9', value: 5 },
  { color: '#7E57C2', value: 7 },
  { color: '#FF66B2', value: 3 },
  { color: '#A1887F', value: 0 },
]);
const hitClue = cluesColors.find((c) => c.value === 2)!;
const blowClue = cluesColors.find((c) => c.value === 1)!;
const missClue = cluesColors.find((c) => c.value === 0)!;
const emit = defineEmits(['next']);
const goToPlay = () => {
  emit('next');
};
</script>

<style lang="scss" scoped>
.title {
  letter-spacing: 2px;
}
.label {
  width: 100px;
}
</style>
