<template>
  <Modal @close="handleJoinCodeModalClose">
    <div class="color-snow-white d-flex flex-column gap-3">
      <div class="fw-600 fs-16">Join With Code</div>
      <div class="fs-16">Enter The GameID</div>
      <PasteFromClipBoard
        placeholder=""
        @change="handleZkAppAddress"
        :inputValue="formatAddress(gameAddress)"
      />
      <div class="d-flex justify-content-between join-modal-footer">
        <Button
          size="large"
          class="color-snow-white fw-400 bg-alpha-50-900-50 blend-darken back-btn btn-cta3 default-border color-snow-white"
          @click="handleJoinCodeModalClose"
          >Back</Button
        >
        <Button
          size="large"
          class="fw-400 black bg-snow-white search-btn color-black"
          @click="handleJoinWihCode"
          ><span>Search</span>
        </Button>
      </div>
      <div
        class="color-snow-white mt-2 fs-16 fw-600 color-pink3"
        v-if="!gameFound"
      >
        Not Found! Try Again!
      </div>
    </div>
  </Modal>
</template>
<script lang="ts" setup>
import { ref } from 'vue';
import { formatAddress } from '@/utils';
import PasteFromClipBoard from '../shared/PasteFromClipBoard.vue';
import Modal from '../shared/Modal.vue';
import { useZkAppStore } from '@/store/zkAppModule';
import { useRouter } from 'vue-router';
import Button from '../shared/Button.vue';
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
  if (gameAddress.value) {
    await getGame(gameAddress.value);
    router.push({
      name: 'gameplay',
      params: {
        id: gameAddress.value,
      },
    });
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
