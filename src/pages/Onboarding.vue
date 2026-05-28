<script setup lang="ts">
import { useSettingsStore } from "@/stores/settings";
import WindowControls from "@/components/layout/WindowControls.vue";
import StepWelcome from "@/components/onboarding/StepWelcome.vue";
import StepLibrary from "@/components/onboarding/StepLibrary.vue";
import StepStreaming from "@/components/onboarding/StepStreaming.vue";
import StepAppearance from "@/components/onboarding/StepAppearance.vue";
import StepHotkeys from "@/components/onboarding/StepHotkeys.vue";
const { t } = useI18n();
const router = useRouter();
const settings = useSettingsStore();

const STEPS = [
  { key: "welcome", component: StepWelcome },
  { key: "library", component: StepLibrary },
  { key: "streaming", component: StepStreaming },
  { key: "appearance", component: StepAppearance },
  { key: "hotkeys", component: StepHotkeys },
] as const;

const currentIndex = ref(0);
const direction = ref<"forward" | "backward">("forward");

const currentStep = computed(() => STEPS[currentIndex.value]);
const isFirst = computed(() => currentIndex.value === 0);
const isLast = computed(() => currentIndex.value === STEPS.length - 1);

const goNext = async (): Promise<void> => {
  if (isLast.value) {
    await complete();
    return;
  }
  direction.value = "forward";
  currentIndex.value += 1;
};

const goBack = (): void => {
  if (isFirst.value) return;
  direction.value = "backward";
  currentIndex.value -= 1;
};

const completing = ref(false);

const complete = async (): Promise<void> => {
  if (completing.value) return;
  completing.value = true;
  try {
    await settings.setSystem("system.onboardingCompleted", true);
    await router.replace("/");
  } finally {
    completing.value = false;
  }
};
</script>

<template>
  <div class="flex flex-col h-screen w-screen bg-app text-on-surface overflow-hidden">
    <div class="app-drag-region h-16 shrink-0 flex items-center justify-end px-3">
      <WindowControls />
    </div>

    <div class="flex-1 min-h-0 flex flex-col items-center justify-center px-8 py-6 overflow-y-auto">
      <div class="w-full max-w-2xl flex flex-col">
        <header class="flex items-center gap-4 mb-8">
          <div class="flex-1 flex items-center gap-1.5">
            <span
              v-for="(s, i) in STEPS"
              :key="s.key"
              class="h-1.5 rounded-full transition-all duration-300"
              :class="
                i === currentIndex
                  ? 'flex-[2] bg-primary'
                  : i < currentIndex
                    ? 'flex-1 bg-primary/60'
                    : 'flex-1 bg-on-surface/12'
              "
            />
          </div>
          <span class="text-xs text-on-surface-variant/50 tabular-nums shrink-0">
            {{ currentIndex + 1 }} / {{ STEPS.length }}
          </span>
        </header>

        <div class="relative min-h-[560px] flex items-start justify-center">
          <Transition :name="direction === 'forward' ? 'slide-fwd' : 'slide-back'" mode="out-in">
            <component
              :is="currentStep.component"
              :key="currentStep.key"
              :loading="completing"
              @next="goNext"
              @back="goBack"
            />
          </Transition>
        </div>
      </div>
    </div>

    <footer class="shrink-0 text-center pt-3 pb-5">
      <span class="text-xs text-on-surface-variant/40">{{ t("onboarding.footer") }}</span>
    </footer>
  </div>
</template>

<style scoped>
.slide-fwd-enter-active,
.slide-fwd-leave-active,
.slide-back-enter-active,
.slide-back-leave-active {
  transition:
    opacity 0.24s ease,
    transform 0.24s ease;
}
.slide-fwd-enter-from {
  opacity: 0;
  transform: translateX(24px);
}
.slide-fwd-leave-to {
  opacity: 0;
  transform: translateX(-24px);
}
.slide-back-enter-from {
  opacity: 0;
  transform: translateX(-24px);
}
.slide-back-leave-to {
  opacity: 0;
  transform: translateX(24px);
}
</style>
