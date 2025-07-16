<template>
  <div
    class="default-border radius-20 bg-alpha-50-900-50 p-20 snow-white"
  >
    <div class="fw-700 fs-24 w-100 d-flex justify-content-center">
      {{ title }}
    </div>
    <div class="d-flex gap-2">
      <div
        class="default-border radius-10 bg-alpha-50-900-50 d-flex gap-3 p-2 w-100 flex-1"
      >
        <Clue :clue="[hitClue, missClue, missClue, missClue]" />
        <div class="fs-12 fw-400">
          <div>Green Clue</div>
          <div>Right Number, Right Spot.</div>
        </div>
      </div>
      <div
        class="default-border radius-10 bg-alpha-50-900-50 d-flex gap-3 p-2 flex-1"
        v-if="type !== 'GREEN'"
      >
        <Clue :clue="[blowClue, missClue, missClue, missClue]" />
        <div class="fs-12 fw-400">
          <div>White Clue</div>
          <div>Right Number, Wrong Spot.</div>
        </div>
      </div>
    </div>
    <div
      class="default-border radius-10 bg-alpha-50-900-50 d-flex gap-3 w-100 justify-content-center my-2 py-2"
    >
      <inline-svg src="/icons/key.svg" />
      <div>Numbers are 0-7. No repeats.</div>
    </div>
    <div class="default-border radius-10 bg-alpha-50-900-50 d-flex w-100">
      <div class="w-100 p-2">
        <div
          v-for="(guess, row) in guesses"
          class="d-flex gap-2 align-items-center my-2 justify-content-center"
        >
          <Clue :clue="clues?.[row]" />
          <CodePicker :secret="guess" @change="handleSetColor" />
          <div
            class="button-placeholder default-border radius-10 d-flex cursor-pointer flex-1"
            size="large"
            v-if="type === 'GREEN'"
          >
            <el-tooltip placement="right" effect="customized" :offset="-10">
              <template #content>
                <span>{{ tooltips[row] }}</span>
              </template>
              <div
                class="d-flex align-items-center p-1 p-2 p-5-10 gray fs-10 px-4 py-3"
              >
                <inline-svg src="/icons/hover.svg" class="me-1"></inline-svg>
                Hover For Tip
              </div>
            </el-tooltip>
          </div>
        </div>
      </div>

      <div
        class="button-placeholder default-border radius-10 d-flex cursor-pointer"
        size="large"
        v-if="type !== 'GREEN'"
      >
        <el-tooltip placement="right" effect="customized" :offset="-10">
          <template #content>
            <slot name="tooltip"> </slot>
          </template>
          <div
            class="d-flex align-items-center p-1 p-2 p-5-10 gray fs-10 px-4 py-3"
          >
            <inline-svg src="/icons/hover.svg" class="me-1"></inline-svg>
            Hover For Tip
          </div>
        </el-tooltip>
      </div>
    </div>

    <div
      class="default-border radius-10 bg-alpha-50-900-50 my-3 p-3"
      v-if="isWrongAnswer"
    >
      <div class="fs-5">Try Again!</div>
      <div class="fs-12">
        <slot name="tryAgainText"></slot>
      </div>
    </div>
    <div v-if="isWrongAnswer === false">
      <div class="default-border radius-10 bg-alpha-50-900-50 p-3 w-100 mt-3">
        <div class="text-center fw-600 fs-21">Congrats!</div>
        <div class="d-flex gap-2 w-100 my-3 justify-content-center">
          <Clue :clue="[hitClue, hitClue, hitClue, hitClue]" />
          <CodePicker :secret="secret" />
        </div>
        <Button
          class="cta-1 radius-10 w-100"
          size="large"
          @click="handleNextStep"
        >
          <inline-svg src="/icons/rocket.svg" class="me-2" /> Next
        </Button>
      </div>
    </div>

    <div v-else class="my-3">
      <div class="text-center fw-600 mb-2">Enter Your Answer here:</div>
      <div class="d-flex gap-2 w-100">
        <Clue :clue="clue" />
        <div class="d-flex gap-2 w-100">
          <div class="d-flex gap-2">
            <CodePicker
              :secret="guess"
              @change="handleSetColor"
              editable
              :editOnly="type === 'GREEN' ? [3] : undefined"
            />
          </div>
          <Button
            size="large"
            class="cta-1 radius-10 h-100 flex-1"
            @click="generateClue"
            >Send</Button
          >
        </div>
      </div>
      <Button size="large" class="cta-3 w-100 mt-3" @click="generateClue(true)">
        Show me Me Answer
      </Button>
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
});
const emit = defineEmits(['next']);

const hitClue = cluesColors.find((c) => c.value === 2)!;
const blowClue = cluesColors.find((c) => c.value === 1)!;
const missClue = cluesColors.find((c) => c.value === 0)!;
const isWrongAnswer = ref<Boolean | null>(null);
const guess = ref(props.initialGuess);
const clue = ref<Array<AvailableColor>>(
  Array.from({ length: 4 }, () => initialColor)
);

const handleSetColor = (selectedCode: AvailableColor[]) => {
  guess.value = [...selectedCode];
};

const generateClue = (solved?: boolean) => {
  if (solved) {
    isWrongAnswer.value = false;
    return;
  }
  let hits = 0;
  let blows = 0;
  guess.value.map((e, index) => {
    if (props.secret.map((e) => e.value).includes(e.value)) {
      if (props.secret.map((e) => e.value)[index] === e.value) {
        hits++;
      } else {
        blows++;
      }
    }
  });
  clue.value = [
    ...Array.from({ length: Number(hits) }, () => hitClue!),
    ...Array.from({ length: Number(blows) }, () => blowClue!),
    ...Array.from(
      { length: 4 - (Number(hits) + Number(blows)) },
      () => missClue!
    ),
  ];
  isWrongAnswer.value = hits !== 4;
};

const handleNextStep = () => {
  emit('next');
};
</script>

<style lang="scss">
.el-popper.is-customized {
  padding: 6px 12px;
  background: #27282a80 !important ;
  color: $snow-white !important;
  backdrop-filter: blur(20px);
  width: 240px;
}
.el-popper__arrow {
  height: 100%;
  transform: unset !important;
}
.el-popper.is-customized .el-popper__arrow::before {
  content: '';
  width: 6px;
  background: #d9d9d9;
  transform: unset;
  height: 100%;
  border-top-left-radius: 4px;
  border-bottom-left-radius: 4px;
}
</style>
