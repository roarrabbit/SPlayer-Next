<script setup lang="ts">
import type { SettingCategory } from "@/types/settings-schema";

defineProps<{
  categories: SettingCategory[];
  activeId: string;
}>();

const emit = defineEmits<{
  select: [id: string];
}>();

const { t } = useI18n();
</script>

<template>
  <nav class="flex flex-col gap-1">
    <button
      v-for="cat in categories"
      :key="cat.id"
      class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-lg transition-colors text-left"
      :class="
        activeId === cat.id
          ? 'bg-primary/12 text-primary font-medium'
          : 'text-on-surface-variant hover:bg-on-surface/5'
      "
      @click="emit('select', cat.id)"
    >
      <component :is="cat.icon" class="size-5 shrink-0" />
      <span>{{ t(`settings.group.${cat.id}`) }}</span>
    </button>
  </nav>
</template>
