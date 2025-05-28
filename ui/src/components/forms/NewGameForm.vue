<template>
  <div class="d-flex flex-column align-items-center w-100 h-100">
    <el-form
      :model="game"
      :rules="rules"
      style="max-width: 400px; width: 100%"
      ref="ruleFormRef"
    >
      <el-form-item prop="rewardAmount">
        <label>Reward Amount</label>
        <el-input
          type="number"
          placeholder="Reward amount no less than 10 MINA"
          v-model.number="game.rewardAmount"
          size="large"
          :min="10"
          @blur="setRewardAmount"
        ></el-input>
      </el-form-item>
      <CodePickerForm
        @submit="handleInitGame"
        btnText="Submit Code"
        isRandomSalt
        :hideOnMount="false"
      />
    </el-form>
  </div>
</template>
<script lang="ts" setup>
import { ref } from 'vue';
import { useZkAppStore } from '@/store/zkAppModule';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import CodePickerForm from '@/components/forms/CodePickerForm.vue';
import { ElForm, ElMessage } from 'element-plus';
import { AvailableColor, CodePicker } from '@/types';
import { GameParams } from '../../types';
import { ElNotification } from 'element-plus';
import { updateLocalStorageGames } from '@/utils';

const { zkAppAddress, error, currentTransactionLink } =
  storeToRefs(useZkAppStore());
const router = useRouter();
const { createInitGameTransaction } = useZkAppStore();

const game = ref<GameParams>({
  rewardAmount: null,
  refereePubKeyBase58: import.meta.env.VITE_SERVER_PUBLIC_KEY as string,
});
const ruleFormRef = ref<InstanceType<typeof ElForm>>();
const rules = ref({
  rewardAmount: [
    {
      required: true,
      message: `The reward amount is required !`,
      trigger: 'change',
    },
    {
      validator: (_rule: any, value: any, callback: any) => {
        if (value >= 10) {
          callback();
        } else {
          callback(
            new Error(`The reward amount should be no less than 10 MINA`)
          );
        }
      },
    },
  ],
});
const setRewardAmount = () => {
  if (!game.value.rewardAmount) return;
  if (game.value.rewardAmount < 10) {
    game.value.rewardAmount = 10;
  }
};
const handleInitGame = async (formData: CodePicker) => {
  if (!ruleFormRef.value) return;
  ruleFormRef.value.validate(async (valid) => {
    if (valid) {
      await createInitGameTransaction(
        formData.code.map((e: AvailableColor) => e.value),
        formData.randomSalt,
        game.value.refereePubKeyBase58 as string,
        game.value.rewardAmount! * 1e9
      );
      if (error.value) {
        ElMessage.error({ message: error.value, duration: 6000 });
      } else {
        ElNotification({
          title: 'Success',
          message: `Transaction Hash : ${currentTransactionLink.value}`,
          type: 'success',
          duration: 5000,
        });
        updateLocalStorageGames(zkAppAddress.value as string, {
          randomSalt: formData.randomSalt,
          secretCode: formData.code,
          role: 'CODE_MASTER',
        });
        router.push({
          name: 'gameplay',
          params: {
            id: zkAppAddress.value,
          },
        });
      }
    }
  });
};
</script>

<style scoped>
.color-picker__container {
  border: 1px solid #222;
}
</style>
