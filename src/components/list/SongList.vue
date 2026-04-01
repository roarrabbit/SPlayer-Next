<script setup lang="ts">
import type { Track } from "@shared/types/player";
import { useMediaStore } from "@/stores/media";
import { useStatusStore } from "@/stores/status";
import { formatTime } from "@/utils/time";
import { formatFileSize } from "@/utils/format";
import * as player from "@/core/player";

const props = withDefaults(
  defineProps<{
    /** 歌曲列表数据 */
    items: Track[];
    /** 显示序号 */
    showIndex?: boolean;
    /** 显示专辑 */
    showAlbum?: boolean;
    /** 显示时长 */
    showDuration?: boolean;
    /** 显示文件大小 */
    showSize?: boolean;
  }>(),
  {
    showIndex: true,
    showAlbum: true,
    showDuration: true,
    showSize: false,
  },
);

const emit = defineEmits<{
  play: [index: number];
}>();

const { t } = useI18n();
const media = useMediaStore();
const status = useStatusStore();

/** 当前播放歌曲 ID */
const playingId = computed(() => media.track?.id);

/** 双击播放 */
const handlePlay = (index: number): void => {
  emit("play", index);
};
</script>

<template>
  <SVirtualList
    :items="items"
    :item-height="88"
    :padding-bottom="80"
    :get-item-key="(item: Track) => item.id"
    item-fixed
    height="100%"
  >
    <!-- 固定表头 -->
    <template #header>
      <div class="flex items-center gap-3 pl-3 pr-6 mx-3 h-10 text-sm text-on-surface-variant/60">
        <div v-if="showIndex" class="w-8 shrink-0 text-center">#</div>
        <div class="flex-1 min-w-0">{{ t("songList.title") }}</div>
        <div v-if="showAlbum" class="flex-1 min-w-0">{{ t("songList.album") }}</div>
        <div v-if="showDuration" class="w-16 shrink-0 text-center">{{ t("songList.duration") }}</div>
        <div v-if="showSize" class="w-16 shrink-0 text-center">{{ t("songList.size") }}</div>
      </div>
    </template>

    <!-- 列表项 -->
    <template #default="{ item, index }: { item: Track; index: number }">
      <div class="px-3 pb-3">
        <div
          class="group flex items-center gap-3 pl-3 pr-6 h-19 rounded-xl cursor-pointer border-2 border-solid transition-[background-color,border-color] duration-200"
          :class="
            playingId === item.id
              ? 'bg-primary/16 border-primary/40'
              : 'bg-surface-panel border-primary/12 hover:border-primary/30 hover:bg-on-surface/8 active:bg-on-surface/12'
          "
          @dblclick="handlePlay(index)"
        >
          <!-- 序号 / 播放状态 -->
          <div
            v-if="showIndex"
            class="w-8 shrink-0 flex items-center justify-center relative"
            :class="playingId === item.id ? 'text-primary' : 'text-on-surface-variant'"
            @click.stop="playingId === item.id ? player.togglePlay() : emit('play', index)"
          >
            <span
              v-if="playingId !== item.id"
              class="text-sm font-bold tabular-nums group-hover:opacity-0 transition-opacity duration-300"
            >
              {{ index + 1 }}
            </span>
            <IconLucideMusic
              v-else
              class="size-5 group-hover:opacity-0 transition-opacity duration-300"
            />
            <div class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-[opacity,transform] duration-300 group-hover:scale-100 scale-80 cursor-pointer">
              <IconLucidePause v-if="playingId === item.id && status.isPlaying" class="size-5" />
              <IconLucidePlay v-else class="size-5" />
            </div>
          </div>

          <!-- 封面 + 标题 + 歌手（一体） -->
          <div class="flex-1 min-w-0 flex items-center gap-3">
            <SImg :src="item.cover" class="size-12 rounded-lg shrink-0" />
            <div class="flex-1 min-w-0">
              <div class="flex items-baseline gap-1.5 min-w-0">
                <span
                  class="text-base font-medium truncate"
                  :class="playingId === item.id ? 'text-primary' : ''"
                >
                  {{ item.title }}
                </span>
                <span
                  v-if="item.comment"
                  class="text-xs shrink-0 max-w-40 truncate"
                  :class="playingId === item.id ? 'text-primary/60' : 'text-on-surface-variant/60'"
                >
                  {{ item.comment }}
                </span>
              </div>
              <div
                class="text-sm truncate"
                :class="playingId === item.id ? 'text-primary/70' : 'text-on-surface-variant'"
              >
                <span
                  v-for="(artist, i) in item.artists"
                  :key="artist.id ?? i"
                  class="cursor-pointer transition-opacity hover:opacity-70"
                >
                  {{ artist.name }}
                  <span v-if="i < item.artists.length - 1" class="mx-0.5 opacity-50">/</span>
                </span>
                <span v-if="!item.artists?.length" class="opacity-50">
                  {{ t("playlist.unknownArtist") }}
                </span>
              </div>
            </div>
          </div>

          <!-- 专辑 -->
          <div
            v-if="showAlbum"
            class="flex-1 min-w-0 truncate text-sm cursor-pointer transition-opacity hover:opacity-70"
            :class="playingId === item.id ? 'text-primary/70' : 'text-on-surface'"
          >
            {{ item.album?.name }}
          </div>

          <!-- 时长 -->
          <div
            v-if="showDuration"
            class="w-16 shrink-0 text-center text-sm tabular-nums"
            :class="playingId === item.id ? 'text-primary/60' : 'text-on-surface-variant'"
          >
            {{ formatTime(item.duration) }}
          </div>

          <!-- 文件大小 -->
          <div
            v-if="showSize"
            class="w-16 shrink-0 text-center text-sm tabular-nums"
            :class="playingId === item.id ? 'text-primary/60' : 'text-on-surface-variant'"
          >
            {{ item.fileSize ? formatFileSize(item.fileSize) : "" }}
          </div>
        </div>
      </div>
    </template>
  </SVirtualList>
</template>
