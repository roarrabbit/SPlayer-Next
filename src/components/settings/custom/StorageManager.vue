<script setup lang="ts">
import localforage from "localforage";
import { usePlaylistStore } from "@/stores/playlist";
import { useSettingsStore } from "@/stores/settings";

defineOptions({ inheritAttrs: false });

const { t } = useI18n();

const confirmOpen = ref(false);
const confirmAction = ref<"resetSettings" | "resetAll">("resetSettings");

const confirmTitle = computed(() => t(`settings.${confirmAction.value}.label`));

const confirmContent = computed(() => t(`settings.${confirmAction.value}.confirm`));

const openConfirm = (action: "resetSettings" | "resetAll") => {
  confirmAction.value = action;
  confirmOpen.value = true;
};

const handleConfirm = async () => {
  confirmOpen.value = false;
  if (confirmAction.value === "resetSettings") {
    const settingsStore = useSettingsStore();
    settingsStore.$reset();
    await window.api.config.reset();
  } else {
    // 清空所有 IndexedDB 数据
    const stores = ["playlists", "queue", "library"];
    await Promise.all(
      stores.map((name) => localforage.createInstance({ name: "splayer", storeName: name }).clear()),
    );
    // 重置设置
    const settingsStore = useSettingsStore();
    settingsStore.$reset();
    await window.api.config.reset();
    // 刷新歌单列表
    const playlistStore = usePlaylistStore();
    await playlistStore.load();
  }
};
</script>

<template>
  <div class="flex gap-2">
    <SButton variant="secondary" size="small" @click="openConfirm('resetSettings')">
      {{ t("settings.resetSettings.label") }}
    </SButton>
    <SButton variant="secondary" size="small" type="error" @click="openConfirm('resetAll')">
      {{ t("settings.resetAll.label") }}
    </SButton>
  </div>
  <SDialog v-model:open="confirmOpen" :title="confirmTitle" width="400px">
    <p class="text-sm text-on-surface-variant">{{ confirmContent }}</p>
    <template #footer="{ close }">
      <SButton variant="secondary" @click="close">{{ t("common.cancel") }}</SButton>
      <SButton type="error" @click="handleConfirm">{{ t("common.confirm") }}</SButton>
    </template>
  </SDialog>
</template>
