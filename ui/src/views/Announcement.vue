<template>
    <div class="mt-3 d-flex flex-column gap-4">
        <div class="d-flex justify-content-between mt-2">
            <div class="d-flex align-items-center gap-3">
                <img src="/icons/M.png" width="50px" height="50px"></img>
                <div>
                    <div class="fw-700 fs-21 my-2">Mina Mastermind Game Night</div>
                    <div class="color-gray fs-16">Live community event • MINA rewards</div>
                </div>
            </div>
        </div>
        <div class="d-flex gap-5 content__container">
            <div class="d-flex flex-column gap-3">
                <div class="default-border radius-10 bg-alpha-50-900-50 p-10 ">
                    <div class="fw-700 fs-21 my-2">What is Mina Mastermind Game Night?</div>
                    <div>
                        A scheduled community event for the Mastermind game on Mina — players join at the same
                        time,
                        compete, earn points, and climb the special game night leaderboard.
                    </div>
                </div>
                <div class="default-border radius-10 bg-alpha-50-900-50 p-10 ">
                    <div class="fw-700 fs-21 my-2">
                        Next scheduled session
                    </div>
                    <div class="d-flex gap-4 align-items-center scheduled-session">
                        <div class="card__container fit-content my-2 mb-3">
                            <div>Session: {{ sessionUTCStr }}</div>
                            <div>Local: {{ sessionLocalStr }}</div>
                        </div>
                        <CountDown />
                    </div>
                </div>
                <div class="default-border radius-10 bg-alpha-50-900-50 p-10 ">
                    <div class="fw-700 fs-21 my-2">How it works</div>
                    <ul>
                        <li>Players join and play during the 3-hour game night window.</li>
                        <li>Players will create rooms or join an existing one by browsing the existing rooms.</li>
                        <li>After each game, points are added to both the global and game night leaderboards.</li>
                        <li>Players also receive their normal game rewards upon winning.</li>
                        <li>The top 3 players on the game night leaderboard earn MINA rewards.</li>
                        <li>Note*: The global leaderboard is not used to determine winners.</li>
                        <li>
                            You can find the full points system here:
                            <a class="color-snow-white fw-700"
                                href="https://yamancan.notion.site/Leaderboard-Titles-2317754aa3568011ab9ad2f46006ce87"
                                target="_blank">Leaderboard Titles & Points System↗</a>
                        </li>
                    </ul>
                </div>
            </div>
            <div class="d-flex flex-column gap-3">
                <div class="default-border radius-10 bg-alpha-50-900-50 p-10 ">
                    <div class="fw-700 fs-21 my-2">Prizes</div>
                    <div>
                        <ul>
                            <li>🥇 1st Place: 1000 $MINA.</li>
                            <li>🥈 2nd Place: 500 $MINA.</li>
                            <li>🥉 3rd Place: 250 $MINA.</li>
                        </ul>
                        <div>
                            Rewards are distributed after the game night concludes, based on the final leaderboard
                            snapshot.
                        </div>
                    </div>
                </div>
                <div class="default-border radius-10 bg-alpha-50-900-50 p-10 ">
                    <div class="fw-700 fs-21 my-2">Follow Us</div>
                    <div class="mb-2">
                        Stay updated with the latest Mina Mastermind news and events:
                    </div>
                    <div>
                        <ul>
                            <li class="cursor-pointer mb-2 fw-700">
                                <a href="https://x.com/minaMastermind" target="_blank"
                                    class="color-snow-white text-decoration-none">
                                    <inline-svg width="20" height="20" src="/icons/x.svg"></inline-svg>
                                    Mina Mastermind
                                </a>
                            </li>
                            <li class="cursor-pointer fw-700">
                                <a href="https://x.com/minabuilders" target="_blank"
                                    class="color-snow-white text-decoration-none">
                                    <inline-svg width="20" height="20" src="/icons/x.svg"></inline-svg>
                                    Builders Team
                                </a>
                            </li>
                            <li class="cursor-pointer fw-700 my-2">
                                <a href="https://t.me/mastermindmina" target="_blank"
                                    class="color-snow-white text-decoration-none">
                                    <inline-svg width="20" height="20" src="/icons/telegram.svg"></inline-svg>
                                    <span class="ms-1">Mina Mastermind Channel</span> 
                                </a>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import advancedFormat from 'dayjs/plugin/advancedFormat'
import timezone from 'dayjs/plugin/timezone'
import CountDown from '@/components/announcement/CountDown.vue'

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(advancedFormat)

const TOURNAMENT_START = import.meta.env.VITE_TOURNAMENT_START
const sessionStartUTC = dayjs.utc(TOURNAMENT_START)
const sessionEndUTC = sessionStartUTC.add(3, 'hour')
const sessionUTCStr = ref(`${sessionStartUTC.format('ddd DD MMM YYYY HH:mm')} — ${sessionEndUTC.format('HH:mm')} UTC`)
const sessionLocalStr = ref(
    `${sessionStartUTC.local().format('ddd DD MMM YYYY HH:mm')} — ${sessionEndUTC.local().format('HH:mm')}`
)
</script>
<style lang="scss" scoped>
.card__container {
    padding: 20px 18px;
    border-radius: 10px;
    border: 1px solid rgba(59, 61, 63, 0.5);
    background-blend-mode: color-dodge;
    box-shadow: 0 3px 41px 20px $alpha-20-300-20 inset;
    filter: drop-shadow(0 20px 40px rgba(12, 14, 17, 0.4));
    backdrop-filter: blur(7.5px);
}

@media (max-width: 786px) {
    .content__container {
        flex-direction: column;
    }

    .scheduled-session {
        flex-direction: column;
    }
}
</style>
