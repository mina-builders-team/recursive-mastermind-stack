<template>
  <el-button @click="handleClick" :class="class" :size="size">
    <slot></slot>
  </el-button>
</template>
<script setup lang="ts">
const emit = defineEmits(['click']);
const props = defineProps({
  class: {
    required: false,
  },
  size: {
    type: String,
    required: false,
    default:''
  }
});
const handleClick = () => {
  emit('click');
};
</script>
<style lang="scss" scoped>
@import '@/style';
.cta-1 {
  border-radius: 60px;
  padding: 16px 20px;
  color: $color-100;
  border: 1px solid $alpha-50-000-50;
  backdrop-filter: blur(10px);
  font-weight: 700;
  font-size: 14px;
  color: #000;
}
.cta-2 {
  padding: 16px 20px;
  border-radius: 60px;
  background: $color-600;
  border: 1px solid $alpha-8-000-8;
  box-shadow: 0px 2px 15px 0px $color-600 inset;
  backdrop-filter: blur(10px);
  color: $snow-white;
}
.cta-2:hover {
  border: 1px solid $alpha-20-000-20;
  box-shadow: 0px 2px 35px 0px $color-200 inset;
}
.cta-3 {
  @extend .c-idle-filtered;
  border-radius: 10px;
  box-shadow: 0px 2px 15px 0px $color-600 inset;
  padding: 10px 30px;
  color: $snow-white;
}
.cta-3:hover {
  @extend .c-highlighted;
  box-shadow: 0px 2px 35px 0px $color-200 inset;
}
.modal-secondary-btn {
  background: transparent;
}
</style>
