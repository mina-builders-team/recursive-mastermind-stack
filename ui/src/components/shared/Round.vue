<template>
  <div
    :class="[
      'd-flex gap-2 align-items-center my-1 w-100',
      { 'flex-row-reverse': currentUserRole === 'CODE_MASTER' },
    ]"
  >
    <Clue :clue="clue" />
    <CodePicker
      :secret="guess"
      :editable="editable"
      @change="handleSetColor"
      :editOnly="editOnly"
      :focusIndex="focusIndex"
    />
    <div class="btn-container w-100 h-100" v-if="showBtn">
      <el-tooltip
        placement="right"
        effect="customized"
        v-if="
          isCurrentRound &&
          ((isCodeMasterTurn && currentUserRole === 'CODE_MASTER') ||
            (!isCodeMasterTurn && currentUserRole === 'CODE_BREAKER')) &&
          lastTurnTransactionHash !== '' &&
          !loading
        "
      >
        <template #content>
          You may want to recheck your transactions status by
          <span class="text-underline"
            ><a
              :href="`https://minascan.io/devnet/tx/${lastTurnTransactionHash}?type=zk-tx`"
              target="_blank"
              rel="noopener noreferrer"
              class="link"
              >here
            </a></span
          >. You may also resend your transaction with the costs
        </template>
        <Button
          @click="turnPlayed"
          class="color-snow-white bg-pink-3 radius-10 w-100 ps-0 fw-600 fs-12 d-flex h-45"
          size="large"
        >
          <inline-svg src="/icons/send.svg" class="me-1" />
          <span>Resend?</span>
        </Button>
      </el-tooltip>

      <template v-else>
        <Button
          @click="turnPlayed"
          v-if="
            !loading &&
            isCurrentRound &&
            ((isCodeMasterTurn && currentUserRole === 'CODE_MASTER') ||
              (!isCodeMasterTurn && currentUserRole === 'CODE_BREAKER'))
          "
          class="color-black radius-10 w-100 ps-0 fw-600 fs-12 d-flex h-45"
          size="large"
        >
          <inline-svg src="/icons/send.svg" class="me-1" />
          <span v-if="currentUserRole === 'CODE_MASTER'"> Give Clue </span>
          <span v-else>Sign</span>
        </Button>
        <div v-else class="button-placeholder default-border radius-10 d-flex">
          <div
            v-if="loading && isCurrentRound"
            class="fs-12 d-flex align-items-center p-1"
          >
            <inline-svg
              src="/icons/processing-proof.svg"
              class="me-1"
            ></inline-svg>
            Processing...
          </div>
          <div
            v-else-if="isOldRound"
            class="d-flex justify-content-center align-items-center color-alpha-20-000-20 fs-8 h-100 px-2 gap-1 blend-lighten"
          >
            <div>
              <div>Recursive</div>
              <div>Proof Generated</div>
            </div>
            <inline-svg
              :width="13"
              :height="13"
              src="/icons/generated-proof.svg"
            ></inline-svg>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { AvailableColor } from '@/types';
import Button from './Button.vue';
import CodePicker from './CodePicker.vue';
import Clue from './Clue.vue';
import { validateColorCombination } from '@/utils';
import { useCustomMessage } from '@/composables/useCustomMessage';

const props = defineProps({
  loading: {
    type: Boolean,
    required: false,
    default: false,
  },
  guess: {
    type: Array<AvailableColor>,
    required: true,
  },
  clue: {
    type: Array<AvailableColor>,
    required: true,
  },
  editable: {
    type: Boolean,
    default: false,
  },
  showBtn: {
    type: Boolean,
    default: true,
  },
  isCurrentRound: {
    type: Boolean,
    required: false,
  },
  isOldRound: {
    type: Boolean,
    required: false,
  },
  currentUserRole: {
    type: String,
    required: false,
  },
  isCodeMasterTurn: {
    type: Boolean,
    required: false,
  },
  editOnly: {
    type: Array<number>,
    required: false,
    default: [0, 1, 2, 3],
  },
  lastTurnTransactionHash: {
    type: String,
    required: false,
    default: '',
  },
    focusIndex: {
    type: Number,
    default: -1,
  },
});
const emit = defineEmits(['change', 'turnPlayed']);
const { showMessage } = useCustomMessage();

const handleSetColor = (secretCode: AvailableColor[]) => {
  emit('change', secretCode);
};
const turnPlayed = () => {
  if (props.editable) {
    const validation = validateColorCombination(props.guess);
    if (!validation.isValid) {
      showMessage({
        type: 'error',
        title: 'Invalid Combination',
        description:
          'Please choose a combination of 4 unique digits between 0 and 7',
        duration: 3000,
      });
      return;
    }
  }
  emit('turnPlayed');
};
</script>
<style lang="scss" scoped>
.button-placeholder {
  background-blend-mode: luminosity;
  background: #0000001a;
  border: 1px solid #aaaaaa1a;
  width: 96px;
  height: 46px;
}
.h-45 {
  height: 45px;
}
</style>
