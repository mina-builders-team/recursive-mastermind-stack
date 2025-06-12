<template>
  <div class="h-100 w-100" style="max-width: 640px">
    <Menu></Menu>
    <Rules v-if="menuStep === 'RULES'" />
    <Lobby v-if="menuStep === 'Lobby'" />
    <NewGameForm v-if="menuStep === 'NEW_GAME'" />
    <JoinGame v-if="menuStep === 'JOIN'" />
    <Benchmark v-if="menuStep === 'BENCHMARK'" />
  </div>
</template>
<script setup lang="ts">
import NewGameForm from '@/components/forms/NewGameForm.vue';
import Lobby from '@/views/Lobby.vue';
import Benchmark from '@/views/Benchmark.vue';
import Rules from '@/components/Rules.vue';
import JoinGame from '@/views/JoinGame.vue';
import Menu from '@/components/shared/Menu.vue';
import { useZkAppStore } from '@/store/zkAppModule';
import { storeToRefs } from 'pinia';
const { menuStep } = storeToRefs(useZkAppStore());
</script>
<style></style>
