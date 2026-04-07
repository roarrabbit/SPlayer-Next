<script setup lang="ts">
import type { Collection, CollectionType } from "@/types/collection";
import type { TrackSource } from "@shared/types/player";
import { usePlaylistStore } from "@/stores/playlist";
import { formatTime } from "@/utils/time";
import * as player from "@/core/player";

const { t } = useI18n();
const route = useRoute();
const playlistStore = usePlaylistStore();

const source = computed(() => route.params.source as TrackSource);
const type = computed(() => route.params.type as CollectionType);
const id = computed(() => route.params.id as string);

const collection = ref<Collection | null>(null);

/** 根据路由参数加载数据 */
const loadCollection = async () => {
  if (source.value === "local" && type.value === "playlist") {
    collection.value = await playlistStore.get(id.value);
  }
  // TODO: online / album / radio
};

watch(() => route.params, loadCollection, { immediate: true });

const typeLabel = computed(() => {
  const map: Record<CollectionType, string> = {
    album: t("collection.album"),
    playlist: t("collection.playlist"),
    radio: t("collection.radio"),
  };
  return map[type.value] ?? "";
});

/** 总时长 */
const totalDuration = computed(() => {
  if (!collection.value) return "";
  const total = collection.value.tracks.reduce((sum, t) => sum + t.duration, 0);
  return total > 0 ? formatTime(total) : "";
});

/** 歌手文本 */
const artistText = computed(() => {
  if (!collection.value?.artists?.length) return collection.value?.creator ?? "";
  return collection.value.artists.map((a) => a.name).join(" / ");
});

const handlePlayAll = () => {
  if (!collection.value?.tracks.length) return;
  player.playFrom(collection.value.tracks, 0);
};

const searchQuery = ref("");
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- 头部信息 -->
    <div v-if="collection" class="shrink-0 px-5 pb-2">
      <div class="flex gap-5 mt-2 mb-4">
        <!-- 封面 -->
        <SImg
          :src="collection.cover"
          :alt="collection.title"
          class="size-40 rounded-xl shrink-0"
        />
        <!-- 信息 -->
        <div class="flex flex-col justify-end min-w-0 gap-1">
          <span class="text-xs text-on-surface-variant/50 uppercase tracking-wider">
            {{ typeLabel }}
          </span>
          <h1 class="text-3xl font-bold text-on-surface truncate">{{ collection.title }}</h1>
          <div v-if="artistText" class="text-sm text-on-surface-variant/70 truncate">
            {{ artistText }}
          </div>
          <div class="flex items-center gap-3 text-sm text-on-surface-variant/50 mt-1">
            <span>{{ t("collection.totalSongs", { count: collection.tracks.length }) }}</span>
            <span v-if="totalDuration">{{ t("collection.totalDuration", { time: totalDuration }) }}</span>
          </div>
          <p
            v-if="collection.description"
            class="text-xs text-on-surface-variant/50 mt-1 line-clamp-2"
          >
            {{ collection.description }}
          </p>
        </div>
      </div>
      <!-- 操作栏 -->
      <div class="flex items-center justify-between gap-4">
        <div class="flex items-center gap-3">
          <SButton
            type="primary"
            variant="secondary"
            round
            :disabled="collection.tracks.length === 0"
            @click="handlePlayAll"
          >
            <template #icon>
              <IconLucidePlay />
            </template>
            {{ t("collection.playAll") }}
          </SButton>
        </div>
        <SInput
          v-model="searchQuery"
          :placeholder="t('common.search')"
          clearable
          round
          class="w-40 focus-within:w-56"
        >
          <template #prefix>
            <IconLucideSearch class="size-4 text-on-surface-variant/40 shrink-0" />
          </template>
        </SInput>
      </div>
    </div>
    <!-- 歌曲列表 -->
    <div v-if="collection && collection.tracks.length > 0" class="flex-1 min-h-0">
      <SongList
        :items="collection.tracks"
        :search-query="searchQuery"
        :show-album="type !== 'album'"
      />
    </div>
    <!-- 空状态 -->
    <div v-else-if="collection" class="flex-1 flex items-center justify-center">
      <div class="text-center text-on-surface-variant/50">
        <IconLucideMusic class="size-12 mx-auto mb-3 opacity-30" />
        <div class="text-sm">{{ t("collection.empty") }}</div>
      </div>
    </div>
  </div>
</template>
