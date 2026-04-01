<script setup lang="ts">
import type { DropdownMenuItem } from "./SDropdownMenu.vue";

const props = withDefaults(
  defineProps<{
    /** 菜单项列表 */
    items: DropdownMenuItem[];
    /** 对齐方式 */
    alignOffset?: number;
  }>(),
  {
    alignOffset: 0,
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
  <ContextMenuRoot>
    <ContextMenuTrigger as="div" class="contents">
      <slot />
    </ContextMenuTrigger>

    <ContextMenuPortal>
      <ContextMenuContent
        :align-offset="alignOffset"
        :avoid-collisions="true"
        class="z-300 min-w-32 max-w-52 rounded-lg bg-surface-bright border border-solid border-outline-variant/30 shadow-lg p-1 text-sm data-[state=open]:animate-popover-in data-[state=closed]:animate-popover-out"
      >
        <slot name="header" />
        <template v-for="item in items" :key="item.key">
          <ContextMenuSeparator
            v-if="item.separator"
            class="h-px mx-1.5 my-0.5 bg-outline-variant/20"
          />
          <ContextMenuItem
            :disabled="item.disabled"
            class="flex items-center gap-2 px-2 py-1.5 rounded-md text-on-surface outline-none select-none cursor-pointer transition-colors data-[highlighted]:bg-on-surface/5 data-[disabled]:opacity-40 data-[disabled]:pointer-events-none"
            @select="handleSelect(item)"
          >
            <component
              v-if="item.icon"
              :is="item.icon"
              class="size-3.5 opacity-60 shrink-0"
            />
            <span>{{ item.label }}</span>
          </ContextMenuItem>
        </template>
      </ContextMenuContent>
    </ContextMenuPortal>
  </ContextMenuRoot>
</template>
