<template>
  <div
    :class="[
      'd-flex guess__container p-2 align-items-center gap-2',
      { 'flex-row-reverse': userRole === 'CODE_MASTER' },
    ]"
  >
    <Clue :clue="clue" />
    <CodePicker
      :editable="
        editable ||
        (isCurrentRound && !isCodeMasterTurn && userRole === 'CODE_BREAKER')
      "
      :secret="guess"
      @change="handleSetColor"
    />
    <div class="btn-container w-100 h-100" v-if="showBtn">
      <Button
        @click="handleGiveClue"
        v-if="
          !loading &&
          isCurrentRound &&
          isCodeMasterTurn &&
          userRole === 'CODE_MASTER'
        "
        class="multi-line-button w-100 h-100 fs-7 fw-500 py-3 cta-1 radius-10 d-flex align-items-center gap-1 ps-0"
      >
        <inline-svg src="/icons/send.svg" />
        <span>
          {{ stepDisplay ? stepDisplay : 'Give Clue' }}
        </span>
      </Button>
      <Button
        :disabled="!combinationValidation.isValid"
        @click="handleSubmitGuess"
        :title="combinationValidation.message"
        :loading="loading"
        class="multi-line-button w-100 h-100 fs-7 fw-500 py-3 cta-1 radius-10 d-flex align-items-center gap-1 ps-0"
        size="large"
        v-else-if="
          !loading &&
          isCurrentRound &&
          !isCodeMasterTurn &&
          userRole === 'CODE_BREAKER'
        "
      >
        <inline-svg src="/icons/send.svg" class="me-1" />
        <span>{{ stepDisplay ? stepDisplay : 'Send' }}</span>
      </Button>
      <div
        v-else
        class="button-placeholder default-border radius-10 d-flex"
        size="large"
      >
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
          class="d-flex justify-content-around align-items-center alpha-20-000-20 p-2 old-proof"
        >
          <span>Recursive Proof Generated</span>
          <inline-svg
            width="10"
            height="6"
            src="/icons/generated-proof.svg"
          ></inline-svg>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed, ref } from 'vue';
import { AvailableColor } from '@/types';
import { useZkAppStore } from '@/store/zkAppModule';
import { storeToRefs } from 'pinia';
import { validateColorCombination } from '@/utils';
import { ElMessage } from 'element-plus';
import Button from '@/components/shared/Button.vue';
import { initialColor } from '@/constants/colors';
import CodePicker from '@/components/shared/CodePicker.vue';
import Clue from '@/components/shared/Clue.vue';
const {
  createGuessProof,
  createGiveClueProof,
  createGiveClueTransaction,
  createGuessTransaction,
} = useZkAppStore();
const {
  error,
  zkProofStates,
  loading,
  userRole,
  stepDisplay,
  isPlayingOnChain,
  zkAppStates,
  zkAppAddress,
} = storeToRefs(useZkAppStore());

const emit = defineEmits(['setColor']);
const props = defineProps({
  attemptNo: {
    type: Number,
    required: false,
    default: -1,
  },
  guess: {
    type: Array<AvailableColor>,
    required: true,
  },
  clue: {
    type: Array<AvailableColor>,
    required: false,
  },
  showBtn: {
    type: Boolean,
    required: false,
    default: true,
  },
  editable: {
    type: Boolean,
    required: false,
    default: false,
  },
});
const handleSubmitGuess = async () => {
  const code = props.guess.map((e: AvailableColor) => e.value);
  if (isPlayingOnChain.value) {
    await createGuessTransaction(code);
  } else {
    await createGuessProof(code);
  }
  if (error.value) {
    ElMessage.error({ message: error.value, duration: 6000 });
  }
};
const initializeSecret = () => {
  let storedGames = localStorage.getItem('games');
  if (storedGames) {
    const jsonGames = JSON.parse(storedGames);
    if (jsonGames && jsonGames[zkAppAddress.value as string]) {
      return {
        secretCode: jsonGames[zkAppAddress.value as string].secretCode,
        randomSalt: jsonGames[zkAppAddress.value as string].randomSalt,
      };
    }
  }
  return {
    secretCode: Array.from({ length: 4 }, () => initialColor),
    randomSalt: '',
  };
};
const secrets = initializeSecret();
const handleGiveClue = async () => {
  if (isPlayingOnChain.value) {
    await createGiveClueTransaction(
      secrets.secretCode.map((e: AvailableColor) => e.value),
      secrets.randomSalt
    );
  } else {
    await createGiveClueProof(
      secrets.secretCode.map((e: AvailableColor) => e.value),
      secrets.randomSalt
    );
  }
  if (error.value) {
    ElMessage.error({ message: error.value, duration: 6000 });
  }
};
const handleSetColor = (secretCode: AvailableColor[]) => {
  if (props.editable || (isCurrentRound.value && !isCodeMasterTurn.value)) {
    emit('setColor', secretCode);
  }
};
const isCodeMasterTurn = computed(() => {
  return isPlayingOnChain.value
    ? zkAppStates.value?.turnCount % 2 === 0
    : zkProofStates.value?.turnCount % 2 === 0;
});
const isCurrentRound = computed(() => {
  return isPlayingOnChain.value
    ? Math.ceil(zkAppStates.value?.turnCount / 2) === props.attemptNo + 1
    : Math.ceil(zkProofStates.value?.turnCount / 2) === props.attemptNo + 1;
});
const isOldRound = computed(() => {
  return isPlayingOnChain.value
    ? Math.ceil(zkAppStates.value?.turnCount / 2) > props.attemptNo + 1
    : Math.ceil(zkProofStates.value?.turnCount / 2) > props.attemptNo + 1;
});
const combinationValidation = computed(() => {
  return validateColorCombination(props.guess);
});
</script>
<style scoped lang="scss">
.old-proof {
  font-size: 8px;
}
.multi-line-button {
  white-space: normal;
  text-align: center;
  word-wrap: break-word;
  padding: 15px;
}
.btn-container {
  width: 96px;
  height: 46px;
}
.button-placeholder {
  background-blend-mode: luminosity;
  background: #0000001a;
  height: 45px;
}
</style>
