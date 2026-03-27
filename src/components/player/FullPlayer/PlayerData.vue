<script setup lang="ts">
import { useMediaStore } from "@/stores/media";
import { getQualityLabel, getQualityLevel } from "@/utils/quality";

const media = useMediaStore();

/** 来源标签 */
const sourceLabel = computed(() => (media.track?.source === "online" ? "ONLINE" : "LOCAL"));

/** 音质等级标签 */
const qualityLabel = computed(() => getQualityLabel(media.detail?.quality));

/** 是否为无损级别（显示图标） */
const showLosslessIcon = computed(() => {
  const level = getQualityLevel(media.detail?.quality);
  return level === "hi-res" || level === "lossless";
});

/** 歌词格式标签 */
const lyricLabel = computed(() => media.activeLyric?.format.toUpperCase() ?? "NO-LRC");

/** 专辑文本 */
const albumText = computed(() => media.track?.album?.name ?? "");
</script>

<template>
  <div
    v-if="media.track"
    class="w-full text-center flex flex-col gap-[0.4em] text-[clamp(0.7rem,1.4vw,0.95rem)]"
  >
    <!-- 标题 -->
    <div class="text-[1.8em] font-semibold truncate">
      {{ media.track.title }}
    </div>
    <!-- 副标题/注释 -->
    <div v-if="media.track.comment" class="text-[1em] mb-1.5 text-cover/40 truncate">
      {{ media.track.comment }}
    </div>
    <!-- 元信息标签行 -->
    <div class="flex items-center justify-center gap-1.5 text-[0.8em] text-cover/60">
      <span
        class="inline-flex items-center justify-center leading-none px-1.5 py-1.2 rounded-md border-1 border-solid border-cover/30"
      >
        {{ sourceLabel }}
      </span>
      <SPopover side="top" :side-offset="8">
        <template #trigger>
          <span
            v-if="qualityLabel"
            class="inline-flex items-center gap-1 leading-none px-1.5 py-1.2 rounded-md border-1 border-solid border-cover/30 cursor-pointer transition-colors hover:border-cover/60"
          >
            <IconSpLossless v-if="showLosslessIcon" class="text-[1.6em] -my-[0.5em]" />
            {{ qualityLabel }}
          </span>
        </template>
        <div v-if="media.detail?.quality" class="min-w-48 text-xs">
          <div class="font-medium text-sm mb-2">音质详情</div>
          <div class="flex flex-col gap-1.5 text-on-surface/70">
            <div class="flex justify-between">
              <span class="text-on-surface/40">编码格式</span>
              <span>{{ media.detail.quality.codec.toUpperCase() }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-on-surface/40">采样率</span>
              <span>{{ (media.detail.quality.sampleRate / 1000).toFixed(1) }} kHz</span>
            </div>
            <div class="flex justify-between">
              <span class="text-on-surface/40">位深</span>
              <span>{{ media.detail.quality.bitsPerSample }} bit</span>
            </div>
            <div class="flex justify-between">
              <span class="text-on-surface/40">比特率</span>
              <span>{{ Math.round(media.detail.quality.bitRate / 1000) }} kbps</span>
            </div>
            <div class="flex justify-between">
              <span class="text-on-surface/40">声道</span>
              <span>{{ media.detail.quality.channels === 2 ? "立体声" : media.detail.quality.channels === 1 ? "单声道" : `${media.detail.quality.channels} 声道` }}</span>
            </div>
          </div>
        </div>
      </SPopover>
      <span
        class="inline-flex items-center justify-center leading-none px-1.5 py-1.2 rounded-md border-1 border-solid border-cover/30"
      >
        {{ lyricLabel }}
      </span>
    </div>
    <!-- 歌手 -->
    <div
      v-if="media.track.artists.length"
      class="flex items-center justify-center gap-1.5 text-[1em] text-cover/60 truncate"
    >
      <IconLucideMic class="shrink-0 translate-y-px text-cover/40" />
      <span class="truncate">
        <template v-for="(artist, index) in media.track.artists" :key="index">
          <span class="cursor-pointer transition-colors hover:text-cover">
            {{ artist.name }}
          </span>
          <span v-if="index < media.track.artists.length - 1"> / </span>
        </template>
      </span>
    </div>
    <!-- 专辑 -->
    <div
      v-if="albumText"
      class="flex items-center justify-center gap-1.5 text-[1em] text-cover/60 truncate"
    >
      <IconLucideDisc3 class="shrink-0 translate-y-px text-cover/40" />
      <span class="truncate cursor-pointer transition-colors hover:text-cover">
        {{ albumText }}
      </span>
    </div>
  </div>
</template>
