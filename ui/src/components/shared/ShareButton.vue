<template>
  <div @click="shareOnX" class="w-100">
    <slot>
      <Button
        :class="
          'd-flex align-items-center gap-2 fit-content default-style w-100 ' +
            btnClass || ''
        "
        size="large"
      >
        <inline-svg
          class="me-2"
          src="/icons/twitter.svg"
          v-if="showIcon"
        ></inline-svg>
        Share on X
      </Button>
    </slot>
  </div>
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
  showIcon: {
    type: Boolean,
    required: false,
    default: true,
  },
});
const shareOnX = () => {
  const message = encodeURIComponent(props.message);
  const twitterIntent = `https://twitter.com/intent/tweet?text=${message}&hashtags=${props.hashtag}`;

  window.open(twitterIntent, '_blank');
};
</script>
<style lang="scss" scoped>
.default-style {
  background: linear-gradient(
    180deg,
    rgba(59, 61, 63, 0.5) 100%,
    rgba(255, 255, 255, 0.5) 100%
  );
  background-blend-mode: screen;
  border-radius: 10px;
  border: 1px solid rgba(59, 61, 63, 0.5);
  color: $snow-white;
}
</style>
