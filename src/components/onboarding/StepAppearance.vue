<script setup lang="ts">
import { useThemeStore } from "@/stores/theme";
import type { ThemeMode, ThemeSource } from "@/types/theme";
import { DEFAULT_PRIMARY } from "@/utils/color";
import IconPalette from "~icons/lucide/palette";
import IconSun from "~icons/lucide/sun";
import IconMoon from "~icons/lucide/moon";
import IconMonitor from "~icons/lucide/monitor";
import IconChevronLeft from "~icons/lucide/chevron-left";

const { t } = useI18n();
const emit = defineEmits<{ (e: "next"): void; (e: "back"): void }>();
const theme = useThemeStore();
const { mode, source, customColor } = storeToRefs(theme);

const MODES: { value: ThemeMode; icon: typeof IconSun }[] = [
  { value: "light", icon: IconSun },
  { value: "dark", icon: IconMoon },
  { value: "system", icon: IconMonitor },
];

const PRESET_COLORS = [
  DEFAULT_PRIMARY,
  "#FF6B6B",
  "#FFA94D",
  "#FFD43B",
  "#51CF66",
  "#22B8CF",
  "#5C7CFA",
  "#CC5DE8",
];

const setMode = (value: ThemeMode): void => {
  mode.value = value;
};

const setColor = (hex: string): void => {
  theme.setCustomColor(hex);
};

const setSource = (value: ThemeSource): void => {
  theme.setSource(value);
};
</script>

<template>
  <div class="flex flex-col max-w-2xl w-full mx-auto">
    <div class="flex items-center gap-3 mb-2">
      <IconPalette class="size-6 text-primary" />
      <h2 class="text-2xl font-bold">{{ t("onboarding.appearance.title") }}</h2>
    </div>
    <p class="text-on-surface-variant/70 mb-6 leading-relaxed">
      {{ t("onboarding.appearance.subtitle") }}
    </p>

    <div class="bg-on-surface/4 border border-solid border-primary/10 rounded-xl p-5 mb-4">
      <div class="text-sm font-medium mb-3">{{ t("onboarding.appearance.modeLabel") }}</div>
      <div class="grid grid-cols-3 gap-2">
        <button
          v-for="m in MODES"
          :key="m.value"
          class="flex flex-col items-center gap-2 py-4 rounded-xl border border-solid transition-all"
          :class="
            mode === m.value
              ? 'bg-primary/10 border-primary text-primary'
              : 'bg-on-surface/3 border-primary/10 hover:bg-on-surface/6'
          "
          @click="setMode(m.value)"
        >
          <component :is="m.icon" class="size-5" />
          <span class="text-sm">{{ t(`onboarding.appearance.mode.${m.value}`) }}</span>
        </button>
      </div>
    </div>

    <div class="bg-on-surface/4 border border-solid border-primary/10 rounded-xl p-5 mb-6">
      <div class="text-sm font-medium mb-3">{{ t("onboarding.appearance.colorLabel") }}</div>
      <div class="flex flex-wrap gap-2 mb-3">
        <button
          v-for="hex in PRESET_COLORS"
          :key="hex"
          class="size-9 rounded-full border-2 border-solid transition-all"
          :class="
            source === 'custom' && customColor.toLowerCase() === hex.toLowerCase()
              ? 'border-on-surface scale-110'
              : 'border-transparent hover:scale-105'
          "
          :style="{ background: hex }"
          @click="setColor(hex)"
        />
      </div>
      <div class="flex items-center gap-2">
        <button
          class="text-xs px-3 py-1.5 rounded-full border border-solid transition-colors"
          :class="
            source === 'cover'
              ? 'bg-primary/10 border-primary text-primary'
              : 'bg-on-surface/3 border-primary/10 hover:bg-on-surface/6'
          "
          @click="setSource('cover')"
        >
          {{ t("onboarding.appearance.followCover") }}
        </button>
        <button
          class="text-xs px-3 py-1.5 rounded-full border border-solid transition-colors"
          :class="
            source === 'default'
              ? 'bg-primary/10 border-primary text-primary'
              : 'bg-on-surface/3 border-primary/10 hover:bg-on-surface/6'
          "
          @click="setSource('default')"
        >
          {{ t("onboarding.appearance.useDefault") }}
        </button>
      </div>
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
