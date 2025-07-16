<template>
  <Landing />
  <div v-if="isUnboarding" class="mt-5 w-100 d-flex justify-content-center">
    <OnBoarding @end="goToPlay" />
  </div>

</template>
<script setup lang="ts">
import OnBoarding from '@/views/OnBoarding.vue';
import { ref } from 'vue';
import Landing from './Landing.vue';
const isUnboarding = ref(true);
const goToPlay = () => {
  isUnboarding.value = false;
};
</script>
<style scoped>

</style>
