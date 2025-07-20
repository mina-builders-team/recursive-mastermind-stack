<template>
  <el-tooltip
    :visible="copyTextTooltipVisible"
    content="Copied!"
    placement="top"
  >
    <el-icon :size="25" class="cursor-pointer" :color="color" @click="copyToClipBoard">
      <CopyDocument />
    </el-icon>
  </el-tooltip>
</template>
<script setup lang="ts">
import { ref } from 'vue';
const props = defineProps({
  text: {
    type: String,
    required: true,
  },
  color: {
    type: String,
    required:false
  }
});
const copyTextTooltipVisible = ref(false);
const copyToClipBoard = async () => {
  await navigator.clipboard.writeText(props.text);
  copyTextTooltipVisible.value = true;
  setTimeout(() => {
    copyTextTooltipVisible.value = false;
  }, 400);
};
</script>
