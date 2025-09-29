<template>
  <div class="d-flex flex-column align-items-center">
    <div class="mb-3 d-none mobile-notice ">
      <div class="fs-20 fw-600">
        On-chain Mina Mastermind is currently optimized for (desktop/laptop).
      </div>
      <div class="fs-20 mt-3">
        On computers, you can play against your friends and double your
        $MINA tokens.
      </div>
      <div class="fs-20 mt-3">However, you can now play the demo version.</div>
    </div>
    <div
      class="default-border radius-20 bg-alpha-50-900-50 p-2 color-snow-white tutorial-container"
    >
      <div class="fw-700 fs-24 w-100 d-flex justify-content-center my-4">
        {{ title }}
      </div>
      <div class="d-flex gap-2">
        <div
          class="default-border radius-10 bg-alpha-50-900-50 d-flex align-items-center gap-1 p-2 w-100 flex-1"
        >
          <Clue
            :clue="[
              hitClue,
              type === 'GREEN' ? hitClue : missClue,
              type === 'GREEN' ? hitClue : missClue,
              type === 'GREEN' ? hitClue : missClue,
            ]"
          />
          <div>
            <div class="fs-16 fw-600">Green Clue</div>
            <div class="fs-12 fw-400">Right Number, Right Spot.</div>
          </div>
        </div>
        <div
          class="default-border radius-10 bg-alpha-50-900-50 d-flex align-items-center gap-1 p-1 flex-1"
          v-if="type !== 'GREEN'"
        >
          <Clue :clue="[blowClue, missClue, missClue, missClue]" />
          <div class="fs-12 fw-400">
            <div class="fs-16 fw-600">White Clue</div>
            <div class="fs-12 fw-400">Right Number, Wrong Spot.</div>
          </div>
        </div>
      </div>
      <div
        class="default-border radius-10 bg-alpha-50-900-50 d-flex gap-3 w-100 justify-content-center align-items-center my-2 py-2"
      >
        <inline-svg src="/icons/key.svg" />
        <div>Numbers range from 0–7. No duplicates allowed.</div>
      </div>
      <div
        class="default-border radius-10 bg-alpha-50-900-50 d-flex w-100 mt-3"
      >
        <div class="w-100 p-2">
          <div
            v-for="(guess, row) in guesses"
            class="d-flex gap-2 align-items-center justify-content-center"
          >
            <div>
              <Round
                :clue="clues?.[row]"
                :guess="guess"
                @change="handleSetColor"
                :showBtn="false"
              />
            </div>
            <div
              class="tips-placeholder radius-10 d-flex cursor-pointer flex-1 bg-black"
              size="large"
              v-if="type === 'GREEN'"
            >
              <el-tooltip
                placement="right"
                effect="customized"
                :offset="-10"
                popper-class="tuttt"
              >
                <template #content>
                  <span>{{ tooltips[row] }}</span>
                </template>
                <div
                  class="d-flex align-items-center justify-content-center p-1 p-2 p-5-10 gray fs-10 px-4 py-3 w-100 color-gray"
                >
                  <inline-svg src="/icons/hover.svg" class="me-1"></inline-svg>
                  Hover For Hint
                </div>
              </el-tooltip>
            </div>
          </div>
        </div>

        <div
          class="tips-placeholder radius-10 d-flex cursor-pointer w-100 m-2"
          size="large"
          v-if="type !== 'GREEN'"
        >
          <el-tooltip placement="right" effect="customized" :offset="-10">
            <template #content>
              <slot name="tooltip"> </slot>
            </template>
            <div
              class="d-flex align-items-center justify-content-center p-1 p-2 p-5-10 gray fs-10 px-3 py-3 w-100 color-gray"
            >
              <inline-svg src="/icons/hover.svg" class="me-1"></inline-svg>
              Hover For Hint
            </div>
          </el-tooltip>
        </div>
      </div>

      <div
        class="default-border radius-10 bg-alpha-50-900-50 my-3 p-3"
        v-if="isWrongAnswer"
      >
        <div class="fw-600 fs-20">Try Again!</div>
        <div class="fs-12">
          <slot name="tryAgainText"></slot>
        </div>
      </div>
      <div v-if="isWrongAnswer === false">
        <div class="p-3 w-100 bg-alpha-8-300-8 border-alpha-8-300-8 mt-3">
          <div class="text-center fw-600 fs-20">
            <span v-if="isAnswerShown">Here’s The Answer</span>
            <span v-else>Congrats!</span>
          </div>
          <div class="d-flex gap-2 w-100 my-3 justify-content-center">
            <Clue :clue="[hitClue, hitClue, hitClue, hitClue]" />
            <CodePicker :secret="secret" />
          </div>
        </div>
        <Button
          class="cta-1 mt-2 radius-10 w-100 py-4 color-black"
          size="large"
          @click="handleNextStep"
        >
          <inline-svg src="/icons/rocket.svg" class="me-2" /> Next
        </Button>
      </div>

      <div v-else class="mt-3">
        <div class="text-center fw-600 fs-16 mb-2">Enter Your Answer Here:</div>
        <Round
          :clue="clue"
          :guess="guess"
          @change="handleSetColor"
          editable
          :editOnly="type === 'GREEN' ? [3] : undefined"
          :isCodeMasterTurn="false"
          isCurrentRound
          currentUserRole="CODE_BREAKER"
          @turnPlayed="submitGuess"
          :focusIndex="focusIndex"
        />

        <Button
          size="large"
          class="btn-cta3 bg-alpha-8-300-8 border-alpha-50-300-50 w-100 mt-3 p-4"
          @click="submitGuess(true)"
        >
          <span class="color-snow-white">Show Me Answer</span>
        </Button>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { cluesColors, initialColor } from '@/constants/colors';
