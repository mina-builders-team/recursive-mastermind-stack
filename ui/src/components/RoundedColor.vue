<template>
  <div class="code">
    <div
      :class="[
        {
          'code-item w-50 h-50 radius-10 default-border snow-white fs-21 d-flex align-items-center justify-content-center':
            type !== 'CLUE',
          'quarter-circle': type === 'CLUE',
          tl: type === 'CLUE' && index === 0,
          tr: type === 'CLUE' && index === 1,
          bl: type === 'CLUE' && index === 2,
          br: type === 'CLUE' && index === 3,
        },
      ]"
      v-if="!editable"
    >
      <div v-if="showValue && value !== 9">{{ value }}</div>
    </div>
    <div v-else>
      <el-input
        :model-value="value === 9 ? null : value"
        class="w-50 h-50 radius-10 default-border code-input"
        maxlength="1"
        @input="handleInput"
        @keydown.delete="handleDelete"
        ref="inputRef"
      />
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed, nextTick, ref } from 'vue';
import { availableColors, initialColor } from '../constants/colors';
import { ElMessage } from 'element-plus';

const props = defineProps({
  value: {
    required: false,
    default: 9,
  },
  editable: {
    type: Boolean,
    required: false,
    default: false,
  },
  showValue: {
    type: Boolean,
    default: true,
  },
  bgColor: {
    type: String,
    required: false,
  },
  type: {
    type: String,
    default: 'GUESS',
  },
  index: {
    type: Number,
    required: false,
  },
});
const emit = defineEmits(['input', 'focusNext', 'focusPrev']);
const inputRef = ref<InstanceType<
  (typeof import('element-plus'))['ElInputNumber']
> | null>(null);

const focus = () => {
  nextTick(() => {
    if (inputRef.value) {
      (inputRef.value as any).focus();
    }
  });
};
defineExpose({ focus });

const handleInput = (value: string) => {
  const selectedColor = availableColors.find(
    (c) => c.value === parseInt(value, 10)
  );
  emit('input', selectedColor ? selectedColor : initialColor);
  if (selectedColor) {
    nextTick(() => emit('focusNext'));
  }
  if (!selectedColor && value) {
    ElMessage.error({
      message: 'Please choose a combination of 4 unique digits between 0 and 7',
      duration: 3000,
    });
  }
};

const handleDelete = () => {
  if (props.value === 9) {
    nextTick(() => emit('focusPrev'));
  }
};
</script>
<style lang="scss" scoped>
@import '@/style';

.quarter-circle {
  width: 25px;
  height: 25px;
  background: v-bind(bgColor) !important;
}
.tl {
  border-top-left-radius: 100%;
  border-top-right-radius: 2px;
  border-bottom-left-radius: 2px;
  border-bottom-right-radius: 2px;
}
.tr {
  border-top-right-radius: 100%;
  border-top-left-radius: 2px;
  border-bottom-left-radius: 2px;
  border-bottom-right-radius: 2px;
}
.bl {
  border-bottom-left-radius: 100%;
  border-top-right-radius: 2px;
  border-top-left-radius: 2px;
  border-bottom-right-radius: 2px;
}
.br {
  border-bottom-right-radius: 100%;
  border-bottom-left-radius: 2px;
  border-top-right-radius: 2px;
  border-top-left-radius: 2px;
}

.code-item {
  width: 50px;
  height: 50px;
  padding: 10px;
}
.code-input {
  outline: none;
  text-align: center;
  font-size: 20px;
  background: v-bind(bgColor) !important;
  background-blend-mode: multiply;
}

:deep(.el-input__inner) {
  padding-left: 3px;
}
:deep(.el-input__wrapper) {
  outline: none !important;
  background: v-bind(bgColor) !important;
  background-blend-mode: multiply;
  box-shadow: unset;
  border-radius: 10px;
}
.code {
  color: #ae84a3;
  font-weight: 400;
  font-size: 21px;
}
</style>
