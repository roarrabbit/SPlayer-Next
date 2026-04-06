<script setup lang="ts">
import type { SMenuItem } from "@/components/ui/SMenu.vue";
import { useSettingsStore } from "@/stores/settings";
import IconLucideHome from "~icons/lucide/home";
import IconLucideMusic from "~icons/lucide/music";

const { t } = useI18n();
const router = useRouter();
const route = useRoute();
const { appearance } = useSettingsStore();

const menuItems = computed<SMenuItem[]>(() => [
  { key: "/", label: t("nav.home"), icon: markRaw(IconLucideHome) },
  { key: "/library", label: t("nav.library"), icon: markRaw(IconLucideMusic) },
]);

const activeKey = computed(() => {
  return menuItems.value.find((item) => route.path === item.key || route.path.startsWith(item.key + "/"))?.key ?? "/";
});

const onSelect = (key: string) => {
  router.push(key);
};
</script>

<template>
  <div class="flex flex-col h-full">
    <SideBarLogo :collapsed="appearance.sidebarCollapsed" />
    <div class="pb-3 transition-[padding] duration-300" :class="appearance.sidebarCollapsed ? 'px-2' : 'px-3'">
      <SMenu :items="menuItems" :model-value="activeKey" :collapsed="appearance.sidebarCollapsed" @select="onSelect" />
    </div>
  </div>
</template>
