<script setup lang="ts">
import { useSettingsDialog } from "@/settings/useSettingsDialog";

const { t } = useI18n();
const { show: showSettings } = useSettingsDialog();
</script>

<template>
  <nav class="flex flex-col h-full p-3">
    <div class="text-lg font-bold px-2 py-3">SPlayer</div>
    <RouterLink
      to="/"
      class="px-3 py-2 rounded-lg text-sm text-on-surface-variant hover:bg-on-surface/8 transition-colors"
    >
      {{ t("nav.home") }}
    </RouterLink>

    <!-- 底部设置按钮 -->
    <button
      class="mt-auto flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-on-surface-variant hover:bg-on-surface/8 transition-colors"
      @click="showSettings()"
    >
      <IconLucideSettings class="size-4" />
      <span>{{ t("nav.settings") }}</span>
    </button>
  </nav>
</template>
