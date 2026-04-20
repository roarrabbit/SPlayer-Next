<script setup lang="ts">
import { useSettingsDialog } from "@/settings/useSettingsDialog";
import { useThemeStore } from "@/stores/theme";
import { useWindowControls } from "@/composables/useWindowControls";
import type { DropdownMenuItem } from "@/components/ui/SDropdownMenu.vue";
import IconSun from "~icons/lucide/sun";
import IconMoon from "~icons/lucide/moon";
import IconMonitor from "~icons/lucide/monitor";
import IconRefreshCw from "~icons/lucide/refresh-cw";
import IconTerminal from "~icons/lucide/terminal";
import IconSettings from "~icons/lucide/settings";
import IconMinus from "~icons/lucide/minus";
import IconSquare from "~icons/lucide/square";
import IconCopy from "~icons/lucide/copy";
import IconX from "~icons/lucide/x";

const router = useRouter();
const { t } = useI18n();
const { show: showSettings } = useSettingsDialog();
const theme = useThemeStore();

const { isMaximized, minimize, toggleMaximize, close } = useWindowControls();

const themeIcon = computed(() => {
  if (theme.mode === "light") return IconMoon;
  if (theme.mode === "dark") return IconMonitor;
  return IconSun;
});

const themeLabel = computed(() => {
  if (theme.mode === "light") return t("settings.themeMode.dark");
  if (theme.mode === "dark") return t("settings.themeMode.system");
  return t("settings.themeMode.light");
});

const menuItems = computed<DropdownMenuItem[]>(() => [
  { key: "theme", label: themeLabel.value, icon: themeIcon.value },
  { key: "reload", label: t("nav.reload"), icon: IconRefreshCw, separator: true },
  { key: "devtools", label: t("nav.devtools"), icon: IconTerminal },
  { key: "settings", label: t("nav.globalSettings"), icon: IconSettings },
]);

const onMenuSelect = (key: string): void => {
  if (key === "theme") theme.cycleMode();
  else if (key === "reload") location.reload();
  else if (key === "devtools") window.api.system.toggleDevTools();
  else if (key === "settings") showSettings();
};
</script>

<template>
  <div class="flex items-center flex-1 h-full app-drag-region">
    <!-- 左侧：容器可拖；按钮本身不可拖（间距、按钮外侧均落入拖拽区） -->
    <div class="flex items-center gap-3 shrink-0">
      <SButton
        class="app-no-drag"
        variant="tertiary"
        circle
        :size="40"
        :icon-size="20"
        @click="router.back()"
      >
        <template #icon><IconLucideChevronLeft /></template>
      </SButton>
      <SButton
        class="app-no-drag"
        variant="tertiary"
        circle
        :size="40"
        :icon-size="20"
        @click="router.forward()"
      >
        <template #icon><IconLucideChevronRight /></template>
      </SButton>
    </div>
    <!-- 中间 -->
    <div class="flex-1 h-full" />
    <!-- 右侧：容器可拖；按钮本身不可拖 -->
    <div class="flex items-center gap-3 shrink-0">
      <SDropdownMenu :items="menuItems" @select="onMenuSelect">
        <template #trigger>
          <SButton class="app-no-drag" variant="tertiary" circle :size="40">
            <template #icon><IconLucideSettings /></template>
          </SButton>
        </template>
      </SDropdownMenu>
      <SDivider vertical />
      <SButton
        class="app-no-drag"
        variant="tertiary"
        circle
        :size="40"
        :icon-size="16"
        @click="minimize"
      >
        <template #icon><IconMinus /></template>
      </SButton>
      <SButton
        class="app-no-drag"
        variant="tertiary"
        circle
        :size="40"
        :icon-size="16"
        @click="toggleMaximize"
      >
        <template #icon>
          <component :is="isMaximized ? IconCopy : IconSquare" />
        </template>
      </SButton>
      <SButton class="app-no-drag" variant="tertiary" circle :size="40" @click="close">
        <template #icon><IconX /></template>
      </SButton>
    </div>
  </div>
</template>
