import { onMounted } from 'vue';

export function usePreloadedSound(src: string) {
  let audio: HTMLAudioElement;

  onMounted(() => {
    audio = new Audio(src);
    audio.preload = 'auto';
    audio.load();
  });

  const playSound = () => {
    if (!audio) return;
    audio.currentTime = 0;
    audio.play();
  };

  return { playSound };
}
