<template>
    <div
        class="d-flex flex-column gap-2 c-disabled fit-content h-fit-content py-2 ps-2 pe-4 radius-10"
      >
        <div class="d-flex gap-2">
          <div
            class="c-idle d-flex radius-10 p-10 px-3 align-items-center justify-content-center snow-white"
          >
            <inline-svg src="/icons/cash.svg"></inline-svg>
          </div>
          <div>
            <div class="fw-600 fs-12">Net Rewards</div>
            <div class="color-green fw-600 fs-21">
              {{ stats?.balance / 1e9 }} MINA
            </div>
          </div>
        </div>
        <div class="d-flex gap-2">
          <div
            class="c-idle d-flex radius-10 p-10 px-3 align-items-center justify-content-center snow-white"
          >
            <inline-svg src="/icons/cash.svg"></inline-svg>
          </div>
          <div>
            <div class="fw-600 fs-12">CodeBreaker</div>
            <div class="fw-600 fs-21">
              {{ stats?.winsAsCodeBreaker }} WIN
            </div>
          </div>
        </div>
        <div class="d-flex gap-2">
          <div
            class="c-idle d-flex radius-10 p-10 px-3 align-items-center justify-content-center snow-white"
          >
            <inline-svg src="/icons/cash.svg"></inline-svg>
          </div>
          <div>
            <div class="fw-600 fs-12">CodeMaster</div>
            <div class="fw-600 fs-21">
              {{ stats?.winsAsCodeMaster }} WIN
            </div>
          </div>
        </div>
        <div class="d-flex gap-2 mb-3">
          <div
            class="c-idle d-flex radius-10 p-10 px-3 align-items-center justify-content-center snow-white"
          >
            <inline-svg src="/icons/cash.svg"></inline-svg>
          </div>
          <div>
            <div class="fw-600 fs-12">Total Games</div>
            <div class="fw-600 fs-21">{{ stats?.totalPlayed }}</div>
          </div>
        </div>
        <ShareButton message="Mina" hashtag="Mina" />
      </div>
</template>
<script setup lang="ts">
import ShareButton from '../shared/ShareButton.vue';
const props = defineProps({
    stats: {
        required: true,
        type:Object
    }
})
</script>
<style lang="scss" scoped>
</style>