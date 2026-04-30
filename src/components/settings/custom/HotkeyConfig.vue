<script setup lang="ts">
import type { HotkeyActionId } from "@shared/types/hotkey";
import { HOTKEY_ACTIONS } from "@shared/defaults/hotkeys";
import { useHotkeyStore } from "@/stores/hotkey";
import { useHotkeyRecorder } from "@/core/hotkey/recorder";
import { formatAccelerator } from "@shared/utils/accelerator";
import IconLucideRotateCcw from "~icons/lucide/rotate-ccw";

defineOptions({ inheritAttrs: false });

const { t } = useI18n();
const hotkey = useHotkeyStore();

/** 平台 */
const isMac = computed(() => {
  const p = (window as unknown as { electron?: { process?: { platform?: string } } })
    .electron?.process?.platform;
  return p === "darwin";
});

type Scope = "inApp" | "global";

const recordingTarget = ref<{ id: HotkeyActionId; scope: Scope } | null>(null);
const errorFor = ref<{
  id: HotkeyActionId;
  scope: Scope;
  kind: "duplicate" | "osOccupied";
  conflictWith?: HotkeyActionId;
} | null>(null);

const clearError = (): void => {
  errorFor.value = null;
};

const recorder = useHotkeyRecorder({
  isMac: isMac.value,
  requireModifier: false,
  onConfirm: async (accel) => {
    const target = recordingTarget.value;
    if (!target) return;
    recordingTarget.value = null;

    if (target.scope === "inApp") {
      const dup = hotkey.findInAppDuplicate(accel, target.id);
      if (dup) {
        errorFor.value = { id: target.id, scope: "inApp", kind: "duplicate", conflictWith: dup };
        return;
      }
    } else {
      const ok = await hotkey.probe(accel);
      if (!ok) {
        errorFor.value = { id: target.id, scope: "global", kind: "osOccupied" };
        return;
      }
    }

    const cur = hotkey.bindings[target.id] ?? { inApp: null, global: null };
    await hotkey.updateBinding(target.id, { ...cur, [target.scope]: accel });
  },
  onCancel: () => {
    recordingTarget.value = null;
  },
  onClear: async () => {
    const target = recordingTarget.value;
    recordingTarget.value = null;
    if (!target) return;
    const cur = hotkey.bindings[target.id] ?? { inApp: null, global: null };
    await hotkey.updateBinding(target.id, { ...cur, [target.scope]: null });
  },
});

const startRecord = (id: HotkeyActionId, scope: Scope): void => {
  // global 关闭时不允许录入 global
  if (scope === "global" && !hotkey.globalEnabled) return;
  clearError();
  if (
    recordingTarget.value &&
    recordingTarget.value.id === id &&
    recordingTarget.value.scope === scope
  ) {
    recorder.cancel();
    return;
  }
  if (recordingTarget.value) recorder.cancel();
  recordingTarget.value = { id, scope };
  recorder.start();
};

const stopRecord = (): void => {
  if (recorder.isRecording.value) recorder.cancel();
};

const resetSingle = async (id: HotkeyActionId): Promise<void> => {
  clearError();
  await hotkey.resetBinding(id);
};

const resetAll = async (): Promise<void> => {
  clearError();
  await hotkey.resetBinding();
};

const toggleGlobalEnabled = async (v: boolean): Promise<void> => {
  await hotkey.setGlobalEnabled(v);
};

const valueOf = (id: HotkeyActionId, scope: Scope): string => {
  const target = recordingTarget.value;
  if (target && target.id === id && target.scope === scope) {
    return recorder.current.value;
  }
  const accel = hotkey.bindings[id]?.[scope];
  if (!accel) return "";
  return formatAccelerator(accel, isMac.value);
};

const placeholderOf = (id: HotkeyActionId, scope: Scope): string => {
  const target = recordingTarget.value;
  if (target && target.id === id && target.scope === scope) {
    return t("settings.hotkeys.recording");
  }
  return t("settings.hotkeys.unbound");
};

const isGlobalOsOccupied = (id: HotkeyActionId): boolean =>
  hotkey.conflicts.some((c) => c.id === id && c.scope === "global" && c.reason === "os-occupied");

