<script setup lang="ts">
import { useSettingsStore } from "@/stores/settings";
import { useSystemFonts } from "@/composables/useSystemFonts";
import IconLucideRotateCcw from "~icons/lucide/rotate-ccw";

defineOptions({ inheritAttrs: false });

const { t } = useI18n();
const settings = useSettingsStore();
const { families: fonts, loading: loadingFonts, ensureLoaded } = useSystemFonts();

const DEFAULT_OPTION_VALUE = "__default_font__";
const CUSTOM_OPTION_VALUE = "__custom_font__";

type FontDraftKey = "global" | "lyric" | "desktopLyric" | "dynamicIsland" | "taskbarLyric";
type FontMode = "select" | "custom";
type FontGroup = "general" | "appLyric" | "externalLyric";

interface FontDraft {
  global: string;
  lyric: string;
  desktopLyric: string;
  dynamicIsland: string;
  taskbarLyric: string;
}

interface FontTarget {
  key: FontDraftKey;
  group: FontGroup;
  label: string;
  description: string;
  defaultLabel: string;
}

interface FontOption {
  value: string;
  label: string;
  style?: { fontFamily: string };
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

/** 分组目标 */
const groupedTargets = computed<Array<{ group: FontGroup; items: FontTarget[] }>>(() => {
  const items: FontTarget[] = TARGET_DEFS.map(({ key, group }) => {
    const name = t(`settings.fontConfig.fields.${key}`);
    return {
      key,
      group,
      label: t("settings.fontConfig.fieldLabel", { name }),
      description: t("settings.fontConfig.fieldDescription", { name }),
      defaultLabel:
        key === "lyric" ? t("settings.fontConfig.useGlobal") : t("settings.fontConfig.useSystem"),
    };
  });
  const groups: FontGroup[] = ["general", "appLyric", "externalLyric"];
  return groups
    .map((g) => ({ group: g, items: items.filter((it) => it.group === g) }))
    .filter((g) => g.items.length > 0);
});

/** 设置方式选项 */
const modeOptions = computed<FontOption[]>(() => [
  { value: "select", label: t("settings.fontConfig.modeSelect") },
  { value: "custom", label: t("settings.fontConfig.modeCustom") },
]);

/** 获取字体选项 */
const getOptions = (target: FontTarget): FontOption[] => {
  const list: FontOption[] = [
    { value: DEFAULT_OPTION_VALUE, label: target.defaultLabel },
    { value: CUSTOM_OPTION_VALUE, label: t("settings.fontConfig.customLabel") },
  ];
  for (const font of fonts.value) {
    list.push({ value: font, label: font, style: { fontFamily: font } });
  }
  return list;
};

/** 获取选择值 */
const getSelectValue = (value: string): string => {
  if (!value) return DEFAULT_OPTION_VALUE;
  if (fonts.value.includes(value)) return value;
  return CUSTOM_OPTION_VALUE;
};

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
  if (value === DEFAULT_OPTION_VALUE) {
    draft[key] = "";
    return;
  }
  // 切换自定义输入模式
  if (value === CUSTOM_OPTION_VALUE) {
    mode.value = "custom";
    return;
  }
  draft[key] = String(value);
};

/** 手动输入字体 */
const handleManualInput = (key: FontDraftKey, value: string): void => {
  draft[key] = value.trim();
};

/** 重置字体配置 */
const handleResetField = (key: FontDraftKey): void => {
  draft[key] = "";
};

/** 更新设置方式 */
const updateMode = (value: string | number | boolean): void => {
  mode.value = value === "custom" ? "custom" : "select";
};

/** 提交字体配置 */
const commitDraft = async (): Promise<void> => {
  settings.appearance.fontFamily = draft.global;
  settings.lyric.fontFamily = draft.lyric;
  await Promise.all([
    settings.setSystem("desktopLyric.fontFamily", draft.desktopLyric),
    settings.setSystem("dynamicIsland.fontFamily", draft.dynamicIsland),
    settings.setSystem("taskbarLyric.fontFamily", draft.taskbarLyric),
  ]);
};

/** 应用字体配置 */
const handleApply = async (): Promise<void> => {
  await commitDraft();
};

/** 保存字体配置 */
const handleSave = async (): Promise<void> => {
  await commitDraft();
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
    <div class="flex flex-col gap-5">
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
        <h4 class="flex items-center gap-2 text-sm font-semibold text-on-surface px-1">
          <span class="w-0.75 h-3.5 rounded-full bg-primary" />
          {{ t(`settings.fontConfig.groups.${g.group}`) }}
        </h4>
        <div
          v-for="target in g.items"
          :key="target.key"
          class="flex items-center gap-3 rounded-xl bg-surface-panel border border-solid border-outline-variant/15 px-4 py-3.5"
        >
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
              :options="getOptions(target)"
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
      </div>
    </div>

    <template #footer="{ close }">
      <SButton variant="secondary" @click="close">{{ t("common.cancel") }}</SButton>
      <SButton variant="secondary" @click="handleApply">{{ t("common.apply") }}</SButton>
      <SButton type="primary" @click="handleSave">{{ t("common.save") }}</SButton>
    </template>
  </SDialog>
</template>
