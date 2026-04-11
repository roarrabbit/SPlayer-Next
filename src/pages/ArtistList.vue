<script setup lang="ts">
import type { CoverItem } from "@/types/artist";
import { useLibraryStore } from "@/stores/library";
import CoverList from "@/components/list/CoverList.vue";
import { navigateToArtist } from "@/utils/navigate";
import IconLucideUsers from "~icons/lucide/users";

const { t } = useI18n();
const libraryStore = useLibraryStore();
const { initialized } = storeToRefs(libraryStore);

const artists = computed<CoverItem[]>(() =>
  libraryStore
    .getArtistList()
    .map((item) => ({
      id: encodeURIComponent(item.name),
      title: item.name,
      cover: libraryStore.getArtistAvatar(item.name),
      subtitle: t("artist.totalSongs", { count: item.trackCount }),
      trackCount: item.trackCount,
    }))
    .sort((a, b) => a.title.localeCompare(b.title)),
);

onMounted(async () => {
  if (!initialized.value) await libraryStore.load();
});
</script>

<template>
  <div class="flex flex-col h-full">
    <div class="shrink-0 px-5 pb-2">
      <div class="flex items-baseline gap-4 mt-2 mb-4">
        <h1 class="text-3xl font-bold text-on-surface">{{ t("artist.label") }}</h1>
        <span v-if="artists.length > 0" class="flex items-center gap-1 text-sm text-on-surface-variant/50">
          <IconLucideUsers class="size-3.5" />
          {{ t("artist.totalArtists", { count: artists.length }) }}
        </span>
      </div>
    </div>
    <div class="flex-1 min-h-0 overflow-y-auto px-5 pb-6">
      <CoverList
        v-if="artists.length > 0"
        :items="artists"
        type="artist"
        :min-size="120"
        :gap="14"
        @click="(item) => navigateToArtist(item.title)"
      />
      <div
        v-else
        class="h-full min-h-[240px] flex items-center justify-center text-on-surface-variant/50"
      >
        {{ t("common.noData") }}
      </div>
    </div>
  </div>
</template>
