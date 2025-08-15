<template>
  <Modal
    @close="handleModalClose"
    background="transparent"
    border="unset"
    padding="0px"
  >
    <div
      class="d-flex flex-column gap-4 color-snow-white default-border radius-20 bg-alpha-50-900-50 p-20"
    >
      <el-carousel
        arrow="never"
        height="auto"
        :interval="8000"
        motion-blur
        @change="handleInfoChange"
      >
        <el-carousel-item
          v-for="item in infos"
          :key="item"
          style="height: 130px"
        >
          <div
            class="bg-alpha-20-300-20 default-border d-flex flex-column align-items-center color-snow-white radius-10 w-100 p-2 gap-"
          >
            <div class="fw-700 fs-14 mb-2">{{ item.title }}</div>
            <div class="text-center" v-html="item.description"></div>
            <div class="d-flex gap-1 mt-2">
              <div
                class="indicator default-border"
                :class="{ 'bg-snow-white': currentInfo === 0 }"
              ></div>
              <div
                class="indicator default-border"
                :class="{ 'bg-snow-white': currentInfo === 1 }"
              ></div>
            </div>
          </div>
        </el-carousel-item>
      </el-carousel>
      <div class="fw-600 fs-16 color-snow-white">
        Create a New Game as a Codemaster {{ currentStep + 1 }} / 3
      </div>
      <div class="d-flex w-100 gap-5">
        <div
          v-for="(step, index) in steps"
          :key="step.title"
          class="d-flex gap-2 align-items-center"
        >
          <div
            :class="[
              'stake d-flex align-items-center justify-content-center default-border radius-10',
              {
                'bg-alpha-20-300-20': index === currentStep,
                'bg-alpha-8-300-8': index !== currentStep,
              },
            ]"
          >
            <inline-svg
              src="/icons/cash.svg"
              class="snow-white"
              :height="20"
              :width="20"
            ></inline-svg>
          </div>
          <div
            :class="[
              'fw-600 fs-12',
              {
                'snow-white': index === currentStep,
                grey: index !== currentStep,
              },
            ]"
          >
            <span>{{ step.title }}</span>
          </div>
        </div>
      </div>
      <div
        v-if="currentStep === 0"
        class="d-flex flex-column gap-4 align-items-start"
      >
        <div class="fw-400 fs-16 color-snow-white">
          Set a code using 4 numbers, each between 0 and 7.
        </div>

        <div>
          <CodePicker
            editable
            @change="handleSecretChange"
            :secret="game.secret"
          />
        </div>
      </div>

      <div v-if="currentStep === 1" class="d-flex flex-column gap-4">
        <div class="snow-white">
          <div class="fw-600">Select Game Reward</div>
          Note: Starting a game costs 2 extra MINA — 1 for the game account and
          1 for the referee.
        </div>
        <div class="d-flex">
          <Button
            v-for="amount in rewardAmounts"
            :key="amount"
            @click="setRewardAmount(amount)"
            :class="[
              'radius-10 default-border d-flex align-items-center fw-400 fs-14',
              {
                black: amount === game.reward,
                'bg-alpha-20-300-20 color-snow-white': amount !== game.reward,
              },
            ]"
            size="large"
          >
            <inline-svg class="me-1" src="/icons/cash.svg"></inline-svg>
            {{ amount }} MINA
          </Button>
        </div>
      </div>
      <div v-if="currentStep === 2" class="d-flex flex-column gap-4">
        <div>
          <div class="white fw-400 fs-16 mb-2">Enter the Game Name</div>
          <div class="w-100 default-border radius-10 d-flex">
            <div
              class="flex-1 d-flex align-items-center ps-3 fs-16 color-snow-white bg-alpha-8-300-8"
            >
              {{ game.roomName }}
            </div>
            <el-button
              size="large"
              type="primary"
              class="h-100 d-flex align-items-center justify-content-center fw-400 gray bg-alpha-8-300-8 generate-btn"
              @click="generateRoomName"
            >
              Generate
            </el-button>
          </div>
        </div>
        <div class="d-flex gap-5">
          <div>
            <div class="snow-white fs-16 mb-2">Secret Code</div>
            <div class="d-flex gap-2">
              <RoundedColor
                :editable="false"
                v-for="code in game.secret"
                :value="code.value"
              />
            </div>
          </div>
          <div class="snow-white d-flex flex-column align-items-between h-100">
            <div class="fs-16 mb-2">Staked Mina</div>
            <div
              class="border-alpha-50-300-50 d-flex align-items-center p-10 radius-10"
            >
              <inline-svg
                src="/icons/cash.svg"
                class="snow-white me-1"
                :height="20"
                :width="20"
              ></inline-svg>
              {{ game.reward }} Mina
            </div>
          </div>
        </div>
      </div>

      <div class="d-flex justify-content-between footer">
        <Button
          class="btn-cta3 fs-14 fw-400 color-snow-white border-alpha-50-300-50 px-5"
          size="large"
          @click="handleBackClick"
        >
          <span v-if="currentStep === 0">Cancel</span>
          <span v-else-if="currentStep === 1">Back</span>
          <span v-else>Back to Edit</span>
        </Button>
        <Button
          :loading="loading"
          :class="[
            'color-black fs-14 fw-400 radius-10 px-5',
            {
              'btn-cta3': !compiled && currentStep === 2,
            },
          ]"
          size="large"
          @click="handleNextStep"
        >
          <span v-if="currentStep !== 2">Next</span>
          <div class="d-flex align-items-center gap-1" v-else-if="compiled">
            <inline-svg src="/icons/rocket.svg"></inline-svg>
            Launch
          </div>
          <div v-else class="color-snow-white">
            <el-tooltip
              placement="bottom"
              effect="customized"
              popper-class="compilation-tooltip"
            >
              <template #content>
                <div class="fw-600">Generating your ZK Proof!</div>
                <div class="fs-12">
                  This step lets you play the game trustlessly right in your
                  browser—no blockchain involved.
                </div>
                <div
                  class="bg-alpha-8-300-8 border-alpha-50-300-50 p-1 color-green"
                >
                  Estimated 15-20 sec. Please don’t refresh or close the page.
                </div>
              </template>
              Waiting for compilation
            </el-tooltip>
          </div>
        </Button>
      </div>
    </div>
  </Modal>
