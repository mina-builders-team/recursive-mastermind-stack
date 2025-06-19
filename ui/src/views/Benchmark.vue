<template>
  <div class="benchmark-container">
    <div class="header">
      <p>
        This helps you measure how long your machine takes to generate proofs
        and transactions for the Mina Mastermind game. Run each step
        sequentially to benchmark your system's performance. These metrics will
        help you understand if your hardware is suitable for smooth gameplay.
      </p>
    </div>

    <el-card class="benchmark-card">
      <div v-if="!compiled" class="compilation-warning mb-2">
        Please Wait for compilation!
      </div>
      <div class="benchmark-row">
        <el-button
          class="flex-1 fw-bold"
          color="#00ADB5"
          size="large"
          type="primary"
          :loading="loadings.txLoading"
          @click="handleCreateDummyGameTx"
          :disabled="createGameTxTime !== null || loading || !compiled"
        >
          Create Game Transaction
        </el-button>
        <span class="time-result flex-1">{{ createGameTxTime ?? '--' }}s</span>
      </div>

      <div class="benchmark-row">
        <el-button
          size="large"
          class="flex-1 fw-bold"
          color="#00ADB5"
          :loading="loadings.createGameLoading"
          type="primary"
          @click="handleCreateDummyGameProof"
          :disabled="
            createGameProofTime !== null ||
            !createGameTxTime ||
            loading ||
            !compiled
          "
        >
          Create Game Proof
        </el-button>
        <span class="time-result flex-1"
          >{{ createGameProofTime ?? '--' }}s</span
        >
      </div>

      <div class="benchmark-row">
        <el-button
          class="flex-1 fw-bold"
          color="#00ADB5"
          size="large"
          :loading="loadings.makeGuessLoading"
          type="primary"
          @click="handleCreateDummyGuessProof"
          :disabled="
            makeGuessProofTime !== null ||
            !createGameProofTime ||
            loading ||
            !compiled
          "
        >
          Make Guess Proof
        </el-button>
        <span class="time-result flex-1"
          >{{ makeGuessProofTime ?? '--' }}s</span
        >
      </div>

      <div class="benchmark-row">
        <el-button
          class="flex-1 fw-bold"
          color="#00ADB5"
          size="large"
          :loading="loadings.giveClueLoading"
          type="primary"
          @click="handleCreateDummyClueProof"
          :disabled="
            giveClueProofTime !== null ||
            !makeGuessProofTime ||
            loading ||
            !compiled
          "
        >
          Give Clue Proof
        </el-button>
        <span class="time-result flex-1">{{ giveClueProofTime ?? '--' }}s</span>
      </div>

      <div class="footer">
        <el-button @click="reset" type="danger" >Reset</el-button>
      </div>
    </el-card>
  </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import { useZkAppStore } from '@/store/zkAppModule';
import { storeToRefs } from 'pinia';

const {
  createDummyClueProof,
  createDummyGameTransaction,
  createDummyGuessProof,
  createDummyGameProof,
} = useZkAppStore();
const { loading, compiled } = storeToRefs(useZkAppStore());

const createGameTxTime = ref<null | string>(null);
const createGameProofTime = ref<null | string>(null);
const makeGuessProofTime = ref<null | string>(null);
const giveClueProofTime = ref<null | string>(null);
const loadings = ref({
  txLoading: false,
  createGameLoading: false,
  makeGuessLoading: false,
  giveClueLoading: false,
});
const reset = () => {
  createGameTxTime.value =
    createGameProofTime.value =
    makeGuessProofTime.value =
    giveClueProofTime.value =
      null;
};

const handleCreateDummyGameTx = async () => {
  loadings.value.txLoading = true;
  const { duration } = await createDummyGameTransaction();
  createGameTxTime.value = duration;
  loadings.value.txLoading = false;
};

const handleCreateDummyGameProof = async () => {
  loadings.value.createGameLoading = true;
  const { duration } = await createDummyGameProof();
  createGameProofTime.value = duration;
  loadings.value.createGameLoading = false;
};

const handleCreateDummyGuessProof = async () => {
  loadings.value.makeGuessLoading = true;
  const { duration } = await createDummyGuessProof();
  makeGuessProofTime.value = duration;
  loadings.value.makeGuessLoading = false;
};

const handleCreateDummyClueProof = async () => {
  loadings.value.giveClueLoading = true;
  const { duration } = await createDummyClueProof();
  giveClueProofTime.value = duration;
  loadings.value.giveClueLoading = false;
};
</script>

<style scoped>
.benchmark-container {
  max-width: 600px;
  margin: 0 auto;
  padding: 2rem;
  font-family: 'Courier New', monospace;
}
.compilation-warning {
  color: #80deea;
}

.header {
  text-align: justify;
  margin-bottom: 2rem;
}

.header h1 {
  font-size: 1.8rem;
  color: #00f2ff;
}

.header p {
  font-size: 0.95rem;
  margin-top: 0.5rem;
}

.benchmark-card {
  background-color: #1c1c1c;
  border: 1px solid #00f2ff30;
  padding: 1rem 2rem;
  border-radius: 10px;
}

.benchmark-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.time-result {
  font-weight: bold;
  color: #80deea;
  min-width: 60px;
  text-align: right;
}

.footer {
  text-align: right;
  margin-top: 1rem;
}
</style>
