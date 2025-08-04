<template>
  <div class="clue__container">
    <RoundedColor
      v-for="(el, index) in clue"
      :bgColor="el.color"
      :value="el.value"
      :showValue="false"
      type="CLUE"
      :index="index"
    />
  </div>
</template>
<script lang="ts" setup>
import { initialColor } from '@/constants/colors';
import { AvailableColor } from '@/types';
import RoundedColor from '@/components/shared/RoundedColor.vue';

defineProps({
  clue: {
    type: Array<AvailableColor>,
    required: false,
    default: Array.from({ length: 4 }, () => initialColor),
  },
});
</script>
<style lang="scss" scoped>
.clue__container {
  display: grid;
  grid-template-columns: repeat(2, 22px);
  grid-template-rows: repeat(2, 22px);
  gap: 1px;
}
</style>
