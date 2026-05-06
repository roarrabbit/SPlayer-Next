<script setup lang="ts">
import { useSettingsStore } from "@/stores/settings";
import { useSystemFonts } from "@/composables/useSystemFonts";
import IconLucideRotateCcw from "~icons/lucide/rotate-ccw";

defineOptions({ inheritAttrs: false });

const { t } = useI18n();
const settings = useSettingsStore();
const { families: fonts, loading: loadingFonts, ensureLoaded } = useSystemFonts();

const DEFAULT_OPTION_VALUE = "__default_font__";

type FontDraftKey = "global" | "lyric" | "desktopLyric" | "dynamicIsland" | "taskbarLyric";
type FontGroup = "general" | "appLyric" | "externalLyric";
type FontMode = "select" | "custom";

interface FontDraft {
  global: string;
  lyric: string;
  desktopLyric: string;
  dynamicIsland: string;
  taskbarLyric: string;
}

interface FontTarget {
  key: FontDraftKey;
  label: string;
  description: string;
  defaultLabel: string;
}

interface FontOption {
  value: string;
  label: string;
}

const open = ref(false);
const mode = ref<FontMode>("select");

const draft = reactive<FontDraft>({
  global: "",
  lyric: "",
  desktopLyric: "",
  dynamicIsland: "",
  taskbarLyric: "",
});

/** 字段定义 */
const TARGET_DEFS: Array<{ key: FontDraftKey; group: FontGroup }> = [
  { key: "global", group: "general" },
  { key: "lyric", group: "appLyric" },
  { key: "desktopLyric", group: "externalLyric" },
  { key: "dynamicIsland", group: "externalLyric" },
  { key: "taskbarLyric", group: "externalLyric" },
];

const GROUP_ORDER: FontGroup[] = ["general", "appLyric", "externalLyric"];

/** 分组目标 */
const groupedTargets = computed<Array<{ group: FontGroup; items: FontTarget[] }>>(() => {
  const buildTarget = (key: FontDraftKey): FontTarget => {
    const name = t(`settings.fontConfig.fields.${key}`);
    return {
      key,
      label: t("settings.fontConfig.fieldLabel", { name }),
      description: t("settings.fontConfig.fieldDescription", { name }),
      defaultLabel:
        key === "lyric" ? t("settings.fontConfig.useGlobal") : t("settings.fontConfig.useSystem"),
    };
  };
  return GROUP_ORDER.map((group) => ({
    group,
    items: TARGET_DEFS.filter((d) => d.group === group).map((d) => buildTarget(d.key)),
  })).filter((g) => g.items.length > 0);
});

/** 设置方式选项 */
const modeOptions = computed<FontOption[]>(() => [
  { value: "select", label: t("settings.fontConfig.modeSelect") },
  { value: "custom", label: t("settings.fontConfig.modeCustom") },
]);

/** 系统字体下拉项 */
const fontOptions = computed<FontOption[]>(() =>
  fonts.value.map((font) => ({ value: font, label: font })),
);

/** 各字段的下拉选项 */
const optionsByKey = computed<Record<FontDraftKey, FontOption[]>>(() => {
  const base = fontOptions.value;
  const map = {} as Record<FontDraftKey, FontOption[]>;
  for (const g of groupedTargets.value) {
    for (const target of g.items) {
      map[target.key] = [{ value: DEFAULT_OPTION_VALUE, label: target.defaultLabel }, ...base];
    }
  }
  return map;
});

/** 获取选择值 */
const getSelectValue = (value: string): string =>
  !value || !fonts.value.includes(value) ? DEFAULT_OPTION_VALUE : value;

/** 同步字体配置 */
const syncDraft = (): void => {
  draft.global = settings.appearance.fontFamily;
  draft.lyric = settings.lyric.fontFamily;
  draft.desktopLyric = settings.system.desktopLyric.fontFamily;
  draft.dynamicIsland = settings.system.dynamicIsland.fontFamily;
  draft.taskbarLyric = settings.system.taskbarLyric.fontFamily;
};

/** 打开字体配置 */
watch(open, (value) => {
  if (!value) return;
  syncDraft();
  ensureLoaded();
});

/** 选择字体 */
const handleSelect = (key: FontDraftKey, value: string | number | boolean): void => {
  draft[key] = value === DEFAULT_OPTION_VALUE ? "" : String(value);
};

