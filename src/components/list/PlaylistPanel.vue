<script setup lang="ts">
import type { Track } from "@shared/types/player";
import { useStatusStore } from "@/stores/status";
import { useMediaStore } from "@/stores/media";
import { queue, queueLength } from "@/stores/queue";
import { useDragSort, type VirtualListExposed } from "@/composables/useDragSort";
import * as player from "@/core/player";

const { t } = useI18n();
const statusStore = useStatusStore();
const mediaStore = useMediaStore();

/** 拼接艺术家名称 */
const formatArtists = (artists: Track["artists"]): string => {
  if (!artists?.length) return t("playlist.unknownArtist");
  return artists.map((ar) => ar.name).join(" / ");
};

/** 播放指定索引的歌曲 */
const playAtIndex = async (index: number): Promise<void> => {
  if (index === statusStore.playIndex) return;
  statusStore.playIndex = index;
  const track = statusStore.currentTrack;
  if (track?.path) await player.load(track.path);
};

const clearConfirmOpen = ref(false);

/** 清空播放列表 */
const handleClear = (): void => {
  if (queueLength.value === 0) return;
  player.stop();
  statusStore.playIndex = -1;
  queue.value = [];
  mediaStore.clear();
  clearConfirmOpen.value = false;
};

const listRef = ref<VirtualListExposed | null>(null);

/** 定位到当前播放歌曲 */
const scrollToCurrent = (): void => {
  if (statusStore.playIndex >= 0) {
    listRef.value?.scrollToIndex(statusStore.playIndex, "smooth");
  }
};

const {
  isDragging,
  draggedIndex,
  dropIndicator,
  dragLabelData,
  dragLabelPosition,
  handlePointerDown,
} = useDragSort({
  virtualListRef: listRef,
  itemCount: queueLength,
  onReorder: (from, to) => player.moveInQueue(from, to),
  triggerMode: "longpress",
});
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- 播放列表 -->
    <div
      v-if="queueLength > 0"
      class="flex-1 min-h-0"
      :class="{ 'cursor-grabbing select-none': isDragging }"
    >
      <SVirtualList
        ref="listRef"
        :items="queue"
        :item-height="56"
        item-fixed
        height="100%"
        :default-scroll-index="Math.max(0, statusStore.playIndex)"
        :get-item-key="(item: Track) => item.id"
      >
        <template #default="{ item, index }: { item: Track; index: number }">
          <div class="relative">
            <!-- 放置指示线 -->
            <div
              v-if="isDragging && dropIndicator.index === index"
              class="absolute left-3 right-3 h-0.5 bg-primary rounded-full z-10 pointer-events-none"
              :class="dropIndicator.position === 'top' ? '-top-px' : '-bottom-px'"
            />
            <div
              class="group flex items-center gap-3 px-4 h-14 cursor-pointer transition-[background-color,opacity] duration-200"
              :class="[
                index === statusStore.playIndex
                  ? 'bg-primary/12 text-primary active:bg-primary/20'
                  : 'hover:bg-primary/6 active:bg-primary/12',
                isDragging && draggedIndex === index ? 'opacity-30' : 'opacity-100',
              ]"
              @click="playAtIndex(index)"
              @mousedown="handlePointerDown($event, index, item.title)"
              @touchstart.passive="handlePointerDown($event, index, item.title)"
            >
              <!-- 封面 -->
              <SImg v-if="item.cover" :src="item.cover" class="size-9 rounded-md shrink-0" />
              <div
                v-else
                class="size-9 rounded-md shrink-0 bg-primary/8 flex items-center justify-center"
              >
                <IconLucideMusic class="size-4 text-on-surface-variant" />
              </div>
              <!-- 歌曲信息 -->
              <div class="flex-1 min-w-0">
                <div class="text-sm truncate">{{ item.title }}</div>
                <div class="text-xs text-on-surface-variant truncate">
                  {{ formatArtists(item.artists) }}
                </div>
              </div>
              <!-- 移除按钮 -->
              <SButton
                variant="ghost"
                circle
                size="tiny"
                class="opacity-0 group-hover:opacity-100"
                @click.stop="player.removeFromQueue(index)"
              >
                <template #icon>
                  <IconLucideX />
                </template>
              </SButton>
            </div>
          </div>
        </template>
      </SVirtualList>
    </div>
    <!-- 空状态 -->
    <div v-else class="flex-1 flex items-center justify-center">
      <div class="text-center text-on-surface-variant/50">
        <IconLucideListMusic class="size-10 mx-auto mb-2 opacity-40" />
        <div class="text-sm">{{ t("playlist.empty") }}</div>
      </div>
    </div>
    <!-- 底部操作 -->
    <div class="shrink-0 px-3 py-3 flex gap-3">
      <SDialog v-model:open="clearConfirmOpen" :title="t('playlist.clearConfirmTitle')">
        {{ t("playlist.clearConfirmContent") }}
        <template #footer="{ close }">
          <SButton variant="secondary" @click="close">{{ t("common.cancel") }}</SButton>
          <SButton variant="secondary" type="error" @click="handleClear">{{
            t("common.confirm")
          }}</SButton>
        </template>
      </SDialog>
      <SButton
        variant="secondary"
        size="small"
        block
        :disabled="queueLength === 0"
        @click="clearConfirmOpen = true"
      >
        <template #icon>
          <IconLucideTrash2 />
        </template>
        {{ t("playlist.clearList") }}
      </SButton>
      <SButton
        variant="secondary"
        size="small"
        block
        :disabled="queueLength === 0"
        @click="scrollToCurrent"
      >
        <template #icon>
          <IconLucideLocate />
        </template>
        {{ t("playlist.locateCurrent") }}
      </SButton>
    </div>
    <!-- 拖拽标签 -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition-opacity duration-150"
        enter-from-class="opacity-0"
        leave-active-class="transition-opacity duration-200"
        leave-to-class="opacity-0"
      >
        <div
          v-if="isDragging && dragLabelData"
          class="fixed z-9999 pointer-events-none max-w-60 truncate px-4 py-2 rounded-full text-sm font-medium bg-surface-bright text-on-surface shadow-lg"
          :style="{
            top: `${dragLabelPosition.top + 12}px`,
            left: `${dragLabelPosition.left + 12}px`,
          }"
        >
          {{ dragLabelData.name }}
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
