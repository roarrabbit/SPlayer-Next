<script setup lang="ts">
import { marked } from "marked";
import agreementRaw from "@root/USER_AGREEMENT.md?raw";
import IconFileText from "~icons/lucide/file-text";
import IconChevronLeft from "~icons/lucide/chevron-left";
import IconArrowRight from "~icons/lucide/arrow-right";

const { t } = useI18n();
const emit = defineEmits<{ (e: "next"): void; (e: "back"): void }>();

const agreementHtml = marked.parse(agreementRaw, { async: false }) as string;

const scrollArea = ref<HTMLElement | null>(null);
const readToEnd = ref(false);
const agreed = ref(false);

const canContinue = computed(() => readToEnd.value && agreed.value);

/** 滚动至底部后解锁同意勾选 */
const checkScroll = (): void => {
  const element = scrollArea.value;
  if (!element) return;
  if (element.scrollTop + element.clientHeight >= element.scrollHeight - 8) {
    readToEnd.value = true;
  }
};

onMounted(() => {
  nextTick(checkScroll);
});

const handleContinue = (): void => {
  if (!canContinue.value) return;
  emit("next");
};
</script>

<template>
  <div class="flex flex-col h-full w-full">
    <div class="flex items-center gap-3 mb-2 shrink-0">
      <IconFileText class="size-6 text-primary" />
      <h2 class="text-2xl font-bold">{{ t("onboarding.agreement.title") }}</h2>
    </div>
    <p class="text-on-surface-variant/70 mb-4 leading-relaxed shrink-0">
      {{ t("onboarding.agreement.subtitle") }}
    </p>
    <!-- eslint-disable vue/no-v-html -->
    <div
      ref="scrollArea"
      class="agreement-body flex-1 min-h-0 overflow-y-auto px-5 py-4 bg-on-surface/4 border border-solid border-primary/10 rounded-xl"
      @scroll="checkScroll"
      v-html="agreementHtml"
    />
    <!-- eslint-enable vue/no-v-html -->
    <div class="shrink-0 flex items-center gap-2.5 my-4">
      <SCheckbox v-model:checked="agreed" :disabled="!readToEnd" size="small">
        <span class="text-xs">{{ t("onboarding.agreement.agree") }}</span>
      </SCheckbox>
      <span
        class="text-xs text-on-surface-variant/40 transition-opacity"
        :class="readToEnd ? 'opacity-0' : 'opacity-100'"
      >
        {{ t("onboarding.agreement.scrollHint") }}
      </span>
    </div>
    <div class="flex items-center gap-3 shrink-0">
      <SButton variant="ghost" round @click="emit('back')">
        <template #icon><IconChevronLeft /></template>
        {{ t("onboarding.back") }}
      </SButton>
      <div class="flex-1" />
      <SButton type="primary" round :disabled="!canContinue" @click="handleContinue">
        {{ t("onboarding.agreement.accept") }}
        <template #icon><IconArrowRight /></template>
      </SButton>
    </div>
  </div>
</template>

<style scoped>
.agreement-body {
  line-height: 1.7;
  font-size: 13px;
  color: rgb(var(--s-on-surface-variant) / 0.85);
}
.agreement-body :deep(h1) {
  margin: 0 0 0.75em;
  font-size: 18px;
  font-weight: 700;
  color: rgb(var(--s-on-surface));
}
.agreement-body :deep(h2) {
  margin: 1.4em 0 0.6em;
  font-size: 15px;
  font-weight: 600;
  color: rgb(var(--s-on-surface));
}
.agreement-body :deep(h3) {
  margin: 1.1em 0 0.5em;
  font-size: 13.5px;
  font-weight: 600;
  color: rgb(var(--s-on-surface));
}
.agreement-body :deep(p) {
  margin: 0.5em 0;
}
.agreement-body :deep(ul) {
  margin: 0.5em 0;
  padding-left: 1.3em;
  list-style: disc;
}
.agreement-body :deep(li) {
  margin: 0.25em 0;
}
.agreement-body :deep(strong) {
  font-weight: 600;
  color: rgb(var(--s-on-surface));
}
.agreement-body :deep(a) {
  color: rgb(var(--s-primary));
  text-decoration: none;
}
.agreement-body :deep(a:hover) {
  text-decoration: underline;
}
.agreement-body :deep(hr) {
  margin: 1.2em 0;
  border: none;
  border-top: 1px solid rgb(var(--s-on-surface) / 0.1);
}
.agreement-body :deep(code) {
  padding: 0.1em 0.35em;
  border-radius: 4px;
  background: rgb(var(--s-on-surface) / 0.08);
  font-size: 0.9em;
}
</style>
