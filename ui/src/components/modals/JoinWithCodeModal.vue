<template>
  <Modal @close="handleJoinCodeModalClose">
    <div class="snow-white d-flex flex-column gap-3">
      <div class="fw-600 fs-16">Join with the Code</div>
      <div class="fs-16">Enter the GameID</div>
      <PasteFromClipBoard
        placeholder=""
        @change="handleZkAppAddress"
        :inputValue="formatAddress(gameAddress)"
      />
      <div class="d-flex justify-content-between join-modal-footer">
        <el-button
          size="large"
          class="snow-white fw-400 bg-alpha-50-900-50 blend-darken back-btn"
          @click="handleJoinCodeModalClose"
          >Back</el-button
        >
        <el-button
          size="large"
          class="fw-400 black bg-light-gray search-btn"
          @click="handleJoinWihCode"
          >Search
        </el-button>
      </div>
      <div class="snow-white mt-2" v-if="!gameFound">
        Not Found! Try Again!
      </div>
    </div>
  </Modal>
</template>
<script lang="ts" setup>
import { ref } from 'vue';
import { formatAddress } from '@/utils';
import PasteFromClipBoard from '../shared/PasteFromClipBoard.vue';
import Timer from '../shared/Timer.vue';
import Modal from '../shared/Modal.vue';
import { useZkAppStore } from '@/store/zkAppModule';
import { storeToRefs } from 'pinia';
import { useRouter } from 'vue-router';
const { game } = storeToRefs(useZkAppStore());
const { getGame } = useZkAppStore();
const emit = defineEmits(['close']);
const router = useRouter();
const gameAddress = ref('');
const gameFound = ref(true);
const handleZkAppAddress = (input: string) => {
  gameAddress.value = input;
};
const handleJoinCodeModalClose = () => {
  emit('close');
};
const handleJoinWihCode = async () => {
  await getGame(gameAddress.value);
  if (game.value?.status !== 'PENDING') {
    router.push({
      name: 'gameplay',
      params: {
        id: gameAddress.value,
      },
    });
  } else {
    gameFound.value = false;
  }
};
</script>
<style lang="css" scoped>
.search-btn {
  border-radius: 10px;
  padding: 10px 30px;
}
.back-btn {
  border-radius: 10px;
  padding: 10px 30px;
  border: 1px solid #2c2f31;
}
</style>
