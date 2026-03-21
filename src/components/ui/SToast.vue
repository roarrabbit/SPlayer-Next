<script setup lang="ts">
import { useToast, setMaxToasts, type ToastType } from "@/composables/useToast";

const props = withDefaults(defineProps<{ max?: number }>(), { max: 5 });

setMaxToasts(props.max);

const { toasts, remove } = useToast();

const defaultStyle =
  "bg-white text-neutral-800 shadow-black/10 dark:bg-neutral-600/90 dark:text-neutral-100 dark:shadow-black/25";

const typeStyles: Record<ToastType, string> = {
  default: defaultStyle,
  loading: defaultStyle,
  info: "border-blue-500/40 bg-blue-500/80 text-white",
  success: "border-green-600/40 bg-green-600/80 text-white",
  warning: "border-amber-500/40 bg-amber-500/80 text-white",
  error: "border-red-500/40 bg-red-500/80 text-white",
};
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed bottom-24 inset-x-0 z-100 flex flex-col items-center gap-2 pointer-events-none"
    >
      <TransitionGroup
        enter-active-class="transition-all duration-300 ease-out"
        leave-active-class="transition-all duration-200 ease-in absolute"
        enter-from-class="translate-y-1 opacity-0 scale-95"
        leave-to-class="-translate-y-1 opacity-0 scale-95"
        move-class="transition-all duration-300 ease-out"
      >
        <div
          v-for="item in toasts"
          :key="item.id"
          class="pointer-events-auto border rounded-lg px-3.5 py-2.5 flex items-center gap-2.5 text-sm shadow-lg whitespace-nowrap backdrop-blur-sm"
          :class="typeStyles[item.type]"
        >
          <!-- 自定义图标 -->
          <template v-if="item.icon !== false">
            <component :is="item.icon" v-if="item.icon" class="size-4 shrink-0" />
            <template v-else>
              <SLoading v-if="item.type === 'loading'" class="size-4 shrink-0" />
              <IconLucideMessageCircle
                v-else-if="item.type === 'default'"
                class="size-4 shrink-0"
              />
              <IconLucideInfo v-else-if="item.type === 'info'" class="size-4 shrink-0" />
              <IconLucideCircleCheck v-else-if="item.type === 'success'" class="size-4 shrink-0" />
              <IconLucideTriangleAlert
                v-else-if="item.type === 'warning'"
                class="size-4 shrink-0"
              />
              <IconLucideCircleX v-else-if="item.type === 'error'" class="size-4 shrink-0" />
            </template>
          </template>
          <span>{{ item.message }}</span>
          <button
            v-if="item.closable"
            class="shrink-0 p-0 border-none bg-transparent opacity-40 hover:opacity-100 cursor-pointer text-current leading-0 transition-opacity duration-200"
            @click="remove(item.id)"
          >
            <IconLucideX class="size-3.5" />
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>
