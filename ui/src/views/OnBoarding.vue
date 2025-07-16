<template>
  <div
    class="default-border radius-10 bg-alpha-50-900-50 p-20 snow-white"
    v-if="step === 0"
  >
    <div class="fw-bolder fs-24 text-center">
      Welcome to Mastermind on Mina!
    </div>
    <div class="fs-14 snow-white">
      <div class="mt-3">This isn't standard Mastermind.</div>
      <div class="mt-4">
        This is where strategy meets privacy, powered by ZK. We'll make you an
        expert codebreaker in just 3 simple steps.
      </div>
      <div class="mt-4">No waiting. Just learning, then winning.</div>
    </div>
    <div class="w-100 d-flex justify-content-center mt-4">
      <Button size="large" class="cta-1 radius-10 px-5" @click="handleNextStep">
        <inline-svg src="/icons/rocket.svg" class="me-2"></inline-svg>
        <span class="fs-14 fw-400">Enter the Journey!</span>
      </Button>
    </div>
  </div>
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
      You're so close! Remember what we learned: the numbers are 1-3 are not
      correct. since the example 2 & 3, we see likely 4 & 5 are in correct
      position. What else remaining?
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
          Now, compare the last two rows. The only change was swapping 4 and 3,
          and this made the single Green clue disappear. That tells you
          everything you need to know about where the number 4 truly belongs.
        </li>
      </ol>
    </template>

    <template #tryAgainText>
      <ol>
        <li>Your guess 4 3 1 2 earned you two 🟢 clues.</li>
        <li>
          You then swapped 4 and 3, and both🟢 clues vanished. This is
          definitive proof that the code begins with 4 3 _ _.
        </li>
      </ol>
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
          Tip 3: Here's the expert trick: If swapping a number keeps the score
          the same, both the old and new numbers are correct.
        </li>
        <li>
          Tip 4: Your goal is to find the four correct numbers first. Then, use
          any row's clues to arrange them.
        </li>
      </ol>
    </template>

    <template #tryAgainText>
      <ol>
        <li>
          The score is always 🟢 ⚪ each guess has exactly two correct numbers.
        </li>
        <li>
          Compare rows with the same score:
          <ul>
            <li>
              Swapping 1 <> 7 (rows 1 & 2) keeps the score → both are correct.
            </li>
            <li>
              Swapping 2 <> 3 (rows 2 & 3) also keeps the score → both are
              correct.
            </li>
          </ul>
        </li>
        <li>
          Conclusion: The secret code includes 1, 2, 3, 7. Others like 5 and 6
          are incorrect.
        </li>
      </ol>
    </template>
  </Tutorial>
  <BenchmarkResult @next="handleNextStep" v-if="step === 4" />
  <FinalOnBoarding @next="goToPlay" v-if="step === 5" />
</template>
<script setup lang="ts">
import { availableColors, cluesColors, initialColor } from '@/constants/colors';
import Button from '@/components/shared/Button.vue';
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


const route = useRoute()
const router = useRouter()
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
    'Zero greens. This confirms the numbers 1, 2, and 3 are all incorrect.',
    'Two greens. Two of these three numbers are in the correct spot.',
    'The score is unchanged. This proves the first spot is wrong, so the code must end in 5 4.',
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
  title: 'Tutorial 2: The White Clue',
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
      availableColors[6],
      availableColors[7],
      availableColors[3],
    ],
    [
      availableColors[5],
      availableColors[6],
      availableColors[3],
      availableColors[1],
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
    router.push({ name: 'home' });
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
<style lang="scss" scoped>
.info-container {
  background: rgba(139, 220, 151, 0.2) 100%;
  border: 1px solid #8bdc97;
  padding: 10px;
}
</style>
