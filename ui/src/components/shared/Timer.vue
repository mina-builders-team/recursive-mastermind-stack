<template>
  <div class="d-flex align-items-center gap-1">
    <el-icon
      v-if="showIcon"
      :size="25"
      :class="['cursor-pointer timer-icon', { critical: isCritical }]"
      ><Timer
    /></el-icon>
    <span>{{ minutes }}:{{ seconds }}</span>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';

const emit = defineEmits(['timeEnded']);

const props = defineProps({
  startTimestamp: {
    required: true,
    type: Number,
  },
  duration: {
    required: true,
    type: Number,
  },
  notifyOnCritical: {
    type:Boolean,
    default:true
  },
  showIcon:{
    type:Boolean,
    default:true
  },
});


const minutes = ref('00');
const seconds = ref('00');
const isCritical = ref(false);

let interval;
const updateCountdown = () => {
  const now = Date.now();
  const elapsed = now - props.startTimestamp;

  if (elapsed >= props.duration) {
    emit('timeEnded');
    clearInterval(interval);
    minutes.value = '00';
    seconds.value = '00';
    isCritical.value = false;
    return;
  }

  const timeLeft = props.duration - elapsed;
  const m = Math.floor(timeLeft / 60000);
  const s = Math.floor((timeLeft % 60000) / 1000);

  minutes.value = String(m).padStart(2, '0');
  seconds.value = String(s).padStart(2, '0');
  isCritical.value = timeLeft <= 30000;
};

const startTimer = () => {
  updateCountdown();
  interval = setInterval(updateCountdown, 1000);
};

onMounted(startTimer);
onUnmounted(() => clearInterval(interval));
</script>

<style scoped>
.critical {
  color: rgb(217, 103, 103);
  animation: blink 0.5s step-start infinite;
}

@keyframes blink {
  50% {
    opacity: 0;
  }
}
</style>
