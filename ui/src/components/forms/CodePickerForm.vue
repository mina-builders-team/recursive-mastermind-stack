<template>
  <div>
    <div class="d-flex flex-column align-items-start">
      <div class="d-flex gap-2 align-items-center w-100">
        <div class="board__container w-100">
          <div class="d-flex gap-2 justify-content-center w-100">
            <RoundedColor
              height="40px"
              width="40px"
              v-for="secret in hiddenSecret"
              bgColor="#3b3d3f33"
              :value="secret.value"
              v-if="isSecretHidden"
            />
            <template v-else>
              <RoundedColor
                height="40px"
                width="40px"
                editable
                v-for="(secret, index) in secretCode"
                :value="secret.value"
                :bgColor="secret.value === 9 ? '#3b3d3f80' : '#3b3d3f33'"
                @input="handleSetSecretCode($event, index)"
                @focusNext="focusNextInput(index)"
                @focusPrev="focusPrevInput(index)"
                ref="inputRefs"
              />
            </template>
          </div>
        </div>
        <el-icon :size="25" class="cursor-pointer" @click="toggleSecret">
          <View v-if="isSecretHidden" />
          <Hide v-else />
        </el-icon>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { nextTick, ref } from 'vue';
import { AvailableColor } from '@/types';
import RoundedColor from '@/components/RoundedColor.vue';
import { generateRandomSalt } from '../../utils';
import { storeToRefs } from 'pinia';
import { useZkAppStore } from '@/store/zkAppModule';
import { initialColor } from '@/constants/colors';

const { zkAppAddress } = storeToRefs(useZkAppStore());

const props = defineProps({
  isRandomSalt: {
    type: Boolean,
    required: true,
  },
  hideOnMount: {
    type: Boolean,
    required: false,
    default: true,
  },
});
const emit = defineEmits(['change']);

const inputRefs = ref<(InstanceType<typeof RoundedColor> | null)[]>([]);
const isSecretHidden = ref(props.hideOnMount);
const toggleSecret = () => {
  isSecretHidden.value = !isSecretHidden.value;
};
const focusNextInput = (index: number) => {
  if (index < inputRefs.value.length - 1) {
    nextTick(() => inputRefs.value[index + 1]?.focus());
  }
};
const focusPrevInput = (index: number) => {
  if (index > 0) {
    nextTick(() => inputRefs.value[index - 1]?.focus());
  }
};
const initialSecret = () => {
  if (props.isRandomSalt) {
    return {
      secretCode: Array.from({ length: 4 }, () => initialColor),
      randomSalt: generateRandomSalt(20),
    };
  } else {
    let storedGames = localStorage.getItem('games');
    if (storedGames) {
      const jsonGames = JSON.parse(storedGames);
      if (jsonGames && jsonGames[zkAppAddress.value as string]) {
        return {
          secretCode: jsonGames[zkAppAddress.value as string].secretCode,
          randomSalt: jsonGames[zkAppAddress.value as string].randomSalt,
        };
      }
    }
    return {
      secretCode: Array.from({ length: 4 }, () => initialColor),
      randomSalt: '',
    };
  }
};
const secretCode = ref<Array<AvailableColor>>(initialSecret().secretCode);
const hiddenSecret = Array.from({ length: 4 }, () => ({
  color: '#fff',
  value: '*',
}));
const handleSetSecretCode = (selectedColor: AvailableColor, index: number) => {
  secretCode.value[index] = { ...selectedColor };
  emit('change', secretCode.value);
};
</script>
