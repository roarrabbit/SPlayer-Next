<script setup lang="ts">
import IconServer from "~icons/lucide/server";
import IconInfo from "~icons/lucide/info";
import IconChevronLeft from "~icons/lucide/chevron-left";

const { t } = useI18n();
const emit = defineEmits<{ (e: "next"): void; (e: "back"): void }>();

const SERVERS = [
  { key: "subsonic", color: "#7B1FA2" },
  { key: "navidrome", color: "#3F51B5" },
  { key: "jellyfin", color: "#00A4DC" },
  { key: "emby", color: "#52B54B" },
];
</script>

<template>
  <div class="flex flex-col max-w-2xl w-full mx-auto">
    <div class="flex items-center gap-3 mb-2">
      <IconServer class="size-6 text-primary" />
      <h2 class="text-2xl font-bold">{{ t("onboarding.streaming.title") }}</h2>
    </div>
    <p class="text-on-surface-variant/70 mb-6 leading-relaxed">
      {{ t("onboarding.streaming.subtitle") }}
    </p>

    <div class="grid grid-cols-2 gap-3 mb-4">
      <div
        v-for="s in SERVERS"
        :key="s.key"
        class="flex items-center gap-3 px-4 py-3 bg-on-surface/4 border border-solid border-primary/10 rounded-xl"
      >
        <div
          class="size-9 rounded-lg flex items-center justify-center text-white font-bold"
          :style="{ background: s.color }"
        >
          {{ t(`onboarding.streaming.servers.${s.key}`).charAt(0) }}
        </div>
        <div class="flex-1 min-w-0">
          <div class="text-sm font-medium">{{ t(`onboarding.streaming.servers.${s.key}`) }}</div>
        </div>
      </div>
    </div>

    <div
      class="flex items-start gap-3 px-4 py-3 bg-primary/8 border border-solid border-primary/20 rounded-xl mb-6"
    >
      <IconInfo class="size-4 text-primary shrink-0 mt-0.5" />
      <p class="text-sm text-on-surface-variant/80 leading-relaxed">
        {{ t("onboarding.streaming.hint") }}
      </p>
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
