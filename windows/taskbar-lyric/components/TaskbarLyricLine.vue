<script setup lang="ts">
import type { LyricLine } from "@shared/types/lyrics";
import { getTaskbarLyricCurrentMs } from "../composables/useNowPlayingSync";

const props = defineProps<{
  line: LyricLine;
  wordByWord: boolean;
}>();

const wordRefs: HTMLSpanElement[] = [];

const getWordProgress = (
  word: { startTime: number; endTime: number },
  currentMs: number,
): string => {
  const span = word.endTime - word.startTime;
  const progress =
    span <= 0
      ? currentMs >= word.startTime
        ? 1
        : 0
      : Math.max(0, Math.min(1, (currentMs - word.startTime) / span));
  const pct = (progress * 100).toFixed(1);
  const px = progress * 4 - 2;
  const signed = px >= 0 ? `+ ${px.toFixed(2)}px` : `- ${(-px).toFixed(2)}px`;
  return `calc(${pct}% ${signed})`;
};

const setWordRef = (el: Element | { $el?: Element } | null, index: number): void => {
  const target = el instanceof Element ? el : (el?.$el ?? null);
  if (target instanceof HTMLSpanElement) {
    wordRefs[index] = target;
  } else {
    delete wordRefs[index];
  }
};

let rafId = 0;
let lastWordProgress: string[] = [];

const resetRenderCache = (): void => {
  lastWordProgress = [];
  wordRefs.length = 0;
};

const renderFrame = (): void => {
  if (!props.wordByWord) {
    rafId = 0;
    return;
  }
  const currentMs = getTaskbarLyricCurrentMs();
  for (let i = 0; i < props.line.words.length; i++) {
    const el = wordRefs[i];
    if (!el) continue;
    const progress = getWordProgress(props.line.words[i], currentMs);
    if (lastWordProgress[i] !== progress) {
      lastWordProgress[i] = progress;
      el.style.setProperty("--p", progress);
    }
  }
  rafId = requestAnimationFrame(renderFrame);
};

const startRenderLoop = (): void => {
  if (rafId === 0 && props.wordByWord) {
    rafId = requestAnimationFrame(renderFrame);
  }
};

const stopRenderLoop = (): void => {
  if (rafId !== 0) {
    cancelAnimationFrame(rafId);
    rafId = 0;
  }
};

watch(
  () => props.wordByWord,
  (enabled) => {
    resetRenderCache();
    if (enabled) startRenderLoop();
    else stopRenderLoop();
  },
);
watch(() => props.line, resetRenderCache);

onMounted(startRenderLoop);
onBeforeUnmount(stopRenderLoop);
</script>

<template>
  <template v-if="wordByWord">
    <span
      v-for="(word, i) in line.words"
      :key="i"
      :ref="(el) => setWordRef(el, i)"
      class="tb-word"
      >{{ word.word }}</span
    >
  </template>
  <span v-else>{{ line.words.map((w) => w.word).join("") }}</span>
</template>

<style scoped>
.tb-word {
  --p: 0%;
  display: inline;
  color: transparent;
  -webkit-text-fill-color: transparent;
  background: linear-gradient(
    90deg,
    var(--tbl-played) 0%,
    var(--tbl-played) calc(var(--p) - 2px),
    var(--tbl-unplayed) calc(var(--p) + 2px),
    var(--tbl-unplayed) 100%
  );
  -webkit-background-clip: text;
  background-clip: text;
}
</style>
