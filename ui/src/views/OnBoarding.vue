<template>
  <div class="w-100 h-100 d-flex flex-column align-items-center">
    <WelcomePage v-if="step === 0" @next="handleNextStep" />
    <div class="h-100 w-100 d-flex justify-content-center mt-5">
      <Tutorial
        :title="greenClue.title"
        :type="greenClue.type"
        :secret="greenClue.secret"
        :guesses="greenClue.guesses"
        :clues="greenClue.clues"
        :initialGuess="greenClue.initialGuess"
        :tooltips="greenClue.tooltips"
        @next="handleNextStep"
        v-if="step === 1"
      >
        <template #tryAgainText>
          You're so close! Remember: 5, 6, 7, and 0 are not in the code at all.
          And when we tried 1 2 3 7, we got three greens—so the code likely ends
          with a digit that's not 0, 5, 6, or 7. What else remaining?
        </template>
      </Tutorial>
      <Tutorial
        :title="whiteClue.title"
        :type="whiteClue.type"
        :secret="whiteClue.secret"
        :guesses="whiteClue.guesses"
        :clues="whiteClue.clues"
        :tooltips="whiteClue.tooltips"
        @next="handleNextStep"
        v-else-if="step === 2"
      >
        <template #tooltip>
          <ol>
            <li>
              The first row's 4 white clues confirm the secret code contains the
              numbers 1, 2, 3, and 4.
            </li>
            <li>
              Now, compare the last two rows. The only change was swapping 4 and
              3, and this made the single green clue disappear. That tells you
              everything you need to know about where the number 4 truly
              belongs.
            </li>
          </ol>
        </template>

        <template #tryAgainText>
          <div class="mb-3">
            <div>1. Your guess 4 3 1 2 earned you two 🟢 clues.</div>
            <div>
              2. You then swapped 4 and 3, and both🟢 clues vanished. This is
              definitive proof that the code begins with 4 3 _ _.
            </div>
          </div>
          You now know the first two 2tmbers for certain.
        </template>
      </Tutorial>
      <Tutorial
        :title="finalClue.title"
        :type="finalClue.type"
        :secret="finalClue.secret"
        :guesses="finalClue.guesses"
        :clues="finalClue.clues"
        :tooltips="finalClue.tooltips"
        @next="handleNextStep"
        v-if="step === 3"
      >
        <template #tooltip>
          <ol>
            <li>
              Tip 1: Your score is always the same. This proves every guess has
              exactly two correct numbers.
            </li>
            <li>
              Tip 2: The key is to compare two rows at a time. Focus only on the
              single number that was swapped.
            </li>
            <li>
              Tip 3: Here's the expert trick: If swapping a number keeps the
              score the same, both the old and new numbers are correct.
            </li>
            <li>
              Tip 4: Your goal is to find the four correct numbers first. Then,
              use any row's clues to arrange them.
            </li>
          </ol>
        </template>

        <template #tryAgainText>
          <div class="fs-12 mt-2">
            <div>
              1. The score is always 🟢 ⚪ each guess has exactly two correct
              numbers.
            </div>
            <div>
              2. Compare rows with the same score:
              <ul>
                <li>
                  Swapping 1 <> 7 (rows 1 & 2) keeps the score → both are
                  correct.
                </li>
                <li>
                  Swapping 2 <> 3 (rows 2 & 3) also keeps the score → both are
                  correct.
                </li>
              </ul>
            </div>
            <div>
              3. Conclusion: The secret code includes 1, 2, 3, 7. Others like 5
              and 6 are incorrect.
            </div>
          </div>
        </template>
      </Tutorial>
      <BenchmarkResult @next="handleNextStep" v-if="step === 4" />
      <FinalOnBoarding @next="goToPlay" v-if="step === 5" />
    </div>
  </div>
</template>
<script setup lang="ts">
import { availableColors, cluesColors, initialColor } from '@/constants/colors';
import Tutorial from '@/components/onboarding/Tutorial.vue';
import { useZkAppStore } from '@/store/zkAppModule';

