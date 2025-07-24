<template>
  <div
    :class="[
      'd-flex guess__container p-2 align-items-center gap-2',
      { 'flex-row-reverse': userRole === 'CODE_MASTER' },
    ]"
  >
    <Round
      :guess="guess"
      :clue="clue!"
      :editable="
        isCurrentRound && !isCodeMasterTurn && userRole === 'CODE_BREAKER'
      "
      :isOldRound="isOldRound"
      :isCurrentRound="isCurrentRound"
      :currentUserRole="userRole!"
      :showBtn="true"
      :isCodeMasterTurn="isCodeMasterTurn"
      :loading="loading"
      :stepDisplay="stepDisplay"
      @turnPlayed="handleTurnPlayed"
      @change="handleSetColor"
    />
  </div>
</template>
<script setup lang="ts">
import { computed, ref } from 'vue';
import { AvailableColor } from '@/types';
import { useZkAppStore } from '@/store/zkAppModule';
import { storeToRefs } from 'pinia';
import { ElMessage } from 'element-plus';
import { initialColor } from '@/constants/colors';
import Round from '../shared/Round.vue';
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
  const code = props.guess.map((e: AvailableColor) => Number(e.value));
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

const handleTurnPlayed = async () => {
  if (userRole.value === 'CODE_MASTER') {
    await handleGiveClue()
  } else if (userRole.value === 'CODE_BREAKER') {
    await handleSubmitGuess()
  }
}

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
