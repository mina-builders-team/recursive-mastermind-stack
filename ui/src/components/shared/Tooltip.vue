<template>
  <el-tooltip
    :placement="placement"
    effect="customized"
    :offset="offset"
    :popper-class="customClass"
  >
    <slot></slot>
  </el-tooltip>
</template>
<script setup lang="ts">
defineProps({
  placement: {
    type: String,
    required: true,
  },
  customClass: {
    type: String,
    required: false,
  },
  offset: {
    type: Number,
    required: false,
    default: 0,
  },
});
</script>
