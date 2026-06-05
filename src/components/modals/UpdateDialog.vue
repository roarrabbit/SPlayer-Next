<script setup lang="ts">
import { marked } from "marked";
import { useUpdateStore } from "@/stores/update";
import { APP_VERSION } from "@/utils/config";
import { formatFileSize } from "@/utils/format";

const { t } = useI18n();
const update = useUpdateStore();

/** release notes 渲染为 HTML */
const notesHtml = computed(() =>
  update.meta?.releaseNotes
    ? (marked.parse(update.meta.releaseNotes, { async: false }) as string)
    : "",
);

/** 发布日期（本地化，空/非法则不显示） */
const releaseDateText = computed(() => {
  const raw = update.meta?.releaseDate;
  if (!raw) return "";
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString();
});
</script>

<template>
  <SDialog
    :open="update.dialogOpen"
    :title="t('update.dialogTitle')"
    width="520px"
    @update:open="update.dialogOpen = $event"
  >
    <div class="flex flex-col gap-4">
      <!-- 版本 + 元信息 -->
      <div v-if="update.meta" class="flex flex-col gap-2">
        <div class="flex items-center gap-2 text-sm">
          <span class="text-on-surface-variant/70">v{{ APP_VERSION }}</span>
          <IconLucideArrowRight class="text-on-surface-variant/50" />
          <span class="text-primary font-semibold tabular-nums">v{{ update.meta.version }}</span>
        </div>
        <div
          v-if="releaseDateText || update.meta.size > 0"
          class="flex items-center gap-4 text-xs text-on-surface-variant/60"
        >
          <span v-if="releaseDateText" class="flex items-center gap-1">
            <IconLucideCalendar class="size-3.5" />
            {{ releaseDateText }}
          </span>
          <span v-if="update.meta.size > 0" class="flex items-center gap-1">
            <IconLucideHardDrive class="size-3.5" />
            {{ formatFileSize(update.meta.size) }}
          </span>
        </div>
      </div>

      <!-- release notes -->
      <!-- eslint-disable vue/no-v-html -->
      <div
        v-if="notesHtml"
        class="markdown-body max-h-80 overflow-y-auto rounded-xl bg-on-surface/4 border border-solid border-primary/10 px-4 py-3"
        v-html="notesHtml"
      />
      <!-- eslint-enable vue/no-v-html -->
    </div>

    <template #footer="{ close }">
      <SButton
        v-if="!update.canInstall"
        type="primary"
        @click="
          update.openDownloadPage();
          close();
        "
      >
        {{ t("update.goDownload") }}
      </SButton>
      <SButton v-else-if="update.phase === 'downloaded'" type="primary" @click="update.install()">
        {{ t("update.installNow") }}
      </SButton>
      <SButton v-else-if="update.phase === 'downloading'" type="primary" disabled>
        {{ t("update.downloading") }} {{ update.percent }}%
      </SButton>
      <SButton v-else type="primary" @click="update.download()">
        {{ t("update.download") }}
      </SButton>
    </template>
  </SDialog>
</template>
