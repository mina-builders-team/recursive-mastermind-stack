<script setup lang="ts">
import RoundedColor from './RoundedColor.vue';
import Button from './shared/Button.vue';
</script>

<template>
  <div class="d-flex flex-column gap-2 game-card__container">
    <div class="d-flex gap-5">
      <div class="fw-600">Geometry Nonce 512</div>
      <div class="d-flex align-items-center gap-1">
        <div class="status"></div>
        <span class="gray fs-14">Available</span>
      </div>
    </div>
    <div class="d-flex align-items-center justify-content-between">
      <div class="fs-12 game-adr">ID: b62ab..3de</div>
      <inline-svg src="/icons/zk.svg"></inline-svg>
    </div>
    <div class="d-flex gap-1 align-items-center game-date">
      <inline-svg src="/icons/clock.svg"></inline-svg>
      <span class="fs-12">10 minute ago</span>
    </div>
    <div class="d-flex align-items-center gap-2">
      <div
        class="game-reward d-flex align-items-center gap-2 fw-400 f-14 snow-white"
      >
        <inline-svg src="/icons/cash.svg"></inline-svg> 100 MINA
      </div>
      <Button class="cta-3 flex-1">Join</Button>
    </div>
  </div>
</template>
<style lang="scss" scoped>
@import '@/style';
.status {
  width: 8px;
  height: 8px;
  background-color: #5bc56b;
  border-radius: 50%;
}
.game-card__container {
  padding: 20px 18px;
  background: linear-gradient(
    180deg,
    rgba(59, 61, 63, 0.5) 0%,
    rgba(25, 27, 29, 0.5) 100%
  );
  background-blend-mode: color-dodge;
  border: 1px solid #2b2d30;
  backdrop-filter: blur(15px);

  box-shadow: 0px 20px 40px -10px #0c0e1166;
  border-radius: 10px;
}
.game-adr {
  color: rgba(255, 255, 255, 0.2);
}
.game-date {
  color: rgba(255, 255, 255, 0.2);
}
.game-reward {
  @extend .c-disabled;
  border-radius: 10px;
  padding: 5px 10px;
}
</style>
