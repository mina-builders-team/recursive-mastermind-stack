<template>
  <el-dialog
    :close-on-click-modal="false"
    :model-value="true"
    width="700"
    header-class="dialog-header"
    :show-close="false"
    class="white dialog-custom-class"
    modal-class="mask-class"
    @close="handleClose"
  >
    <slot></slot>
  </el-dialog>
</template>
<script setup lang="ts">
const emit = defineEmits(['close']);
const handleClose = () => {
  emit('close');
};
</script>
<style lang="scss">
.dialog-header {
  display: none !important;
}
.el-dialog {
  background: $alpha-50-900-50;
  background-blend-mode: darken !important;
  color: #fefefe;
  border-radius: 20px;
  border: 1px solid #2c2f31;
  padding: 0px;
}
.el-dialog__body {
  background: $alpha-50-900-50 !important;
  background-blend-mode: darken !important;
  border-radius: 20px;
  padding: 20px;
}
.mask-class {
  background: linear-gradient(
    180deg,
    rgba(59, 61, 63, 0.5) 0%,
    rgba(25, 27, 29, 0.5) 100%
  );
  background-blend-mode: color-dodge;
  box-shadow: 2px 2px 12px 2px $color-600 inset;
  backdrop-filter: blur(25px);
}
</style>
