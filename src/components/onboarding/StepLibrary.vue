<script setup lang="ts">
import { useLibraryStore } from "@/stores/library";
import { toast } from "@/composables/useToast";
import IconFolder from "~icons/lucide/folder";
import IconFolderPlus from "~icons/lucide/folder-plus";
import IconCheck from "~icons/lucide/check";
import IconX from "~icons/lucide/x";
import IconChevronLeft from "~icons/lucide/chevron-left";

const { t } = useI18n();
const libraryStore = useLibraryStore();
const { scanDirs } = storeToRefs(libraryStore);
const adding = ref(false);

const emit = defineEmits<{ (e: "next"): void; (e: "back"): void }>();

const handleAdd = async (): Promise<void> => {
  if (adding.value) return;
  adding.value = true;
  try {
    const res = await libraryStore.addScanDir();
    if (!res.success && res.error === "nested") {
      toast.warning(t("onboarding.library.nestedHint"));
    } else if (!res.success && res.error) {
      toast.error(res.error);
    }
  } finally {
    adding.value = false;
  }
};

const handleRemove = async (dir: string): Promise<void> => {
  await libraryStore.removeScanDir(dir);
};
</script>

<template>
  <div class="flex flex-col max-w-2xl w-full mx-auto">
    <div class="flex items-center gap-3 mb-2">
      <IconFolder class="size-6 text-primary" />
      <h2 class="text-2xl font-bold">{{ t("onboarding.library.title") }}</h2>
    </div>
    <p class="text-on-surface-variant/70 mb-6 leading-relaxed">
      {{ t("onboarding.library.subtitle") }}
    </p>

    <div class="bg-on-surface/4 border border-solid border-primary/10 rounded-xl p-4 mb-6">
      <div v-if="scanDirs.length > 0" class="flex flex-col gap-2 mb-3">
        <div
          v-for="dir in scanDirs"
          :key="dir"
          class="flex items-center gap-2 px-3 py-2 bg-on-surface/3 rounded-lg"
        >
          <IconCheck class="size-4 text-primary shrink-0" />
          <span class="flex-1 min-w-0 truncate text-sm">{{ dir }}</span>
          <SButton
            variant="ghost"
            size="small"
            circle
            :icon-size="14"
            @click="handleRemove(dir)"
          >
            <template #icon><IconX /></template>
          </SButton>
        </div>
      </div>
      <SButton
        type="primary"
        variant="secondary"
        block
        :loading="adding"
        @click="handleAdd"
      >
        <template #icon><IconFolderPlus /></template>
        {{ t("onboarding.library.add") }}
      </SButton>
    </div>

    <div class="flex items-center gap-3">
      <SButton variant="ghost" round @click="emit('back')">
        <template #icon><IconChevronLeft /></template>
        {{ t("onboarding.back") }}
      </SButton>
      <div class="flex-1" />
      <SButton variant="ghost" round @click="emit('next')">
        {{ t("onboarding.skip") }}
      </SButton>
      <SButton type="primary" round @click="emit('next')">
        {{ t("onboarding.next") }}
      </SButton>
    </div>
  </div>
</template>
