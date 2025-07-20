<template>
  <div class="mt-5 w-100">
    <div class="fs-32 fw-700 mb-3">LEADERBOARD</div>
    <div
      class="d-flex w-100 justify-content-between p-3 radius-10 snow-white user-rank__container"
    >
      <div>
        <div class="fs-12 fw-600">RANK</div>
        <div class="fs-21 fw-600">194</div>
        <div class="fs-12 gray">10.5K Points</div>
      </div>
      <div>
        <div class="fs-12 fw-600">SOLVED CODES</div>
        <div class="fs-21 fw-600">11</div>
      </div>
      <div>
        <div class="fs-12 fw-600">SOLVED CODES</div>
        <div class="fs-21 fw-600">11</div>
      </div>
      <div>
        <div class="fs-12 fw-600">CURRENT TITLE</div>
        <div class="fs-21 fw-600">Field Analyst</div>
        <div class="fs-12 gray">150 points for more for CyberStrategist!</div>
      </div>
      <div class="align-self-center">
        <ShareButton message="" hashtag="" />
      </div>
    </div>
    <div class="mt-3">
      <div
        class="d-flex justify-content-between white fw-600 ps-3 pe-4 py-3 rank-list__header"
      >
        <div class="d-flex gap-5">
          <div>RANK</div>
          <div>CODE MASTER</div>
        </div>
        <div class="d-flex gap-5">
          <div>UNBREAKEN</div>
          <div>SOLVED</div>
          <div>POINTS</div>
        </div>
      </div>
      <div v-for="player in [1, 2, 3, 4, 5]">
        <div class="d-flex justify-content-between align-items-center snow-white py-2 px-3 player">
          <div class="d-flex gap-4 align-items-center">
            <div class="tags d-flex align-items-center h-fit-content py-2 px-4">001</div>
            <div class="d-flex align-items-center gap-1 px-2 py-3 tags radius-10">
              <inline-svg src="/icons/person.svg"></inline-svg>
              b62ab..3ed
            </div>
          </div>
          <div class="d-flex gap-5 ">
            <div class="fs-12 fw-600 d-flex justify-content-end pe-3 stat ">11</div>
            <div class="fs-12 fw-600 d-flex justify-content-end pe-3 stat">20</div>
            <div class="d-flex justify-content-end stat">1120 Points</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import ShareButton from '@/components/shared/ShareButton.vue';
</script>
<style lang="scss" scoped>
.user-rank__container {
  background: $alpha-8-300-8;
  border: 1px solid rgba(59, 61, 63, 0.5);
  backdrop-filter: blur(15px);
  box-shadow: 0px 20px 40px -10px #0c0e1166;
  box-shadow: 0px 3px 41px 56px var(--ALPHA20300-20) inset;
}
.rank-list__header {
  background: $alpha-20-700-20;
  background-blend-mode: multiply;
  border: 1px solid $alpha-20-300-20;
  border-bottom-left-radius: 0px;
  border-bottom-right-radius: 0px;
}
.player {
  background: $alpha-8-300-8;
  border: 1px solid rgba(170, 170, 170, 0.1);
  backdrop-filter: blur(10px);
}
.tags {
  background: $alpha-20-700-20;
  background-blend-mode: multiply;
  border: 1px solid $alpha-20-300-20;
  border-radius: 40px;
}
.stat {
  width: 70px;
}
</style>
