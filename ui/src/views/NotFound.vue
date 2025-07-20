<template>
  <div class="snow-white">
    <div class="fs-24 fw-700 mb-2">404: This Code Cannot Be Broken</div>
    <div class="my-3">
      Some paths are dead ends. Just as some codes cannot be broken. Like the
      page you were looking for, this puzzle has no solution.
    </div>
    <div class="bg-alpha-20-700-20 blend-multiply default-border p-10 radius-4 mb-2">
      <div v-for="item in 3" class="d-flex align-items-center justify-content-center gap-3 my-2">
        <Clue :clue="[missClue, missClue, missClue, missClue]" />
        <CodePicker :secret="getRandomSecret()" />
      </div>
    </div>
    <div class="d-flex justify-content-center">    <Button class="button-6 default-border snow-white px-4">Back to Home</Button>


    </div>
  </div>
</template>
<script setup lang="ts">
import Button from '@/components/shared/Button.vue';
import Clue from '@/components/shared/Clue.vue';
import CodePicker from '@/components/shared/CodePicker.vue';
import { cluesColors } from '@/constants/colors';
const missClue = cluesColors.find((c) => c.value === 0)!;
const codeAlphabet = ['?', 'X', '#', '!', 'O'].map((e) => ({
  value: e,
  color: 'linear-gradient(180deg, rgba(59, 61, 63, 0.5) 100%, rgba(255, 255, 255, 0.5) 100%)',
}));
const getRandomSecret = () => {
  return Array.from({ length: 4 }, () =>
    codeAlphabet[Math.floor(Math.random() * codeAlphabet.length)]
  );
};
</script>
<style lang="scss" scoped></style>
