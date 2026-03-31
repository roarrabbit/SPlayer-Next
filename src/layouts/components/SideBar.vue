<script setup lang="ts">
import type { SMenuItem } from "@/components/ui/SMenu.vue";
import IconLucideHome from "~icons/lucide/home";
import IconLucideMusic from "~icons/lucide/music";

const { t } = useI18n();
const router = useRouter();
const route = useRoute();

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
    <!-- Logo：高度与导航栏 h-14 对齐 -->
    <RouterLink
      to="/"
      class="flex items-center justify-center gap-2 h-16 shrink-0 no-underline cursor-pointer transition-transform hover:scale-105 active:scale-100"
    >
      <SLogo :size="30" />
      <span class="text-[22px] text-primary mt-0.5" style="font-family: 'logo'">SPlayer</span>
    </RouterLink>
    <div class="px-3 pb-3">
      <SMenu :items="menuItems" :model-value="activeKey" @select="onSelect" />
    </div>
  </div>
</template>
