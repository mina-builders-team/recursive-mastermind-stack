<template>
  <div class="d-flex align-items-center gap-2">
    <div
      class="rounded__color d-flex align-items-center justify-content-center fs-3"
      :class="{ blinkColor: blinkColor }"
      v-if="!editable"
    >
      <span class="rounded__value" v-if="showValue && value !== 9">{{
        value
      }}</span>
    </div>
    <template v-else>
      <el-input
        :model-value="value === 9 ? null : value"
        class="code-input"
        maxlength="1"
        @input="handleInput"
        @keydown.delete="handleDelete"
        ref="inputRef"
      />
    </template>

    <span v-if="title" class="ms-2">{{ title }}</span>
  </div>
</template>
<script setup lang="ts">
import { nextTick, ref } from 'vue';
import { availableColors, initialColor } from '../constants/colors';
import { ElMessage } from 'element-plus';

const props = defineProps({
  value: {
    required: true,
  },
  bgColor: {
    type: String,
    required: true,
  },
  width: {
    type: String,
    required: true,
  },
  height: {
    type: String,
    required: true,
  },
  blinkColor: {
    type: String,
    required: false,
  },
  title: {
    type: String,
    required: false,
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
<style scoped>
:deep(.el-input__wrapper) {
  background: v-bind(bgColor);
  border-radius: 50%;
}

.code-input {
  width: 40px;
  height: 40px;
  text-align: center;
  font-size: 20px;
  border-radius: 50%;
  outline: none;
}

:deep(.el-input__inner) {
  padding-left: 3px;
}

.rounded__color {
  background-color: v-bind(bgColor);
  border-radius: 50%;
  min-width: 16px;
  min-height: 16px;
  width: v-bind(width);
  height: v-bind(height);
  cursor: pointer;
  border: 1px solid #6b6969;
}

.rounded__color:hover {
  opacity: 0.8;
}

.rounded__value {
  font-size: 16px;
  color: #444444;
}

.blinkColor {
  background-color: v-bind(blinkColor);
  animation: blink 1s infinite alternate;
}

@keyframes blink {
  0% {
    opacity: 1;
  }

  100% {
    opacity: 0.2;
  }
}
</style>
