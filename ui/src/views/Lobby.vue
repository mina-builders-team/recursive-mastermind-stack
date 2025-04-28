<template>
  <div
    class="d-flex gap-5 justify-content-center flex-wrap p-4 lobby-container"
  >
    <el-table :data="games" stripe>
      <el-table-column label="Game ID" width="180">
        <template #default="scope">
          <div class="d-flex align-items-center gap-2">
            <span>{{ formatAddress(scope.row._id) }}</span>
            <CopyToClipBoard :text="scope.row._id || ''" />
          </div>
        </template>
      </el-table-column>

      <el-table-column label="Game Reward" prop="gameRewardAmount" width="150">
        <template #default="scope">
          <div class="d-flex align-items-center gap-2">
            <span>{{ scope.row.gameRewardAmount / 1e9 }} MINA</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column
        label="Last Accepted At"
        prop="lastAcceptanceDate"
        width="180"
      >
      </el-table-column>
      <el-table-column label="Referee" prop="refereePubKeyBase58" width="180">
        <template #default="scope">
          <div class="d-flex align-items-center gap-2">
            <span>{{ formatAddress(scope.row.refereePubKeyBase58) }}</span>
            <CopyToClipBoard :text="scope.row.refereePubKeyBase58 || ''" />
          </div>
          <div >
            <span class="d-flex align-items-center gap-2" v-if="scope.row.isRefereeVerified">
              (Verified) <el-icon class="check-icon"><CircleCheckFilled /></el-icon>
            </span>
            <span v-else class="d-flex align-items-center gap-2">
              (Not verified) <el-icon class="close-icon"><CircleCloseFilled /></el-icon>
            </span>
          </div>
        </template>
      </el-table-column>

      <el-table-column label="Action" width="250">
        <template #default="scope">
          <div class="d-flex">
            <el-button
              color="#00ADB5"
              size="large"
              type="primary"
              class="me-3"
              @click="handleJoinGame(scope.row._id)"
              >JOIN</el-button
            >
            <el-button
              v-if="
                scope.row.codeMaster === publicKeyBase58 &&
                scope.row.status === 'ACTIVE'
              "
              :disabled="isCancelBtnLoading"
              :loading="isCancelBtnLoading"
              color="#9d2c2c"
              size="large"
              type="primary"
              class="me-3"
              @click="handleCancelGame(scope.row._id)"
              >{{ compiled ? 'Cancel' : 'Compiling' }}</el-button
            >
          </div>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>
<script lang="ts" setup>
import { Game } from '@/types';
import { dateToDayHourMin, formatAddress } from '@/utils';
import axios from 'axios';
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import CopyToClipBoard from '@/components/shared/CopyToClipBoard.vue';
import { useZkAppStore } from '@/store/zkAppModule';
import { storeToRefs } from 'pinia';
import { ElMessage, ElNotification } from 'element-plus';

const { publicKeyBase58, loading, error, currentTransactionLink, compiled } =
  storeToRefs(useZkAppStore());
const { cancelGame } = useZkAppStore();

const router = useRouter();
const SERVER_URL = import.meta.env.VITE_SERVER_URL;
const games = ref<Array<Game>>([]);
const handleJoinGame = (game: string) => {
  router.push({ name: 'gameplay', params: { id: game } });
};
const getActiveGames = async () => {
  const res = await axios.get(SERVER_URL + '/games/active-games');
  games.value = res?.data?.map((game: Game) => {
    return {
      _id: game?._id,
      gameRewardAmount: game?.rewardAmount,
      codeMaster: game?.codeMaster,
      status: game.status,
      lastAcceptanceDate: dateToDayHourMin(game?.lastAcceptTimestamp),
      refereePubKeyBase58: game?.refereePubKeyBase58,
      isRefereeVerified: game?.isRefereeVerified,
    };
  });
};
const handleCancelGame = async (gameId: string) => {
  await cancelGame(gameId);
  if (error.value) {
    ElMessage.error({ message: error.value, duration: 6000 });
  } else {
    ElNotification({
      title: 'Success',
      message: `Transaction Hash :  ${currentTransactionLink.value}`,
      type: 'success',
      duration: 5000,
    });
    games.value = games.value.filter((game: Game) => game._id !== gameId);
  }
};
const isCancelBtnLoading = computed(() => {
  return loading.value || !compiled.value;
});
onMounted(async () => {
  await getActiveGames();
});
</script>
<style lang="css" scoped>
:deep(.el-table__row) {
  background: #171d24 !important;
  color: white;
}
:deep(
  .el-table--striped .el-table__body tr.el-table__row--striped td.el-table__cell
) {
  background: #1f242b !important;
}
:deep(.el-table) {
  --el-table-row-hover-bg-color: unset;
  width: fit-content;
}
.lobby-container {
  position: absolute;
  left: 0%;
  width: 100vw;
}
.check-icon {
  color: rgb(31, 250, 31);
}
.close-icon {
  color: rgb(213, 72, 72);
}
</style>
