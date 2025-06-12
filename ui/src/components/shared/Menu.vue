<template>
  <div class="d-flex justify-content-around gap-2 m-3 align-items-center">
    <el-button
      type="primary"
      color="#00ADB5"
      size="large"
      style="width: 120px; text-align: center; white-space: normal"
      :plain="menuStep !== 'RULES'"
      @click="setMenuStep('RULES')"
      >Rules</el-button
    >
    <el-button
      type="primary"
      color="#00ADB5"
      size="large"
      style="width: 120px; text-align: center; white-space: normal"
      :plain="menuStep !== 'Lobby'"
      @click="setMenuStep('Lobby')"
      >Lobby</el-button
    >
    <el-button
      type="primary"
      color="#00ADB5"
      size="large"
      style="width: 120px; text-align: center; white-space: normal"
      :plain="menuStep !== 'NEW_GAME'"
      @click="setMenuStep('NEW_GAME')"
      >Create New Game</el-button
    >
    <el-button
      type="primary"
      color="#00ADB5"
      size="large"
      style="width: 120px; text-align: center; white-space: normal"
      :plain="menuStep !== 'JOIN'"
      @click="setMenuStep('JOIN')"
      >Join</el-button
    >
    <el-button
      type="primary"
      color="#00ADB5"
      size="large"
      style="width: 120px; text-align: center; white-space: normal"
      :plain="menuStep !== 'BENCHMARK'"
      @click="setMenuStep('BENCHMARK')"
      >Benchmark</el-button
    >
  </div>
</template>
<script lang="ts" setup>
import { useZkAppStore } from '@/store/zkAppModule';
import { storeToRefs } from 'pinia';
const { menuStep } = storeToRefs(useZkAppStore());
const { setMenuStep } = useZkAppStore();
</script>
