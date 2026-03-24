<script setup lang="ts">
import { useStatusStore } from "@/stores/status";
import type { RepeatMode } from "@/stores/status";
import { useMediaStore } from "@/stores/media";
import * as player from "@/core/player";

const status = useStatusStore();
const media = useMediaStore();
const { isPlaying, isLoading, position, duration, isExpanded, repeatMode, shuffleMode } = storeToRefs(status);

const hasTrack = computed(() => !!media.track);

const togglePlay = (): void => {
  if (!hasTrack.value) return;
  if (isPlaying.value) {
    player.pause();
  } else {
    player.play();
  }
};

/** 循环模式切换顺序 */
const repeatCycle: RepeatMode[] = ["list", "one", "off"];
const cycleRepeat = (): void => {
  const idx = repeatCycle.indexOf(repeatMode.value);
  player.setRepeatMode(repeatCycle[(idx + 1) % repeatCycle.length]);
};

const toggleShuffle = (): void => {
  player.setShuffleMode(shuffleMode.value === "on" ? "off" : "on");
};

const formatTime = (ms: number): string => {
  const totalSecs = Math.floor(ms / 1000);
  const min = Math.floor(totalSecs / 60);
  const sec = totalSecs % 60;
  return `${min}:${sec.toString().padStart(2, "0")}`;
};

const onSeek = (e: Event): void => {
  const value = Number((e.target as HTMLInputElement).value);
  player.seek(value);
};
</script>

<template>
  <div class="flex items-center gap-4 h-full px-4">
    <!-- 歌曲信息 -->
    <div class="flex items-center gap-3 w-50 shrink-0">
      <img
        v-if="media.track?.cover"
        :src="media.track.cover"
        class="size-12 rounded-lg object-cover bg-surface-alt cursor-pointer hover:opacity-80 transition-opacity"
        @click="isExpanded = true"
      />
      <div v-if="media.track" class="min-w-0 text-sm">
        <div class="truncate font-medium">{{ media.track.title }}</div>
        <div class="truncate text-xs text-on-surface-variant">
          {{ media.track.artists.map((a) => a.name).join(" / ") }}
        </div>
      </div>
    </div>

    <!-- 播放控制 + 进度 -->
    <div class="flex-1 flex flex-col items-center gap-1">
      <div class="flex items-center gap-3">
        <!-- 随机模式 -->
        <SButton
          variant="ghost"
          circle
          size="small"
          :class="shuffleMode === 'on' ? 'text-primary' : 'text-on-surface-variant'"
          @click="toggleShuffle"
        >
          <template #icon><IconLucideShuffle /></template>
        </SButton>
        <!-- 上一曲 -->
        <SButton variant="ghost" circle size="small" :disabled="!hasTrack" @click="player.prevTrack()">
          <template #icon><IconLucideSkipBack /></template>
        </SButton>
        <!-- 播放/暂停 -->
        <SButton type="primary" variant="secondary" circle :loading="isLoading" :disabled="!hasTrack && !isLoading" @click="togglePlay">
          <template #icon>
            <IconLucidePause v-if="isPlaying" />
            <IconLucidePlay v-else />
          </template>
        </SButton>
        <!-- 下一曲 -->
        <SButton variant="ghost" circle size="small" :disabled="!hasTrack" @click="player.nextTrack()">
          <template #icon><IconLucideSkipForward /></template>
        </SButton>
        <!-- 循环模式 -->
        <SButton
          variant="ghost"
          circle
          size="small"
          :class="repeatMode === 'off' ? 'text-on-surface-variant' : 'text-primary'"
          @click="cycleRepeat"
        >
          <template #icon>
            <IconLucideRepeat1 v-if="repeatMode === 'one'" />
            <IconLucideRepeat v-else />
          </template>
        </SButton>
      </div>
      <div class="flex items-center gap-2 w-full max-w-lg">
        <span class="text-xs text-on-surface-variant min-w-9 text-center">{{
          formatTime(position)
        }}</span>
        <input
          type="range"
          min="0"
          :max="duration"
          step="100"
          :value="position"
          class="flex-1 accent-primary"
          @input="onSeek"
        />
        <span class="text-xs text-on-surface-variant min-w-9 text-center">{{
          formatTime(duration)
        }}</span>
      </div>
    </div>

    <!-- 音量 -->
    <div class="flex items-center gap-2 w-36 shrink-0">
      <IconLucideVolume2 class="size-4 text-on-surface-variant shrink-0" />
      <input
        type="range"
        min="0"
        max="1"
        step="0.01"
        :value="status.volume"
        class="flex-1 accent-primary"
        @input="player.setVolume(Number(($event.target as HTMLInputElement).value))"
      />
    </div>
  </div>
</template>
