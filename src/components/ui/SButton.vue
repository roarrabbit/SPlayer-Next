<script setup lang="ts">
import { vRipple } from "@/directives/ripple";

export interface SButtonProps {
  /** 按钮类型 */
  type?: "default" | "primary" | "info" | "success" | "warning" | "error";
  /** 次要样式 */
  secondary?: boolean;
  /** 三级样式 */
  tertiary?: boolean;
  /** 幽灵按钮 */
  ghost?: boolean;
  /** 虚线边框 */
  dashed?: boolean;
  /** 纯文字按钮 */
  text?: boolean;
  /** 全圆角胶囊形 */
  round?: boolean;
  /** 纯圆形（等宽高） */
  circle?: boolean;
  /** 尺寸 */
  size?: "tiny" | "small" | "medium" | "large";
  /** 禁用 */
  disabled?: boolean;
  /** 加载中 */
  loading?: boolean;
  /** 块级按钮 */
  block?: boolean;
  /** 加粗字体 */
  strong?: boolean;
  /** 涟漪效果 */
  ripple?: boolean;
}

const props = withDefaults(defineProps<SButtonProps>(), {
  type: "default",
  size: "medium",
});

const isDisabled = computed(() => props.disabled || props.loading);

/** 禁用时不启用涟漪 */
const enableRipple = computed(() => (props.ripple && !isDisabled.value) || undefined);
</script>

<template>
  <button
    v-ripple="enableRipple"
    :disabled="isDisabled"
    class="s-button inline-flex items-center justify-center gap-1.5 font-sans select-none outline-none cursor-pointer transition-[color,background-color,border-color,opacity] duration-200 disabled:cursor-not-allowed disabled:op-50"
    :class="[
      block && 'w-full',
      strong && 'font-semibold',
      // 形状
      circle || round ? 'rounded-full' : 'rounded-1.5',
      // 尺寸
      circle
        ? {
            tiny: 'w-6 h-6 text-xs',
            small: 'w-8 h-8 text-sm',
            medium: 'w-9 h-9 text-sm',
            large: 'w-10 h-10 text-base',
          }[size]
        : {
            tiny: 'px-1.5 h-6 text-xs',
            small: 'px-2.5 h-8 text-sm',
            medium: 'px-3.5 h-9 text-sm',
            large: 'px-4.5 h-10 text-base',
          }[size],
      // 纯文字按钮（无边框无背景）
      text &&
        {
          default: 'text-on-surface not-disabled:hover:text-primary',
          primary: 'text-primary not-disabled:hover:text-primary/70',
          info: 'text-blue-500 not-disabled:hover:text-blue-400',
          success: 'text-green-600 not-disabled:hover:text-green-500',
          warning: 'text-amber-600 not-disabled:hover:text-amber-500',
          error: 'text-red-500 not-disabled:hover:text-red-400',
        }[type],
      // 幽灵按钮（有边框，透明背景）
      !text &&
        ghost && [
          'has-border',
          dashed && 'border-dashed',
          {
            default:
              'border-outline-variant text-on-surface not-disabled:hover:text-primary not-disabled:hover:border-primary',
            primary: 'border-primary text-primary not-disabled:hover:border-primary/70',
            info: 'border-blue-500 text-blue-500 not-disabled:hover:border-blue-400',
            success: 'border-green-600 text-green-600 not-disabled:hover:border-green-500',
            warning: 'border-amber-600 text-amber-600 not-disabled:hover:border-amber-500',
            error: 'border-red-500 text-red-500 not-disabled:hover:border-red-400',
          }[type],
        ],
      // 三级按钮（无边框，淡背景，hover/active 加深）
      !text &&
        !ghost &&
        tertiary &&
        {
          default:
            'bg-on-surface/5 text-on-surface not-disabled:hover:bg-on-surface/10 not-disabled:active:bg-on-surface/16',
          primary:
            'bg-primary/8 text-primary not-disabled:hover:bg-primary/14 not-disabled:active:bg-primary/20',
          info: 'bg-blue-500/8 text-blue-500 not-disabled:hover:bg-blue-500/14 not-disabled:active:bg-blue-500/20',
          success:
            'bg-green-600/8 text-green-600 not-disabled:hover:bg-green-600/14 not-disabled:active:bg-green-600/20',
          warning:
            'bg-amber-500/8 text-amber-600 not-disabled:hover:bg-amber-500/14 not-disabled:active:bg-amber-500/20',
          error:
            'bg-red-500/8 text-red-500 not-disabled:hover:bg-red-500/14 not-disabled:active:bg-red-500/20',
        }[type],
      // 次要按钮（无边框，淡色背景）
      !text &&
        !ghost &&
        !tertiary &&
        secondary &&
        {
          default:
            'bg-on-surface/12 text-on-surface not-disabled:hover:bg-on-surface/18 not-disabled:active:bg-on-surface/24',
          primary:
            'bg-primary/16 text-primary not-disabled:hover:bg-primary/22 not-disabled:active:bg-primary/28',
          info: 'bg-blue-500/16 text-blue-500 not-disabled:hover:bg-blue-500/22 not-disabled:active:bg-blue-500/28',
          success:
            'bg-green-600/16 text-green-600 not-disabled:hover:bg-green-600/22 not-disabled:active:bg-green-600/28',
          warning:
            'bg-amber-500/16 text-amber-600 not-disabled:hover:bg-amber-500/22 not-disabled:active:bg-amber-500/28',
          error:
            'bg-red-500/16 text-red-500 not-disabled:hover:bg-red-500/22 not-disabled:active:bg-red-500/28',
        }[type],
      // 默认按钮（有边框，实底背景）
      !text &&
        !ghost &&
        !tertiary &&
        !secondary && [
          'has-border',
          dashed && 'border-dashed',
          {
            default:
              'text-on-surface border-outline-variant not-disabled:hover:text-primary not-disabled:hover:border-primary',
            primary:
              'bg-primary text-on-primary border-primary not-disabled:hover:bg-primary/85 not-disabled:active:bg-primary/75',
            info: 'bg-blue-500 text-white border-blue-500 not-disabled:hover:bg-blue-600 not-disabled:active:bg-blue-700',
            success:
              'bg-green-600 text-white border-green-600 not-disabled:hover:bg-green-700 not-disabled:active:bg-green-800',
            warning:
              'bg-amber-500 text-white border-amber-500 not-disabled:hover:bg-amber-600 not-disabled:active:bg-amber-700',
            error:
              'bg-red-500 text-white border-red-500 not-disabled:hover:bg-red-600 not-disabled:active:bg-red-700',
          }[type],
        ],
    ]"
  >
    <span
      v-if="loading"
      class="i-svg-spinners-ring-resize"
      :class="size === 'tiny' ? 'text-xs' : 'text-sm'"
    />
    <slot />
  </button>
</template>

<style>
/* 基础重置：:where() 优先级为 0，不会覆盖 UnoCSS utility */
:where(.s-button) {
  border: none;
  background: transparent;
}

/* 需要边框的变种 */
:where(.s-button.has-border) {
  border: 1px solid;
}
</style>