const { startBenchmark } = useZkAppStore();
const { compiled } = storeToRefs(useZkAppStore());
const emit = defineEmits(['end']);
const hitClue = cluesColors.find((c) => c.value === 2)!;
import { onMounted, ref, watch } from 'vue';
import BenchmarkResult from '@/components/onboarding/BenchmarkResult.vue';
import FinalOnBoarding from '@/components/onboarding/FinalOnBoarding.vue';
import { storeToRefs } from 'pinia';
import { useRoute, useRouter } from 'vue-router';
import WelcomePage from '@/components/onboarding/welcomePage.vue';

const route = useRoute();
const router = useRouter();
const blowClue = cluesColors.find((c) => c.value === 1)!;
const missClue = cluesColors.find((c) => c.value === 0)!;

const greenClue = {
  title: 'Tutorial 1: The Green Clue',
  type: 'GREEN',
  secret: [
    availableColors[1],
    availableColors[2],
    availableColors[3],
    availableColors[4],
  ],
  tooltips: [
    'two greens. This confirms that 2 numbers are in the correct spot',
    'Three greens. This confirms that 3 numbers are in the correct spot.',
    'Zero greens: The digits 5, 6, 7, and 0 do not appear anywhere in the code.',
  ],
  guesses: [
    [
      availableColors[1],
      availableColors[2],
      availableColors[5],
      availableColors[6],
    ],
    [
      availableColors[1],
      availableColors[2],
      availableColors[3],
      availableColors[7],
    ],
    [
      availableColors[5],
      availableColors[6],
      availableColors[7],
      availableColors[0],
    ],
  ],
  clues: [
    [hitClue, hitClue, missClue, missClue],
    [hitClue, hitClue, hitClue, missClue],
    [missClue, missClue, missClue, missClue],
  ],
  initialGuess: [
    availableColors[1],
    availableColors[2],
    availableColors[3],
    initialColor,
  ],
};
const whiteClue = {
  title: 'Tutorial 2: The White Clue',
  type: 'WHITE',
  secret: [
    availableColors[4],
    availableColors[3],
    availableColors[2],
    availableColors[1],
  ],
  tooltips: [],
  guesses: [
    [
      availableColors[1],
      availableColors[2],
      availableColors[3],
      availableColors[4],
    ],
    [
      availableColors[4],
      availableColors[3],
      availableColors[1],
      availableColors[2],
    ],
    [
      availableColors[3],
      availableColors[4],
      availableColors[1],
      availableColors[2],
    ],
  ],
  clues: [
    [blowClue, blowClue, blowClue, blowClue],
    [hitClue, hitClue, blowClue, blowClue],
    [blowClue, blowClue, blowClue, blowClue],
  ],
};
const finalClue = {
  title: 'Tutorial 3: Putting It All Together',
  type: 'WHITE',
  secret: [
    availableColors[3],
    availableColors[2],
    availableColors[7],
    availableColors[1],
  ],
  tooltips: [],
  guesses: [
    [
      availableColors[1],
      availableColors[2],
      availableColors[5],
      availableColors[6],
    ],
    [
      availableColors[2],
      availableColors[5],
      availableColors[7],
      availableColors[6],
    ],
    [
      availableColors[5],
      availableColors[3],
      availableColors[7],
      availableColors[6],
    ],
  ],
  clues: [
    [hitClue, blowClue, missClue, missClue],
    [hitClue, blowClue, missClue, missClue],
    [hitClue, blowClue, missClue, missClue],
    [hitClue, blowClue, missClue, missClue],
  ],
};
const step = ref(0);
const handleNextStep = () => {
  step.value += 1;
};
const goToPlay = () => {
  const redirectPath = route.query.redirect as string;
  if (redirectPath) {
    router.push(redirectPath);
  } else {
    router.push({ name: 'lobby' });
  }

  emit('end');
};
onMounted(async () => {
  if (compiled.value) {
    await startBenchmark();
  }
});
watch(
  () => compiled.value,
  async () => {
    if (compiled.value) {
      await startBenchmark();
    }
  }
);
</script>
<style lang="scss" scoped></style>