</template>
<script lang="ts" setup>
import { ref } from 'vue';
import Modal from '@/components/shared/Modal.vue';
import Button from '@/components/shared/Button.vue';
import RoundedColor from '@/components/shared/RoundedColor.vue';
import { initialColor } from '@/constants/colors';
import { AvailableColor } from '@/types';
import { useZkAppStore } from '@/store/zkAppModule';
import { Field } from 'o1js';
import { storeToRefs } from 'pinia';
import { ElMessage } from 'element-plus';
import { updateLocalStorageGames, validateColorCombination } from '@/utils';
import { useRouter } from 'vue-router';
import CodePicker from '@/components/shared/CodePicker.vue';
import { useCustomMessage } from '@/composables/useCustomMessage';

const router = useRouter();
const { createInitGameTransaction } = useZkAppStore();
const { error, currentTransactionLink, zkAppAddress, compiled, loading } =
  storeToRefs(useZkAppStore());
const emit = defineEmits(['close']);
const { showMessage } = useCustomMessage();
const infos = [
  {
    title: 'About Mina:',
    description:
      'zkApps in the Real World<br> Beyond games, zkApps on Mina can power private online voting, identity verification without sharing your personal documents, and much more.',
  },
  {
    title: ' A Proof of a Proof',
    description:
      'Recursive proofs are like a set of Russian dolls. Each new proof wraps around the previous one, creating a tiny, easily verifiable package that represents a massive <br>amount of information.',
  },
];
const currentInfo = ref(0);
const steps = [
  { title: 'Set Code', index: 0 },
  { title: 'Stake Mina', index: 1 },
  { title: 'Ready to Launch', index: 2 },
];
const currentStep = ref(0);
const roomNames = ['Mina is Awesome', 'Mina is Amazing'];
const rewardAmounts = [10, 50, 100];
const game = ref({
  secret: Array.from({ length: 4 }, () => initialColor),
  reward: 10,
  roomName: roomNames[0],
  randomSalt: Field.random().toString(),
});
const generateRoomName = () => {
  game.value.roomName = roomNames[Math.floor(Math.random() * roomNames.length)];
};
const setRewardAmount = (amount: number) => {
  game.value.reward = amount;
};
const handleModalClose = () => {
  emit('close');
};
const handleBackClick = () => {
  if (currentStep.value === 0) {
    emit('close');
  } else if (currentStep.value === 1) {
    currentStep.value -= 1;
  } else {
    currentStep.value = 0;
  }
};
const handleNextStep = async () => {
  if (currentStep.value === 0) {
    const { isValid } = validateColorCombination(game.value?.secret);
    if (!isValid) {
      showMessage({
        type: 'error',
        title: 'Invalid Combination',
        description:
          'Please choose a combination of 4 unique digits between 0 and 7',
        duration: 3000,
      });
      return;
    }
  }
  if (currentStep.value !== 2) {
    currentStep.value += 1;
  } else {
    if (!compiled.value) {
      return;
    }
    await createInitGameTransaction(
      game.value.secret.map((e: AvailableColor) => Number(e.value)),
      game.value.randomSalt,
      game.value.reward! * 1e9,
      game.value.roomName
    );
    if (error.value) {
      ElMessage.error({ message: error.value, duration: 6000 });
    } else {
      updateLocalStorageGames(zkAppAddress.value as string, {
        randomSalt: game.value.randomSalt,
        secretCode: game.value.secret,
        roomName: game.value.roomName,
        gameCreationTransactionHash: currentTransactionLink.value,
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
};
const handleInfoChange = (current: number) => {
  currentInfo.value = current;
};
const handleSecretChange = (newSecret: Array<AvailableColor>) => {
  game.value.secret = [...newSecret];
};
</script>
<style lang="scss" scoped>
.stake {
  width: 50px;
  height: 50px;
}
.indicator {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: black;
}
.generate-btn {
  border: none;
}
</style>
<style lang="scss">
.el-carousel__indicators--horizontal {
  display: none !important;
}
</style>