const statusOf = (id: HotkeyActionId, scope: Scope): "default" | "error" => {
  if (errorFor.value && errorFor.value.id === id && errorFor.value.scope === scope) return "error";
  if (scope === "global" && hotkey.globalEnabled && isGlobalOsOccupied(id)) return "error";
  return "default";
};

const errorTitleOf = (id: HotkeyActionId, scope: Scope): string => {
  const err = errorFor.value;
  if (err && err.id === id && err.scope === scope) {
    if (err.kind === "osOccupied") return t("settings.hotkeys.osOccupied");
    const conflictMeta = HOTKEY_ACTIONS.find((a) => a.id === err.conflictWith);
    return t("settings.hotkeys.duplicateWith", {
      action: conflictMeta ? t(conflictMeta.labelKey) : "",
    });
  }
  if (scope === "global" && hotkey.globalEnabled && isGlobalOsOccupied(id)) {
    return t("settings.hotkeys.osOccupied");
  }
  return "";
};
</script>

<template>
  <div class="flex flex-col gap-3">
    <!-- 第一块：全局快捷键开关 -->
    <div
      class="rounded-xl bg-surface-panel border border-solid border-outline-variant/15 px-4 py-3.5 flex items-center justify-between gap-4"
    >
      <div class="min-w-0 flex-1">
        <div class="text-base">{{ t("settings.hotkeys.globalEnabled") }}</div>
        <div class="text-sm text-on-surface-variant/70 mt-0.5">
          {{ t("settings.hotkeys.globalEnabledHint") }}
        </div>
      </div>
      <SSwitch :model-value="hotkey.globalEnabled" @update:model-value="toggleGlobalEnabled" />
    </div>

    <!-- 第二块：绑定表 -->
    <div
      class="rounded-xl bg-surface-panel border border-solid border-outline-variant/15 overflow-hidden"
    >
      <!-- 表头 -->
      <div
        class="px-4 py-2.5 flex items-center gap-3 text-sm text-on-surface-variant/60 border-b border-solid border-outline-variant/10"
      >
        <span class="flex-1">{{ t("settings.hotkeys.colAction") }}</span>
        <span class="w-44 text-center">{{ t("settings.hotkeys.colInApp") }}</span>
        <span class="w-44 text-center">{{ t("settings.hotkeys.colGlobal") }}</span>
        <span class="w-8" />
      </div>

      <!-- 数据行 -->
      <div class="flex flex-col">
        <div
          v-for="action in HOTKEY_ACTIONS"
          :key="action.id"
          class="px-4 py-2 flex items-center gap-3 border-b border-solid border-outline-variant/10 last:border-b-0"
        >
          <span class="flex-1 text-sm">{{ t(action.labelKey) }}</span>

          <div class="w-44" :title="errorTitleOf(action.id, 'inApp')">
            <SInput
              readonly
              size="small"
              :model-value="valueOf(action.id, 'inApp')"
              :placeholder="placeholderOf(action.id, 'inApp')"
              :status="statusOf(action.id, 'inApp')"
              @focus="startRecord(action.id, 'inApp')"
              @blur="stopRecord"
            />
          </div>

          <div class="w-44" :title="errorTitleOf(action.id, 'global')">
            <SInput
              readonly
              size="small"
              :disabled="!hotkey.globalEnabled"
              :model-value="valueOf(action.id, 'global')"
              :placeholder="placeholderOf(action.id, 'global')"
              :status="statusOf(action.id, 'global')"
              @focus="startRecord(action.id, 'global')"
              @blur="stopRecord"
            />
          </div>

          <SButton
            variant="ghost"
            circle
            size="small"
            :title="t('settings.hotkeys.resetRow')"
            @click="resetSingle(action.id)"
          >
            <template #icon><IconLucideRotateCcw /></template>
          </SButton>
        </div>
      </div>

      <!-- 底部 footer -->
      <div
        class="px-4 py-3 flex items-center justify-between text-sm text-on-surface-variant/60 border-t border-solid border-outline-variant/15"
      >
        <span>{{ t("settings.hotkeys.tipRecording") }}</span>
        <SButton variant="secondary" size="small" @click="resetAll">
          {{ t("settings.hotkeys.resetAll") }}
        </SButton>
      </div>
    </div>
  </div>
</template>
