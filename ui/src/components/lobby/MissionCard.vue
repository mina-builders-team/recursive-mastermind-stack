<template>
  <div
    class="bg-900 border-alpha-20-300-20 px-3 py-2 d-flex flex-column gap-2 radius-6"
  >
    <div class="fs-16 fw-600 d-flex gap-2 align-items-center">
      <div>
        <inline-svg :src="badge?.icon"></inline-svg>
      </div>
      {{ badge?.name }}
    </div>
    <div class="fs-12 color-alpha-20-000-20">{{ badge?.description }}</div>
    <div class="w-75">
      <ShareButton
        :hashtag="tweet.hashtag"
        :message="tweet.message"
        btnClass="btn-cta3 color-snow-white border-alpha-50-300-50"
        :showIcon="false"
        v-if="hasBadge"
      />
    </div>
  </div>
</template>
<script lang="ts" setup>
import ShareButton from '../shared/ShareButton.vue';

const props = defineProps({
  badge: {
    required: true,
    type: Object,
  },
  hasBadge: {
    required: true,
    type: Boolean,
    default: false,
  },
});
const tweet = {
  message: `🏆 Mission Unlocked: ${props.badge?.name}
🧩 ${props.badge?.description}
I just completed this challenge in the Mastermind zkApp built on @MinaProtocol 💥
Think you can do better?
🎮 Join the game:  https://www.minamastermind.com `,
  hashtag: 'MinaProtocol ,zkApps ,Mastermind',
};
</script>
<style lang="scss" scoped></style>
