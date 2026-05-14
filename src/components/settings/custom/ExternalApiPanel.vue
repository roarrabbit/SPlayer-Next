<script setup lang="ts">
import { useSettingsStore } from "@/stores/settings";
import { toast } from "@/composables/useToast";
import type { ExternalApiStatus } from "@shared/types/settings";

defineOptions({ inheritAttrs: false });

const { t } = useI18n();
const settings = useSettingsStore();

const status = ref<ExternalApiStatus>({ listening: false, port: null, error: null });
const restarting = ref(false);

/** 配置端口跟实际监听端口不一致 */
const pendingRestart = computed(
  () =>
    status.value.listening &&
    status.value.port !== null &&
    status.value.port !== settings.system.externalApi.port,
);

const restart = async (): Promise<void> => {
  restarting.value = true;
  try {
    const result = await window.api.externalApi.restart();
    status.value = result;
    if (result.listening) {
      toast.success(t("settings.externalApi.restarted"));
    } else if (result.error?.code === "EADDRINUSE") {
      toast.error(t("settings.externalApi.portInUse", { port: settings.system.externalApi.port }));
    } else if (result.error) {
      toast.error(result.error.message);
    }
  } finally {
    restarting.value = false;
  }
};

onMounted(async () => {
  status.value = await window.api.externalApi.getStatus();
});
</script>

<template>
  <div
    class="rounded-xl bg-surface-panel border border-solid border-outline-variant/15 px-4 py-3.5 flex items-center justify-between gap-4"
  >
    <div class="min-w-0 flex-1">
      <div class="text-base flex items-center gap-2">
        {{ t("settings.externalApi.restart") }}
        <STag v-if="pendingRestart" type="warning" size="small">
          {{ t("settings.externalApi.pendingChange") }}
        </STag>
      </div>
      <div class="text-sm text-on-surface-variant/70 mt-0.5">
        {{
          pendingRestart
            ? t("settings.externalApi.pendingChangeHint", {
                configured: settings.system.externalApi.port,
                running: status.port,
              })
            : t("settings.externalApi.restartHint")
        }}
      </div>
    </div>
    <div class="shrink-0 flex items-center gap-2">
      <SButton
        type="primary"
        variant="secondary"
        size="small"
        :loading="restarting"
        @click="restart"
      >
        {{ t("settings.externalApi.restart") }}
      </SButton>
    </div>
  </div>
</template>
