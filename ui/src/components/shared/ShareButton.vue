<template>
  <Button :class="'d-flex align-items-center gap-2 button-3 fit-content'.concat(btnClass ||'')"
  size="large"
  @click="shareOnX">
    <inline-svg class="me-2" src="/icons/share.svg"></inline-svg>
    Share on X
  </Button>
</template>
<script lang="ts" setup>
import Button from './Button.vue';



const props = defineProps({
  message: {
    required: true,
    type: String,
  },
  hashtag: {
    required: true,
    type: String,
  },
   btnClass: {
    required: false,
    type: String,
  },
});
const shareOnX = () => {
  const message = encodeURIComponent(props.message);
  const twitterIntent = `https://twitter.com/intent/tweet?text=${message}&hashtags=${props.hashtag}`;

  window.open(twitterIntent, '_blank');
};
</script>
<style lang="scss" scoped></style>
