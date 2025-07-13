<template>
 <div class="w-100 lobby-container">
    <h2 class="fw-bold play-title">PLAY</h2>
    <div class="d-flex justify-content-between align-items-end">
      <div>
        <div>Discover and join available Mina Mastermind games.</div>
      </div>
      <div class="d-flex gap-2">
        <Button class="cta-1" @click="handleJoinWithCode">
          <inline-svg class="me-2" src="/icons/binary.svg"></inline-svg>
          Join with Code
        </Button>
        <Button class="cta-2" @click="handleCreateChallenge">
          <inline-svg class="me-2" src="/icons/dice.svg"></inline-svg>
          Create a Challenge
        </Button>
      </div>
    </div>
    <div
      class="mt-5 p-1 d-flex w-100 justify-content-between align-items-center lobby-tab"
    >
      <div class="d-flex">
        <div class="lobby-all">ALL</div>
        <div class="option">BREAKER</div>
        <div class="option">SOLVER</div>
      </div>
      <div class="d-flex gap-2 me-3 filter-icons">
        <div class="sort-icon">
          <inline-svg src="/icons/sort.svg"></inline-svg>
        </div>
        <div class="sort-icon">
          <inline-svg src="/icons/upload.svg"></inline-svg>
        </div>
      </div>
    </div>
    <div class="d-flex gap-3 flex-wrap mt-4">
      <GameCard v-for="e in [1, 2, 3, 4, 5, 6, 7, 8]" />
    </div>
    <JoinWithCodeModal
      v-if="showJoinWithCodeModal"
      @close="handleJoinWithCodeClose"
    />
    <CreateGameModal
      v-if="showCreateChallengeModal"
      @close="handleCloseChallenge"
    />
  </div> 
</template>
<script setup lang="ts">
import GameCard from '@/components/GameCard.vue';
import GameResult from '@/components/GameResult.vue';
import CreateGameModal from '@/components/modals/CreateGameModal.vue';
import JoinWithCodeModal from '@/components/modals/JoinWithCodeModal.vue';
import Button from '@/components/shared/Button.vue';
import { ref } from 'vue';
const showJoinWithCodeModal = ref(false);
const showCreateChallengeModal = ref(false);
const handleJoinWithCode = () => {
  showJoinWithCodeModal.value = true;
};
const handleJoinWithCodeClose = () => {
  showJoinWithCodeModal.value = false;
};
const handleCreateChallenge = () => {
  showCreateChallengeModal.value = true
}
const handleCloseChallenge = () => {
  showCreateChallengeModal.value = false
}
</script>
<style scoped>
.play-title {
  letter-spacing: 10px;
  font-size: 32px;
}
.challenge-btn {
  border-radius: 60px;
  padding: 20px;
  box-shadow: 0px 2px 15px 0px #1e1f22 inset;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: #1e1f22;
}
.lobby-tab {
  border-radius: 26px;
  background: rgba(59, 61, 63, 0.08);
  border: 1px solid #2f3135;
  backdrop-filter: blur(10px);
}
.lobby-all {
  background: linear-gradient(
    180deg,
    rgba(59, 61, 63, 0.5) 0%,
    rgba(25, 27, 29, 0.5) 100%
  );
  background-blend-mode: color-dodge;
  border: 1px solid #333436;
  padding: 10px 35px;
  border-radius: 60px;
  box-shadow: 0px -4px 4px 0px #2c2e30 inset;
}
.option {
  padding: 10px 35px;
}
.sort-icon {
  background: #1e1f22;
  box-shadow: 0px 2px 15px 0px #1e1f22 inset;
  backdrop-filter: blur(10px);
  border: 1px solid #333539;
  border-radius: 10px;
  padding: 10px 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
