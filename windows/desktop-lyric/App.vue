<script setup lang="ts">
import { ref, shallowRef, computed, onMounted, onBeforeUnmount } from "vue";
import { findLyricIndex } from "@shared/utils/lyric";
import type { NowPlayingSnapshot, NowPlayingPositionSync } from "@shared/types/nowPlaying";
import type { LyricLine } from "@shared/types/lyrics";
import type { Track } from "@shared/types/player";

/** 当前 track */
const track = shallowRef<Track | null>(null);
/** 完整歌词 */
const lyric = shallowRef<LyricLine[]>([]);
/** 当前是否播放中 */
const playing = ref(false);
/** 当前插值出的播放位置（毫秒，仅作显示） */
const currentMs = ref(0);
/** 当前歌词行索引 */
const lineIndex = ref(-1);

/** 锚点：主进程发送时的播放位置 */
let anchorPos = 0;
/** 锚点：本地 performance.now() */
let anchorPerf = 0;

const currentLine = computed<LyricLine | null>(() => {
  const idx = lineIndex.value;
  if (idx < 0 || idx >= lyric.value.length) return null;
  return lyric.value[idx];
});

const currentText = computed<string>(() => {
  const line = currentLine.value;
  if (!line) return "";
  return line.words.map((word) => word.word).join("");
});

const displayTitle = computed<string>(() => {
  const cur = track.value;
  if (!cur) return "暂无播放";
  const artist = cur.artists?.map((a) => a.name).join(" / ") ?? "";
  return artist ? `${cur.title} - ${artist}` : cur.title;
});

/** 应用主进程推送的位置锚点（带 IPC 延迟补偿） */
const applyAnchor = (positionMs: number, sendTimestamp: number): void => {
  const ipcDelay = Math.max(0, Date.now() - sendTimestamp);
  anchorPos = positionMs + ipcDelay;
  anchorPerf = performance.now();
};

const applySnapshot = (snap: NowPlayingSnapshot): void => {
  track.value = snap.track;
  lyric.value = snap.lyric;
  playing.value = snap.playing;
  lineIndex.value = -1;
  applyAnchor(snap.position, snap.sendTimestamp);
};

let rafId: number | null = null;
const tick = (): void => {
  if (playing.value) {
    currentMs.value = anchorPos + (performance.now() - anchorPerf);
  } else {
    currentMs.value = anchorPos;
  }
  lineIndex.value = findLyricIndex(lyric.value, currentMs.value, lineIndex.value);
  rafId = requestAnimationFrame(tick);
};

const unsubscribers: Array<() => void> = [];

onMounted(async () => {
  try {
    const snap = await window.api.nowPlaying.requestSnapshot();
    applySnapshot(snap);
  } catch (error) {
    console.error("[desktop-lyric] requestSnapshot failed", error);
  }

  unsubscribers.push(
    window.api.nowPlaying.onLyricChange((snap) => applySnapshot(snap)),
    window.api.nowPlaying.onPositionSync((data: NowPlayingPositionSync) => {
      playing.value = data.playing;
      applyAnchor(data.position, data.sendTimestamp);
    }),
  );

  rafId = requestAnimationFrame(tick);
});

onBeforeUnmount(() => {
  if (rafId !== null) cancelAnimationFrame(rafId);
  for (const off of unsubscribers) off();
});
</script>

<template>
  <div class="root">
    <div class="title">{{ displayTitle }}</div>
    <div class="line">{{ currentText || "—" }}</div>
    <div v-if="currentLine?.translatedLyric" class="trans">{{ currentLine.translatedLyric }}</div>
    <div class="debug">{{ Math.round(currentMs) }}ms · line {{ lineIndex }} / {{ lyric.length }}</div>
  </div>
</template>

<style scoped>
.root {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0 24px;
}
.title {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 8px;
  width: 100%;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.line {
  font-size: 24px;
  font-weight: 600;
  line-height: 1.3;
  width: 100%;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.trans {
  font-size: 16px;
  color: rgba(255, 255, 255, 0.7);
  margin-top: 4px;
  width: 100%;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.debug {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
  margin-top: 12px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}
</style>