/** 手动输入字体 */
const handleManualInput = (key: FontDraftKey, value: string): void => {
  draft[key] = value.trim();
};

/** 重置字段 */
const handleResetField = (key: FontDraftKey): void => {
  draft[key] = "";
};

/** 更新设置方式 */
const updateMode = (value: string | number | boolean): void => {
  mode.value = value === "custom" ? "custom" : "select";
};

/** 保存字体配置 */
const handleSave = async (): Promise<void> => {
  settings.appearance.fontFamily = draft.global;
  settings.lyric.fontFamily = draft.lyric;
  await Promise.all([
    settings.setSystem("desktopLyric.fontFamily", draft.desktopLyric),
    settings.setSystem("dynamicIsland.fontFamily", draft.dynamicIsland),
    settings.setSystem("taskbarLyric.fontFamily", draft.taskbarLyric),
  ]);
  open.value = false;
};
</script>

<template>
  <SButton type="primary" variant="secondary" size="small" @click="open = true">
    {{ t("settings.fontConfig.button") }}
  </SButton>
  <SDialog
    v-model:open="open"
    :title="t('settings.fontConfig.title')"
    :description="t('settings.fontConfig.description')"
    width="620px"
  >
    <div class="flex flex-col gap-3">
      <!-- 设置方式 -->
      <div
        class="flex items-center gap-3 rounded-xl bg-surface-panel border border-solid border-outline-variant/15 px-4 py-3.5"
      >
        <div class="min-w-0 flex-1">
          <div class="text-base">{{ t("settings.fontConfig.modeLabel") }}</div>
          <div class="text-sm text-on-surface-variant/70 mt-0.5">
            {{ t("settings.fontConfig.modeHint") }}
          </div>
        </div>
        <div class="shrink-0 w-60">
          <SSelect :model-value="mode" :options="modeOptions" @update:model-value="updateMode" />
        </div>
      </div>

      <!-- 各分组 -->
      <div v-for="g in groupedTargets" :key="g.group" class="flex flex-col gap-2.5">
        <h4 class="flex items-center gap-2 text-base text-on-surface px-1">
          <span class="w-1 h-4 rounded-full bg-primary" />
          {{ t(`settings.fontConfig.groups.${g.group}`) }}
        </h4>
        <div
          v-for="target in g.items"
          :key="target.key"
          class="rounded-xl bg-surface-panel border border-solid border-outline-variant/15 px-4 py-3.5"
        >
          <div class="flex items-center gap-3">
            <div class="min-w-0 flex-1">
              <div class="text-base">{{ target.label }}</div>
              <div class="text-sm text-on-surface-variant/70 mt-0.5">
                {{ target.description }}
              </div>
            </div>
            <div class="shrink-0 w-50 flex justify-end">
              <SSelect
                v-if="mode === 'select'"
                class="w-full"
                :model-value="getSelectValue(draft[target.key])"
                :options="optionsByKey[target.key]"
                :disabled="loadingFonts"
                :placeholder="loadingFonts ? t('settings.fontConfig.loading') : target.defaultLabel"
                @update:model-value="handleSelect(target.key, $event)"
              />
              <SInput
                v-else
                class="w-full"
                :model-value="draft[target.key]"
                :placeholder="t('settings.fontConfig.placeholder')"
                clearable
                @update:model-value="handleManualInput(target.key, $event)"
              />
            </div>
            <SButton
              variant="ghost"
              circle
              size="small"
              :disabled="!draft[target.key]"
              :title="t('settings.fontConfig.resetRow')"
              @click="handleResetField(target.key)"
            >
              <template #icon><IconLucideRotateCcw /></template>
            </SButton>
          </div>
          <!-- 预览 -->
          <div
            v-if="draft[target.key]"
            class="mt-2.5 px-3 py-2 rounded-lg bg-surface-bright/40 text-sm text-on-surface truncate"
            :style="{ fontFamily: `'${draft[target.key]}'` }"
          >
            {{ t("settings.fontConfig.previewSample") }}
          </div>
        </div>
      </div>
    </div>

    <template #footer="{ close }">
      <SButton variant="secondary" @click="close">{{ t("common.cancel") }}</SButton>
      <SButton type="primary" @click="handleSave">{{ t("common.save") }}</SButton>
    </template>
  </SDialog>
</template>
