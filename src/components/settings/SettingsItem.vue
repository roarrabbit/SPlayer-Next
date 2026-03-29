<script setup lang="ts">
import type { SettingItem } from "@/types/settings-schema";
import { useSettingModel } from "@/settings/useSettingModel";

const props = defineProps<{
  item: SettingItem;
  highlighted?: boolean;
}>();

const { t } = useI18n();

const model = props.item.binding ? useSettingModel(props.item.binding) : ref<any>();

const selectOptions = computed(() =>
  (props.item.options ?? []).map((o) => ({
    value: o.value,
    label: t(o.labelKey),
  })),
);

const isChildrenExpanded = computed(() => {
  if (props.item.childrenCondition) return props.item.childrenCondition();
  return model.value === true;
});

const isDisabled = computed(() => props.item.disabled?.() ?? false);
</script>

<template>
  <div :id="`setting-${item.key}`">
    <div
      class="flex items-center justify-between gap-4 rounded-xl bg-surface-panel border-1 border-solid border-outline-variant/15 px-4 py-3.5 transition-all duration-300"
      :class="highlighted ? 'ring-2 ring-primary/30' : ''"
    >
      <div class="min-w-0 flex-1">
        <div class="text-base">{{ t(`settings.${item.key}.label`) }}</div>
        <div class="text-sm text-on-surface-variant/70 mt-0.5">
          {{ t(`settings.${item.key}.description`) }}
        </div>
      </div>

      <div class="shrink-0 w-50 flex justify-end">
        <SSwitch
          v-if="item.type === 'switch'"
          :model-value="model"
          :disabled="isDisabled"
          @update:model-value="model = $event"
        />
        <SSelect
          v-else-if="item.type === 'select'"
          :model-value="model"
          :options="selectOptions"
          :disabled="isDisabled"
          @update:model-value="model = $event"
        />
        <SSlider
          v-else-if="item.type === 'slider'"
          :model-value="model"
          :min="item.min ?? 0"
          :max="item.max ?? 100"
          :step="item.step ?? 1"
          class="w-36"
          :thumb-size="14"
          :track-height="4"
          always-show-thumb
          @change="model = $event"
        />
        <SButton
          v-else-if="item.type === 'button'"
          type="primary"
          variant="secondary"
          size="small"
          @click="item.action?.()"
        >
          {{ t(`settings.${item.key}.label`) }}
        </SButton>
        <component
          v-else-if="item.type === 'custom' && item.component"
          :is="item.component"
          v-bind="item.componentProps"
          :model-value="model"
          @update:model-value="model = $event"
        />
      </div>
    </div>

    <!-- 子项 -->
    <Transition
      enter-active-class="transition-all duration-200 ease-out overflow-hidden"
      leave-active-class="transition-all duration-150 ease-in overflow-hidden"
      enter-from-class="opacity-0 max-h-0"
      enter-to-class="opacity-100 max-h-96"
      leave-from-class="opacity-100 max-h-96"
      leave-to-class="opacity-0 max-h-0"
    >
      <div v-if="item.children?.length && isChildrenExpanded" class="ml-6 mt-2.5 flex flex-col gap-2.5 border-l border-outline-variant/15 pl-2">
        <SettingsItem
          v-for="child in item.children"
          :key="child.key"
          :item="child"
        />
      </div>
    </Transition>
  </div>
</template>
