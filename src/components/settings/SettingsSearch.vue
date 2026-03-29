<script setup lang="ts">
import { settingsSchema } from "@/settings/schema";

const emit = defineEmits<{
  select: [categoryId: string, itemKey: string];
}>();

const { t } = useI18n();
const query = ref("");
const isActive = ref(false);

interface SearchResult {
  categoryId: string;
  itemKey: string;
  label: string;
  description: string;
  categoryLabel: string;
}

const results = computed<SearchResult[]>(() => {
  const q = query.value.trim().toLowerCase();
  if (!q) return [];
  const out: SearchResult[] = [];
  for (const cat of settingsSchema) {
    for (const sec of cat.sections) {
      for (const item of sec.items) {
        const label = t(`settings.${item.key}.label`);
        const desc = t(`settings.${item.key}.description`);
        const kw = item.keywords?.map((k) => t(k)).join(" ") ?? "";
        if (`${label} ${desc} ${kw}`.toLowerCase().includes(q)) {
          out.push({
            categoryId: cat.id,
            itemKey: item.key,
            label,
            description: desc,
            categoryLabel: t(`settings.group.${cat.id}`),
          });
        }
      }
    }
  }
  return out;
});

const handleSelect = (r: SearchResult) => {
  emit("select", r.categoryId, r.itemKey);
  query.value = "";
  isActive.value = false;
};

const handleBlur = () => {
  setTimeout(() => (isActive.value = false), 150);
};
</script>

<template>
  <div class="relative">
    <div class="flex items-center gap-2 h-8 px-3 rounded-lg bg-on-surface/5 transition-colors">
      <IconLucideSearch class="size-3.5 text-on-surface-variant/50 shrink-0" />
      <input
        v-model="query"
        :placeholder="t('settings.search')"
        class="flex-1 bg-transparent text-sm text-on-surface outline-none placeholder:text-on-surface-variant/40"
        @focus="isActive = true"
        @blur="handleBlur"
      />
    </div>

    <Transition name="fade">
      <div
        v-if="isActive && results.length > 0"
        class="absolute top-full left-0 right-0 mt-1 max-h-64 overflow-y-auto rounded-xl bg-surface-panel shadow-lg z-10"
      >
        <div class="p-1">
          <button
            v-for="r in results"
            :key="`${r.categoryId}-${r.itemKey}`"
            class="w-full text-left px-3 py-2 rounded-lg hover:bg-on-surface/5 transition-colors"
            @mousedown.prevent="handleSelect(r)"
          >
            <div class="text-sm">{{ r.label }}</div>
            <div class="text-xs text-on-surface-variant/60 flex items-center gap-1">
              <span>{{ r.categoryLabel }}</span>
              <span class="opacity-40">·</span>
              <span class="truncate">{{ r.description }}</span>
            </div>
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>
