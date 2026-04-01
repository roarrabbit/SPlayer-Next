<script setup lang="ts">
import { useLibraryStore } from "@/stores/library";
import * as player from "@/core/player";

const { t } = useI18n();
const libraryStore = useLibraryStore();
const { tracks, scanDirs, scanning, scanProgress, initialized } = storeToRefs(libraryStore);

// 截取目录名
const folderName = (dir: string): string => {
  const parts = dir.replace(/\\/g, "/").split("/").filter(Boolean);
  return parts[parts.length - 1] || dir;
};

// 进入页面时初始化
onMounted(async () => {
  libraryStore.subscribeScanProgress();
  if (!initialized.value) {
    await libraryStore.load();
  }
  // 有目录且有曲目时自动增量扫描
  if (scanDirs.value.length > 0 && tracks.value.length > 0) {
    libraryStore.startScan(true);
  }
});

onUnmounted(() => {
  libraryStore.unsubscribeScanProgress();
});

// 添加文件夹
const handleAddFolder = async (): Promise<void> => {
  const res = await libraryStore.addScanDir();
  if (res.success) {
    // 新增目录后立即扫描
    libraryStore.startScan(false);
  }
};

// 移除文件夹确认
const removingDir = ref<string | null>(null);
const removeConfirmOpen = computed({
  get: () => removingDir.value !== null,
  set: (val: boolean) => { if (!val) removingDir.value = null; },
});
const handleRemoveFolder = async (): Promise<void> => {
  if (!removingDir.value) return;
  await libraryStore.removeScanDir(removingDir.value);
  removingDir.value = null;
};

// 全量扫描
const handleFullScan = (): void => {
  libraryStore.startScan(false);
};

// 播放全部
const handlePlayAll = (): void => {
  if (tracks.value.length === 0) return;
  player.playFrom(tracks.value, 0);
};

// 扫描进度百分比
const scanPercent = computed(() => {
  if (!scanProgress.value || scanProgress.value.total === 0) return 0;
  return Math.round((scanProgress.value.scanned / scanProgress.value.total) * 100);
});

// 目录管理弹窗
const folderDialogOpen = ref(false);
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- 顶栏 -->
    <div class="shrink-0 px-6 pt-4 pb-3">
      <div class="flex items-center justify-between mb-3">
        <h1 class="text-xl font-semibold text-on-surface">{{ t("library.title") }}</h1>
        <div class="flex items-center gap-2">
          <span v-if="tracks.length > 0" class="text-sm text-on-surface-variant mr-2">
            {{ t("library.totalSongs", { count: tracks.length }) }}
          </span>
          <!-- 文件夹管理 -->
          <SButton variant="secondary" size="small" @click="folderDialogOpen = true">
            <template #icon><IconLucideFolderOpen /></template>
            {{ t("library.folders") }}
          </SButton>
          <!-- 全量扫描 -->
          <SButton
            variant="secondary"
            size="small"
            :disabled="scanning || scanDirs.length === 0"
            @click="handleFullScan"
          >
            <template #icon><IconLucideRefreshCw :class="{ 'animate-spin': scanning }" /></template>
            {{ scanning ? t("library.scanning") : t("library.scanAll") }}
          </SButton>
          <!-- 播放全部 -->
          <SButton
            type="primary"
            variant="secondary"
            size="small"
            :disabled="tracks.length === 0"
            @click="handlePlayAll"
          >
            <template #icon><IconLucidePlay /></template>
            {{ t("library.playAll") }}
          </SButton>
        </div>
      </div>

      <!-- 扫描进度条 -->
      <Transition
        enter-active-class="transition-all duration-300"
        enter-from-class="opacity-0 -translate-y-2"
        leave-active-class="transition-all duration-200"
        leave-to-class="opacity-0 -translate-y-2"
      >
        <div
          v-if="scanning && scanProgress"
          class="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-primary/8"
        >
          <SLoading class="size-4 text-primary shrink-0" />
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between mb-1">
              <span class="text-xs text-on-surface-variant">
                {{ t("library.scanProgress", { scanned: scanProgress.scanned, total: scanProgress.total }) }}
              </span>
              <span class="text-xs text-on-surface-variant tabular-nums">{{ scanPercent }}%</span>
            </div>
            <div class="h-1 rounded-full bg-on-surface/10 overflow-hidden">
              <div
                class="h-full rounded-full bg-primary transition-[width] duration-300"
                :style="{ width: `${scanPercent}%` }"
              />
            </div>
            <div v-if="scanProgress.current" class="text-xs text-on-surface-variant/60 mt-1 truncate">
              {{ scanProgress.current }}
            </div>
          </div>
          <SButton variant="ghost" size="tiny" @click="libraryStore.cancelScan()">
            <template #icon><IconLucideX /></template>
          </SButton>
        </div>
      </Transition>
    </div>

    <!-- 曲目列表 -->
    <div v-if="tracks.length > 0" class="flex-1 min-h-0">
      <SongList :items="tracks" show-size />
    </div>

    <!-- 空状态：无目录或无歌曲 -->
    <div v-else class="flex-1 flex items-center justify-center">
      <div class="text-center text-on-surface-variant/50">
        <IconLucideMusic class="size-12 mx-auto mb-3 opacity-30" />
        <div class="text-sm mb-1">{{ t("library.empty") }}</div>
        <div class="text-xs mb-4 opacity-70">{{ t("library.emptyHint") }}</div>
        <SButton type="primary" variant="secondary" @click="handleAddFolder">
          <template #icon><IconLucideFolderPlus /></template>
          {{ t("library.addFolder") }}
        </SButton>
      </div>
    </div>

    <!-- 文件夹管理弹窗 -->
    <SDialog v-model:open="folderDialogOpen" :title="t('library.folders')" width="480px">
      <div class="space-y-2">
        <!-- 目录列表 -->
        <div
          v-for="dir in scanDirs"
          :key="dir"
          class="flex items-center gap-3 px-3 py-2 rounded-lg bg-on-surface/4"
        >
          <IconLucideFolder class="size-4 text-on-surface-variant shrink-0" />
          <div class="flex-1 min-w-0">
            <div class="text-sm truncate text-on-surface">{{ folderName(dir) }}</div>
            <div class="text-xs truncate text-on-surface-variant/60">{{ dir }}</div>
          </div>
          <SButton
            variant="ghost"
            size="tiny"
            type="error"
            @click="removingDir = dir"
          >
            <template #icon><IconLucideTrash2 /></template>
          </SButton>
        </div>
        <!-- 空 -->
        <div v-if="scanDirs.length === 0" class="py-6 text-center text-on-surface-variant/50 text-sm">
          {{ t("library.emptyHint") }}
        </div>
      </div>
      <template #footer>
        <SButton variant="secondary" @click="handleAddFolder">
          <template #icon><IconLucideFolderPlus /></template>
          {{ t("library.addFolder") }}
        </SButton>
      </template>
    </SDialog>

    <!-- 移除确认弹窗 -->
    <SDialog v-model:open="removeConfirmOpen" :title="t('library.removeFolder')">
      <template #default>
        <p class="text-sm text-on-surface-variant">{{ t("library.removeFolderConfirm") }}</p>
        <p class="text-xs text-on-surface-variant/60 mt-2 break-all">{{ removingDir }}</p>
      </template>
      <template #footer="{ close }">
        <SButton variant="secondary" @click="close">{{ t("common.cancel") }}</SButton>
        <SButton type="error" variant="secondary" @click="handleRemoveFolder">{{ t("common.confirm") }}</SButton>
      </template>
    </SDialog>
  </div>
</template>
