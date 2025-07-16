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
    default: '',
  },
});
const handleClick = () => {
  emit('click');
};
</script>
<style lang="scss" scoped>
@import '@/style';
.button-1 {
  border-radius: 60px;
  gap: 10px;
  padding: 16px 20px;
  background: $color-100;
  border: 1px solid $alpha-8-300-8;
  box-shadow: 0px 2px 15px 0px $color-600 inset;
  backdrop-filter: blur(10px);
  font-family: Outfit;
  font-weight: 700;
  font-style: Bold;
  font-size: 14px;
  color: black;
}
.button-2 {
  border-radius: 60px;
  gap: 10px;
  padding: 16px 20px;
  background: $color-600;
  border: 1px solid $alpha-8-000-8;
  box-shadow: 0px 2px 15px 0px $color-600 inset;
  backdrop-filter: blur(10px);
  font-weight: 400;
  font-size: 14px;
  color: $snow-white;
}
.button-3 {
  border-width: 1px;
  gap: 10px;
  padding: 16px 20px;
  background: $snow-white;
  border: 1px solid;

  border-image-source: linear-gradient(
    180deg,
    rgba(59, 61, 63, 0.5) 100%,
    rgba(255, 255, 255, 0.5) 100%
  );
  backdrop-filter: blur(10px);
  font-size: 14px;
  color: $color-500;
}
.button-4 {
  border-radius: 10px;
  gap: 10px;
  padding: 10px 30px;
  background: linear-gradient(
    180deg,
    $alpha-50-300-50 0%,
    $alpha-50-700-50 100%
  );
  background-blend-mode: color-dodge;
  border: 1px solid;

  border-image-source: linear-gradient(
    180deg,
    rgba(59, 61, 63, 0.5) 100%,
    rgba(255, 255, 255, 0.5) 100%
  );
  box-shadow: 0px 2px 15px 0px $color-600 inset;
  backdrop-filter: blur(10px);
  font-weight: 400;
  font-size: 14px;
  color: $snow-white;
}
.button-5 {
  border-radius: 10px;
  gap: 10px;
  padding: 10px 30px;
  border: 1px solid;
  border-image-source: linear-gradient(
    180deg,
    rgba(59, 61, 63, 0.5) 100%,
    rgba(255, 255, 255, 0.5) 100%
  );
  font-weight: 400;
  font-size: 14px;
  color: $snow-white;
}
.button-6 {
  border-radius: 10px;
  gap: 10px;
  padding: 10px 30px;
  background: $snow-white;
  border: 1px solid black;
  font-weight: 400;
  font-size: 14px;
  background: black;
}

</style>
