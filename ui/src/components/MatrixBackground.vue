<template>
  <canvas id="matrixExportCanvas"></canvas>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount } from 'vue';

onMounted(() => {
  const config = {
    charColor: '#3C3B40',
    trailOpacity: 0.05,
    animationSpeed: 76,
    highlightLeadingChar: true,
    leadingCharColor: '#3C3B40',
    fontSize: 18,
    characterPersistence: false,
    waveAmplitude: 30,
    waveFrequency: 5,
    waveSpeed: 0.05,
    swirlRotationSpeed: 0.02,
    swirlExpansionRate: 0.5,
    swirlDropCount: 150,
    fadeDropCount: 200,
    fadeSpeedMultiplier: 1,
    characterSet: `アァカサタナハマヤャラワガザダバパイィキシチニヒミリヰギジヂビピウゥクスツヌフムユュルグズブヅプエェケセテネヘメレヱゲゼデベペオォコソトノホモヨョロヲゴゾドボポヴッンABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#\$%^&*()_+-=[]{}|;':",./<>?`,
    animationType: 'rain-down',
    canvasId: 'matrixExportCanvas',
  };

  const BASE_FADE_IN_FRAMES = 60;
  const BASE_VISIBLE_DURATION_FRAMES = 120;
  const BASE_FADE_OUT_FRAMES = 60;

  const FADE_IN_FRAMES = BASE_FADE_IN_FRAMES / config.fadeSpeedMultiplier;
  const VISIBLE_DURATION_FRAMES =
    BASE_VISIBLE_DURATION_FRAMES / config.fadeSpeedMultiplier;
  const FADE_OUT_FRAMES = BASE_FADE_OUT_FRAMES / config.fadeSpeedMultiplier;

  const canvas = document.getElementById(config.canvasId) as HTMLCanvasElement;
  const ctx = canvas.getContext('2d');
  if (!canvas || !ctx) return;

  const charsToUse = config.characterSet.split('');
  const getRandomChar = () =>
    charsToUse[Math.floor(Math.random() * charsToUse.length)];

  let drops: any[] = [];
  let wavePhase = 0;

  function initializeDrops() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const newDrops: any[] = [];
    wavePhase = 0;

    if (
      ['rain-down', 'wave-rain-down', 'rise-up', 'wave-rise-up'].includes(
        config.animationType
      )
    ) {
      const columns = Math.floor(canvas.width / config.fontSize);
      for (let i = 0; i < columns; i++) {
        newDrops[i] = {
          position: Math.floor(
            Math.random() * (canvas.height / config.fontSize)
          ),
          char: getRandomChar(),
          waveOffset: Math.random() * Math.PI * 2,
        };
      }
    }

    drops = newDrops;
  }

  function draw() {
    ctx.fillStyle = `rgba(0,0,0, ${config.trailOpacity})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = `${config.fontSize}px monospace`;
    wavePhase += config.waveSpeed;

    for (let i = 0; i < drops.length; i++) {
      const drop = drops[i];
      if (!config.characterPersistence || drop.char === undefined) {
        drop.char = getRandomChar();
      }

      let xP = i * config.fontSize;
      let yP = drop.position * config.fontSize;

      if (config.animationType === 'wave-rain-down') {
        xP +=
          config.waveAmplitude *
          Math.sin(
            (yP / canvas.height) * config.waveFrequency * Math.PI * 2 +
              wavePhase +
              drop.waveOffset
          );
      }

      ctx.fillStyle = config.highlightLeadingChar
        ? config.leadingCharColor
        : config.charColor;
      ctx.fillText(drop.char, xP, yP);

      drop.position++;
      if (yP > canvas.height && Math.random() > 0.975) {
        drop.position = 0;
        if (config.characterPersistence) drop.char = getRandomChar();
      }
    }
  }

  let lastTime = 0;
  const targetInterval = Math.max(10, 150 - config.animationSpeed * 1.4);

  let animationId: number;

  function animate(timestamp: number) {
    if (!lastTime) lastTime = timestamp;
    const deltaTime = timestamp - lastTime;

    if (deltaTime > targetInterval) {
      draw();
      lastTime = timestamp - (deltaTime % targetInterval);
    }
    animationId = requestAnimationFrame(animate);
  }

  initializeDrops();
  animationId = requestAnimationFrame(animate);
  window.addEventListener('resize', initializeDrops);

  onBeforeUnmount(() => {
    cancelAnimationFrame(animationId);
    window.removeEventListener('resize', initializeDrops);
  });
});
</script>

<style scoped>
canvas#matrixExportCanvas {
  position: fixed;
  top: 0;
  left: 0;
  z-index: -1;
  display: block;
  width: 100%;
  height: 100%;
  background-color: #000;
}
</style>
