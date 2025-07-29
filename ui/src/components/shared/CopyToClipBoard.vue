<template>
  <el-tooltip
    :visible="copyTextTooltipVisible"
    content="Copied!"
    placement="top"
  >
    <div @click="copyToClipBoard" class="cursor-pointer">
      <slot>
        <el-icon :size="25"  :color="color">
          <CopyDocument />
        </el-icon>
      </slot>
    </div>
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
    required: false,
  },
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
