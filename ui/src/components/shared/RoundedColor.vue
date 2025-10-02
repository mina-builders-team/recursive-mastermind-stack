<template>
  <div class="code">
    <div
      :class="[
        {
          'code-item radius-10 fs-14 d-flex align-items-center justify-content-center':
            type !== 'CLUE',
          'quarter-circle': type === 'CLUE',
          tl: type === 'CLUE' && index === 0,
          tr: type === 'CLUE' && index === 1,
          bl: type === 'CLUE' && index === 2,
          br: type === 'CLUE' && index === 3,
          'bg-alpha-8-300-8': type === 'CLUE' && value === 9,
          'default-border': type === 'CLUE' && value === 0,
          'blow-style': type === 'CLUE' && value === 1,
          'hit-style': type === 'CLUE' && value === 2,
          hidden: isNaN(Number(value)),
          played: type !== 'CLUE' && value !== 9 && value !== '?',
        },
      ]"
      v-if="!editable"
    >
      <div v-if="showValue && value !== 9">{{ value }}</div>
    </div>
    <div v-else class="char-box" @click="focusInput">
      <el-input
        :model-value="value === 9 ? null : value"
        :class="['radius-10 code-input michroma', { isFocused: isFocused }]"
        @input="handleInput"
        @keydown.delete="handleDelete"
        ref="inputRef"
        @focus="isFocused = true"
        @blur="isFocused = false"
      />
      <div
        v-if="isFocused"
        :class="[
          'horizontal-caret',
          { 'empty-input': value === 9, 'full-input': value !== 9 },
        ]"
      ></div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { nextTick, onMounted, ref } from 'vue';
import { availableColors, initialColor } from '@/constants/colors';
import { ElMessage } from 'element-plus';

const props = defineProps({
  value: {
    required: false,
    default: 9,
    type: [String, Number],
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
  isFocusedOnMount: {
    type: Boolean,
    default: false,
  },
  maxSelectableColors: {
    type: Number,
    default: -1,
  },
});
const setCaretToEnd = () => {
  const el = (inputRef.value as any)?.input as HTMLInputElement | undefined;
  if (el) {
    const len = el.value.length;
    el.setSelectionRange(len, len);
  }
};

const isFocused = ref(false);
const focusInput = () => {
  inputRef.value?.focus();
  isFocused.value = true;
  setCaretToEnd();
};

const emit = defineEmits(['input', 'focusNext', 'focusPrev']);
const inputRef = ref<InstanceType<
  (typeof import('element-plus'))['ElInputNumber']
> | null>(null);

const focus = () => {
  nextTick(() => {
    if (inputRef.value) {
      (inputRef.value as any).focus();
      isFocused.value = true;
      setCaretToEnd();
    }
  });
};
defineExpose({ focus });

const handleInput = (lastValue: string) => {
  const value = lastValue.slice(-1);
  const allowedColors =
    props.maxSelectableColors === -1
      ? availableColors
      : availableColors.slice(0, props.maxSelectableColors);
  const selectedColor = allowedColors.find(
    (c) => c.value === parseInt(value, 10)
  );
  emit('input', selectedColor ? selectedColor : initialColor);
  if (selectedColor) {
    nextTick(() => emit('focusNext'));
    if (props.index === 3) {
      isFocused.value = false;
    }
  }
  if (!selectedColor && value) {
    ElMessage.error({
      message: `Please choose a combination of 4 unique digits between 0 and ${props.maxSelectableColors === -1 ? 7 : props.maxSelectableColors - 1}`,
      duration: 3000,
    });
  }
};

const handleDelete = () => {
  if (props.value === 9) {
    nextTick(() => emit('focusPrev'));
  }
};

onMounted(() => {
  if (props.isFocusedOnMount) {
    focusInput();
  }
});
</script>
<style lang="scss" scoped>
@import '@/style';

.quarter-circle {
  width: 21px;
  height: 21px;
  background: v-bind(bgColor);
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
  background: v-bind(bgColor);
  box-shadow: 0px -2px 17px -7px #00000059 inset;
}
.code-input {
  outline: none;
  text-align: center;
  font-size: 20px;
  background: v-bind(bgColor) !important;
  background-blend-mode: multiply;
  width: 50px;
  height: 50px;
}

:deep(.el-input__wrapper) {
  outline: none !important;
  background: v-bind(bgColor) !important;
  background-blend-mode: multiply;
  box-shadow: unset;
  border-radius: 10px;
  caret-color: transparent;
  border: 1px solid $alpha-20-300-20;
  padding-left: 15px;
}
.isFocused :deep(.el-input__wrapper) {
  background: linear-gradient(
    180deg,
    rgba(59, 61, 63, 0.5) 100%,
    rgba(255, 255, 255, 0.5) 100%
  ) !important;
  background-blend-mode: screen;
  border: 1px solid (59, 61, 63, 0.5);
}

.char-box {
  position: relative;
  width: 50px;
  height: 50px;
}

.custom-input :deep(input) {
  text-align: center;
  padding: 0;
}

.horizontal-caret {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  width: 20px;
  height: 2px;
  background-color: #aeb4a3;
  animation: blink 1s step-start infinite;
}
.empty-input {
  bottom: 18px;
}
.full-input {
  bottom: 11px;
}

@keyframes blink {
  50% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
}
.blow-style {
  box-shadow: 0px 0px 3px 0px #ffffff;
  border: 1px solid #fbfbfb;
  background: #f5f5f5;
}
.hit-style {
  background: radial-gradient(50% 50% at 50% 50%, #5bc56b 0%, #8bdc97 100%);
  border: 1px solid #5bc56b;
  box-shadow: 0px 0px 3px 0px #44e667;
}
.hidden {
  background: $alpha-8-300-8;
  border: 1px solid rgba(59, 61, 63, 0.5) !important;
  backdrop-filter: blur(15px);
  box-shadow: 0px 20px 40px -10px #0c0e1166;
  box-shadow: 0px 3px 41px 56px $alpha-20-300-20 inset;
  font-size: 14px;
  font-weight: 400;
}
.played {
  color: #aeb4a3 !important;
  background: $alpha-20-700-20;
  background-blend-mode: multiply;
  border: 1px solid $alpha-20-300-20;
  font-family: michroma;
  font-size: 21px !important;
}
</style>
