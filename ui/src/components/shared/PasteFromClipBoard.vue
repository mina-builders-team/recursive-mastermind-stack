<template>
  <div class="w-100 default-border radius-10 d-flex">
    <div class="flex-1 d-flex align-items-center ps-3 fs-16 snow-white paste-input">{{ inputValue }}</div>
    <el-button
      size="large"
      type="primary"
      class="h-100 d-flex align-items-center justify-content-center fw-400 gray paste-btn"
      @click="pasteFromClipboard"
    >
      Paste
    </el-button>
  </div>
</template>
<script lang="ts" setup>
import { ElMessage } from 'element-plus';
// @ts-expect-error
const props = defineProps({
  placeholder: {
    type: String,
    required: true,
  },
  inputValue: {
    type: String,
    required: true,
  },
});
const emit = defineEmits(['change']);

const pasteFromClipboard = async () => {
  try {
    const text = await navigator.clipboard.readText();
    const trimedText = text.trim();
    if (trimedText) {
      emit('change', trimedText);
    } else {
      ElMessage.warning('Clipboard is empty!');
    }
  } catch (error) {
    console.error('Failed to read clipboard: ', error);
    ElMessage.error('Failed to access clipboard!');
  }
};
</script>
<style lang="scss" scoped>
.paste-input {
  background: $alpha-8-300-8;
}
.paste-btn {
  border: none;
  background: $alpha-8-300-8!important;
}
</style>
