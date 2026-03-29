<script setup lang="ts">
import type { SettingSection } from "@/types/settings-schema";

const props = withDefaults(
  defineProps<{
    section: SettingSection;
    highlightKey?: string;
    /** 全局动画起始索引 */
    startIndex?: number;
  }>(),
  { startIndex: 0 },
);

const { t } = useI18n();

const visibleItems = computed(() => props.section.items);

const delay = (i: number) =>
  props.highlightKey ? "0s" : `${Math.min(props.startIndex + i, 15) * 0.03}s`;
</script>

<template>
  <div v-if="visibleItems.length > 0" class="mb-8 last:mb-0">
    <h3
      class="animate-slide-in-item [animation-fill-mode:backwards] [animation-delay:var(--delay)] flex items-center gap-2 text-lg font-semibold text-on-surface mb-3 px-1"
      :style="{ '--delay': delay(0) }"
    >
      <span class="w-0.75 h-4 rounded-full bg-primary" />
      {{ t(`settings.section.${section.id}`) }}
    </h3>
    <div class="flex flex-col gap-2.5">
      <SettingsItem
        v-for="(item, i) in visibleItems"
        :key="item.key"
        :item="item"
        :highlighted="item.key === highlightKey"
        class="animate-slide-in-item [animation-fill-mode:backwards] [animation-delay:var(--delay)]"
        :style="{ '--delay': delay(i + 1) }"
      />
    </div>
  </div>
</template>
