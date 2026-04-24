<script setup lang="ts">
import type { SSelectOption } from "./SSelect.vue";

export interface SPopselectProps {
  modelValue?: string | number | boolean;
  options?: SSelectOption[];
  disabled?: boolean;
  /** 弹出位置 */
  side?: "top" | "right" | "bottom" | "left";
  /** 对齐方式 */
  align?: "start" | "center" | "end";
  /** 与触发元素的距离（px） */
  sideOffset?: number;
  /** 触发方式 */
  trigger?: "click" | "hover";
  /** hover 打开延迟（ms） */
  openDelay?: number;
  /** hover 关闭延迟（ms） */
  closeDelay?: number;
  /** 封面主题模式 */
  cover?: boolean;
  /** 触发器是否撑满父容器宽度 */
  block?: boolean;
  /** 选中后是否自动关闭 */
  autoClose?: boolean;
  /** 面板最小宽度（px），默认 128 */
  minWidth?: number;
}

const props = withDefaults(defineProps<SPopselectProps>(), {
  options: () => [],
  disabled: false,
  side: "bottom",
  align: "center",
  sideOffset: 6,
  trigger: "click",
  openDelay: 200,
  closeDelay: 150,
  cover: false,
  block: false,
  autoClose: true,
  minWidth: 128,
});

const emit = defineEmits<{
  "update:modelValue": [value: string | number | boolean];
  "update:open": [value: boolean];
}>();

const isOpen = ref(false);

const setOpen = (val: boolean): void => {
  isOpen.value = val;
  emit("update:open", val);
};

const selectedOption = computed(() =>
  props.options.find((o) => o.value === props.modelValue),
);

let openTimer: ReturnType<typeof setTimeout> | null = null;
let closeTimer: ReturnType<typeof setTimeout> | null = null;

const clearTimers = (): void => {
  if (openTimer) {
    clearTimeout(openTimer);
    openTimer = null;
  }
  if (closeTimer) {
    clearTimeout(closeTimer);
    closeTimer = null;
  }
};

const handlePointerEnter = (): void => {
  if (props.trigger !== "hover" || props.disabled) return;
  clearTimers();
  openTimer = setTimeout(() => setOpen(true), props.openDelay);
};

const handlePointerLeave = (): void => {
  if (props.trigger !== "hover") return;
  clearTimers();
  closeTimer = setTimeout(() => setOpen(false), props.closeDelay);
};

const handleSelect = (opt: SSelectOption): void => {
  if (opt.value === props.modelValue) {
    if (props.autoClose) setOpen(false);
    return;
  }
  emit("update:modelValue", opt.value);
  if (props.autoClose) setOpen(false);
};

onUnmounted(clearTimers);
</script>

<template>
  <PopoverRoot
    :open="isOpen"
    @update:open="trigger === 'click' ? setOpen($event) : undefined"
  >
    <PopoverTrigger as-child :disabled="disabled">
      <span
        :class="block ? 'flex w-full' : 'inline-flex'"
        @pointerenter="handlePointerEnter"
        @pointerleave="handlePointerLeave"
      >
        <slot name="trigger" :selected="selectedOption" :open="isOpen">
          <span class="text-sm text-on-surface-variant">
            {{ selectedOption?.label ?? "" }}
          </span>
        </slot>
      </span>
    </PopoverTrigger>

    <PopoverPortal>
      <PopoverContent
        :side="side"
        :align="align"
        :side-offset="sideOffset"
        :avoid-collisions="true"
        :style="{ minWidth: `${minWidth}px` }"
        :class="[
          'z-300 rounded-xl shadow-lg p-1 text-sm data-[state=open]:animate-popover-in data-[state=closed]:animate-popover-out',
          cover
            ? 'bg-black/55 backdrop-blur-xl backdrop-saturate-160 border border-solid border-white/10'
            : 'bg-surface-bright border border-solid border-outline-variant/30',
        ]"
        @pointerenter="handlePointerEnter"
        @pointerleave="handlePointerLeave"
        @escape-key-down="setOpen(false)"
      >
        <div class="max-h-60 overflow-y-auto">
          <button
            v-for="opt in options"
            :key="String(opt.value)"
            type="button"
            :title="opt.label"
            :class="[
              'relative w-full flex items-center h-8.5 px-3 pr-8 rounded-md border-none bg-transparent cursor-pointer outline-none text-left transition-colors duration-200',
              cover ? 'hover:bg-white/10' : 'hover:bg-on-surface/8',
              opt.value === modelValue
                ? cover
                  ? 'text-cover'
                  : 'text-primary'
                : cover
                  ? 'text-cover/80'
                  : 'text-on-surface',
            ]"
            @click="handleSelect(opt)"
          >
            <span class="flex-1 truncate">{{ opt.label }}</span>
            <IconLucideCheck
              v-if="opt.value === modelValue"
              class="absolute right-2 size-3.5 shrink-0"
              :class="cover ? 'text-cover' : 'text-primary'"
            />
          </button>
        </div>
      </PopoverContent>
    </PopoverPortal>
  </PopoverRoot>
</template>
