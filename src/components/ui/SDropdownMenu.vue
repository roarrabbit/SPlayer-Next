<script setup lang="ts">
import type { Component } from "vue";

export interface DropdownMenuItem {
  /** 唯一标识 */
  key: string;
  /** 显示文本 */
  label: string;
  /** 图标组件 */
  icon?: Component;
  /** 是否禁用 */
  disabled?: boolean;
  /** 分割线：在此项上方显示分割线 */
  separator?: boolean;
  /** 子菜单 */
  children?: DropdownMenuItem[];
}

const props = withDefaults(
  defineProps<{
    /** 菜单项列表 */
    items: DropdownMenuItem[];
    /** 弹出位置 */
    side?: "top" | "right" | "bottom" | "left";
    /** 对齐方式 */
    align?: "start" | "center" | "end";
    /** 与触发元素的距离（px） */
    sideOffset?: number;
  }>(),
  {
    side: "bottom",
    align: "center",
    sideOffset: 4,
  },
);

const emit = defineEmits<{
  select: [key: string];
}>();

const handleSelect = (item: DropdownMenuItem): void => {
  if (item.disabled) return;
  emit("select", item.key);
};
</script>

<template>
  <DropdownMenuRoot>
    <DropdownMenuTrigger as="div" class="inline-flex">
      <slot name="trigger" />
    </DropdownMenuTrigger>

    <DropdownMenuPortal>
      <DropdownMenuContent
        :side="side"
        :align="align"
        :side-offset="sideOffset"
        :avoid-collisions="true"
        class="z-300 min-w-32 rounded-lg bg-surface-bright border border-solid border-outline-variant/30 shadow-lg p-1 text-sm data-[state=open]:animate-popover-in data-[state=closed]:animate-popover-out"
      >
        <template v-for="item in items" :key="item.key">
          <SDivider v-if="item.separator" class="mx-1.5 my-0.5" />
          <DropdownMenuItem
            :disabled="item.disabled"
            class="flex items-center gap-2 px-2 py-1.5 rounded-md text-on-surface outline-none select-none cursor-pointer transition-colors data-[highlighted]:bg-on-surface/5 data-[disabled]:opacity-40 data-[disabled]:pointer-events-none"
            @select="handleSelect(item)"
          >
            <component v-if="item.icon" :is="item.icon" class="size-3.5 opacity-60 shrink-0" />
            <span>{{ item.label }}</span>
          </DropdownMenuItem>
        </template>
      </DropdownMenuContent>
    </DropdownMenuPortal>
  </DropdownMenuRoot>
</template>