import { AvailableColor } from '@/types';
import { ref } from 'vue';
import Button from '@/components/shared/Button.vue';
import Clue from '@/components/shared/Clue.vue';
import CodePicker from '@/components/shared/CodePicker.vue';
import Round from '../shared/Round.vue';
import { generateClue } from '@/utils';
const props = defineProps({
  title: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    required: true,
  },
  tooltips: {
    type: Array<String>,
    required: true,
  },
  secret: {
    type: Array<AvailableColor>,
    required: true,
  },
  guesses: {
    type: Array<AvailableColor[]>,
    required: true,
  },
  clues: {
    type: Array<AvailableColor[]>,
    required: true,
  },
  initialGuess: {
    type: Array<AvailableColor>,
    required: false,
    default: [initialColor, initialColor, initialColor, initialColor],
  },
  focusIndex: {
    type: Number,
    default: -1,
  },
});
const emit = defineEmits(['next']);

const hitClue = cluesColors.find((c) => c.value === 2)!;
const blowClue = cluesColors.find((c) => c.value === 1)!;
const missClue = cluesColors.find((c) => c.value === 0)!;
const isWrongAnswer = ref<Boolean | null>(null);
const isAnswerShown = ref<Boolean | undefined>(undefined);
const guess = ref(props.initialGuess);
const clue = ref<Array<AvailableColor>>(
  Array.from({ length: 4 }, () => missClue)
);

const handleSetColor = (selectedCode: AvailableColor[]) => {
  guess.value = [...selectedCode];
};

const submitGuess = (solved?: boolean) => {
  if (solved) {
    isWrongAnswer.value = false;
    isAnswerShown.value = solved;
    return;
  }
  const { isSolved, clue: receivedClue } = generateClue(
    guess.value,
    props.secret.map((e) => Number(e.value))
  );
  clue.value = receivedClue;
  isWrongAnswer.value = !isSolved;
};

const handleNextStep = () => {
  isAnswerShown.value = false;
  emit('next');
};
</script>

<style lang="scss" scoped>
.tips-placeholder {
  border: 1px solid rgba(170, 170, 170, 0.1);
}
.tutorial-container {
  width: 100%;
  max-width: 450px;
}
@media (max-width: 768px) {
  .tips-placeholder {
    display: none !important;
  }
  .mobile-notice {
    display: flex!important;
    flex-direction: column;
  }
}

</style>
