<template>
  <div
    :class="
      [
        ' d-flex align-items-center gap-1 p-10 radius-10 fs-16 fw-600 ',
        {
          'color-black bg-snow-white ': !isCritical,
          'critical color-snow-white ': isCritical,
        },
      ].concat(customClass)
    "
  >
    <inline-svg
      class="me-1"
      v-if="isCritical"
      src="/icons/alert.svg"
    ></inline-svg>
    <span
      ><span v-if="minutes !== '00'">{{ minutes || 0 }} min </span>
      {{ seconds || 0 }} s</span
    >
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
    type: Boolean,
    default: true,
  },
  showIcon: {
    type: Boolean,
    default: true,
  },
  criticalOn: {
    type: Number,
    required: false,
  },
  customClass: {
    type: String,
    required: false,
    default: '',
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
  isCritical.value = props.criticalOn && timeLeft <= props.criticalOn;
};

const startTimer = () => {
  updateCountdown();
  interval = setInterval(updateCountdown, 1000);
};

onMounted(() => {
  startTimer();
});
onUnmounted(() => clearInterval(interval));
</script>

<style scoped lang="scss">
.critical {
  background: #ff375f4d;
  border: 1px solid #ff375f;
}
</style>
