<template>
  <div
    class="bg-900 border-alpha-20-300-20 px-3 py-2 d-flex flex-column gap-2 radius-6"
  >
    <div class="fs-16 fw-600">{{ name }}</div>
    <div class="fs-12 color-alpha-20-000-20">{{ description }}</div>
    <ShareButton
      :hashtag="tweet.hashtag"
      :message="tweet.message"
      btnClass="btn-cta3 color-snow-white border-alpha-50-300-50"
      :showIcon="false"
      v-if="hasBadge"
    />
  </div>
</template>
<script lang="ts" setup>
import ShareButton from '../shared/ShareButton.vue';

const props = defineProps({
  name: {
    required: true,
    type: String,
  },
  description: {
    required: true,
    type: String,
  },
  hasBadge: {
    required: true,
    type: Boolean,
    default: false,
  },
});
const tweet = {
  message: `🏆 Mission Unlocked: ${props.name}
🧩 ${props.description}
I just completed this challenge in the Mastermind zkApp built on @MinaProtocol 💥
Think you can do better?
🎮 Join the game:  https://www.minamastermind.com `,
  hashtag: 'MinaProtocol ,zkApps ,Mastermind',
};
</script>
<style lang="scss" scoped></style>
