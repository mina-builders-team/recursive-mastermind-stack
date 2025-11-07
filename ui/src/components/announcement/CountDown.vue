<template>
    <div class="d-flex ">
        <div class="d-flex gap-2">
            <div class="card__container d-flex flex-column justify-content-center align-items-center">
                <div>{{ days }}</div>
                <div class="fs-10">Days</div>
            </div>
            <div class="card__container d-flex flex-column justify-content-center align-items-center">{{ hours }}
                <div class="fs-10">Hours</div>

            </div>
            <div class="card__container d-flex flex-column justify-content-center align-items-center">{{ minutes }}
                <div class="fs-10">Minutes</div>

            </div>
            <div class="card__container d-flex flex-column justify-content-center align-items-center">{{ seconds }}
                <div class="fs-10">Seconds</div>

            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, onUnmounted } from 'vue'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import duration from 'dayjs/plugin/duration'

dayjs.extend(utc)
dayjs.extend(duration)


const sessionUTC = dayjs.utc('2025-10-22T17:00:00Z')


const days = ref(0)
const hours = ref(0)
const minutes = ref(0)
const seconds = ref(0)

let interval: number | undefined

function updateCountdown() {
    const now = dayjs()
    const diff = sessionUTC.diff(now)

    if (diff <= 0) {
        clearInterval(interval)
        days.value = hours.value = minutes.value = seconds.value = 0
        return
    }

    const d = dayjs.duration(diff)
    days.value = d.days()
    hours.value = d.hours()
    minutes.value = d.minutes()
    seconds.value = d.seconds()
}

onMounted(() => {
    updateCountdown()
    interval = setInterval(updateCountdown, 1000)
})

onUnmounted(() => {
    if (interval) clearInterval(interval)
})

</script>
<style lang="scss" scoped>
.card__container {
    height: fit-content;
    padding: 15px;
    border-radius: 10px;
    border: 1px solid rgba(59, 61, 63, 0.5);
    background-blend-mode: color-dodge;
    box-shadow: 0 3px 41px 20px $alpha-20-300-20 inset;
    filter: drop-shadow(0 20px 40px rgba(12, 14, 17, 0.4));
    backdrop-filter: blur(7.5px);
}
</style>