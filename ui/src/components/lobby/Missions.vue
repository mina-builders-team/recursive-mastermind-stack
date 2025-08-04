<template>
  <div class="idle-container border-alpha-50-300-50 p-10">
    <div class="fs-16 fw-600 mb-3 ms-2">Missions</div>
    <div class="d-flex flex-column gap-2">
      <MissionCard
        v-for="badge in BADGES"
        :name="badge.name"
        :description="badge.description"
        :hasBadge="userHasBadge(badge.name)"
      />
    </div>
  </div>
</template>
<script setup lang="ts">
import { useZkAppStore } from '@/store/zkAppModule';
import axios from 'axios';
import { storeToRefs } from 'pinia';
import { onMounted, ref } from 'vue';
import MissionCard from './MissionCard.vue';
import { BADGES } from '@/constants/badges';
import { Player } from '@/types';
const SERVER_URL = import.meta.env.VITE_SERVER_URL;
const { publicKeyBase58 } = storeToRefs(useZkAppStore());
const player = ref<Player>();
const getUser = async () => {
  const res = await axios.get(SERVER_URL + '/player/' + publicKeyBase58.value);
  player.value = res?.data?.player;
};
onMounted(async () => {
  await getUser();
});
const userHasBadge = (badgeName: string) => {
  return player.value?.badges?.includes(badgeName) || false;
};
</script>
<style lang="scss" scoped></style>
