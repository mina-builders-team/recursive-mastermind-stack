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
// buttons
  // cta3
.btn-cta3 {
  background: $color-600;
  border: 1px solid ;
/*   border-image: linear-gradient(
    180deg,
    rgba(59, 61, 63, 0.5) 1,
    rgba(255, 255, 255, 0.5) 100%
  );
 */  border-image-slice: 1;
  box-shadow: 0px 2px 15px 0px $color-600 inset;
  backdrop-filter: blur(10px);
  border-radius: 10px;
}
.btn-cta3:hover {
  color: rgba(255, 255, 255, 0.5);
  background:
    linear-gradient(0deg, $alpha-20-300-20, $alpha-20-300-20),
    linear-gradient(0deg, $alpha-8-000-8, $alpha-8-000-8);
  background-blend-mode: screen;
  box-shadow: 0px 2px 35px 0px $color-200 inset;
  border: 1px solid rgba(255, 255, 255, 0.5);
/*   border-image-source: linear-gradient(
    180deg,
    rgba(59, 61, 63, 0.5) 1,
    rgba(255, 255, 255, 0.5) 100%
  );
 */}
.btn-cta3:active {
  color: rgba(255, 255, 255, 0.5);
  background: $color-400;
  box-shadow: 0px 4px 14px 0px #00000033 inset;
  border: 1px solid rgba(255, 255, 255, 0.5);
/*   border-image-source: linear-gradient(
    180deg,
    rgba(59, 61, 63, 0.5) 1,
    rgba(255, 255, 255, 0.5) 100%
  );
 */}
  // cta2
.btn-cta2 {
  background: $color-600;
  border: 1px solid $alpha-8-000-8;
  border-radius: 60px;
  box-shadow: 0px 2px 15px 0px $color-600 inset;
  backdrop-filter: blur(10px);
}
.btn-cta2:hover {
  background: $color-600;
  border: 1px solid $alpha-20-000-20;
  box-shadow: 0px 2px 35px 0px $color-200 inset;
}
.btn-cta2:active {
  background: $color-400;
  border: 2px solid rgba(68, 68, 68, 0.1) 100%;
  box-shadow: 0px 4px 14px 0px #00000033 inset;
}
  // cta1
.btn-cta1 {
  background: $color-100;
  border: 1px solid $alpha-50-000-50;
  border-radius: 60px;
  box-shadow: 0px 2px 15px 0px $color-600 inset;
  backdrop-filter: blur(10px);
}
.btn-cta1:hover {
  background: $color-100;
  border: 1px solid rgba(68, 68, 68, 0.1);
/*   border-image-source: linear-gradient(
    180deg,
    rgba(68, 68, 68, 0.3) 0%,
    rgba(68, 68, 68, 0.1) 100%
  );
 */  box-shadow: 0px 2px 35px 0px $color-200 inset;
}
.btn-cta1:active {
  background: $snow-white;
  border: 1px solid  rgba(68, 68, 68, 0.1);
  /* border-image-source: linear-gradient(
    180deg,
    rgba(68, 68, 68, 0.3) 0%,
    rgba(68, 68, 68, 0.1) 100%
  ); */
  box-shadow: 0px 4px 14px 0px #00000033 inset;
}

</style>