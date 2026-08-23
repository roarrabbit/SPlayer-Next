<script setup lang="ts">
// 灵动岛左侧封面：加载中保留旧封面并模糊化，就绪后两段式翻转到新封面。
// 切歌时 track 乐观更新会立刻带来新封面 URL：若新歌尚未开播（loading=true），
// 只记录待翻转 URL、旧封面加模糊过渡；playing 恢复（loading=false）时执行
// rotateY 压扁/展开的翻转动画，中点换 src 无闪帧。秒切场景（缓存命中，
// loading 仍为 false）直接走快速翻转。不用 transform: scale（透明窗口历史事故）。
interface Props {
  /** 封面 URL */
  src?: string;
  /** 封面尺寸（正方形边长，w/h 未指定时使用） */
  size?: number;
  /** 封面宽度（px，几何调试可独立覆盖） */
  w?: number;
  /** 封面高度（px，几何调试可独立覆盖） */
  h?: number;
  /** 曲目加载中：保留当前封面模糊化，解除后翻转到最新 src */
  loading?: boolean;
}
const props = withDefaults(defineProps<Props>(), {
  src: "",
  size: 30,
  w: undefined,
  h: undefined,
  loading: false,
});

const displaySrc = ref(props.src);
const blurred = ref(false);
const imgRef = ref<HTMLImageElement | null>(null);

/** 加载期间记录的待展示封面 */
let pendingSrc: string | null = null;
let outAnim: Animation | null = null;
let inAnim: Animation | null = null;

const abortFlip = (): void => {
  outAnim?.cancel();
  inAnim?.cancel();
  outAnim = null;
  inAnim = null;
};

/**
 * 专辑切换动效：下沉 → 回弹上浮 → 翻转一圈（侧面零宽处换图）→ 过冲归位
 * @param next - 目标封面 URL
 * @param outMs - 出场（前半圈）时长
 * @param inMs - 入场（后半圈）时长
 */
const flipTo = (next: string, outMs: number, inMs: number): void => {
  // 先清理未完成的上一轮：旧动画的 onfinish 尚未执行时 displaySrc 仍指向旧图，
  // 不取消会让它在后台「迟到生效」，把封面改回中间曲目
  abortFlip();
  if (displaySrc.value === next || !displaySrc.value) {
    displaySrc.value = next;
    return;
  }
  const el = imgRef.value;
  if (!el) {
    displaySrc.value = next;
    return;
  }
  // 出场期间预载新图，避免换 src 瞬间闪底色块
  const preload = new Image();
  preload.src = next;
  // 前半圈：向下一沉 → 回弹上升，同时转到侧面（90° 零宽）
  outAnim = el.animate(
    [
      { transform: "perspective(500px) translateY(0px) rotateY(0deg)", filter: "blur(0px)" },
      {
        transform: "perspective(500px) translateY(5px) rotateY(50deg)",
        filter: "blur(2px)",
        offset: 0.4,
        easing: "ease-out",
      },
      { transform: "perspective(500px) translateY(1px) rotateY(90deg)", filter: "blur(4px)" },
    ],
    { duration: outMs, easing: "ease-in", fill: "forwards" },
  );
  outAnim.onfinish = () => {
    displaySrc.value = next;
    nextTick(() => {
      const flipped = imgRef.value;
      if (!flipped) return;
      // 后半圈：从另一侧边缘继续转完一圈，轻微上浮过冲后归位
      inAnim = flipped.animate(
        [
          { transform: "perspective(500px) translateY(1px) rotateY(-90deg)", filter: "blur(4px)" },
          {
            transform: "perspective(500px) translateY(-3px) rotateY(-20deg)",
            filter: "blur(1px)",
            offset: 0.6,
            easing: "ease-in",
          },
          { transform: "perspective(500px) translateY(0px) rotateY(0deg)", filter: "blur(0px)" },
        ],
        { duration: inMs, easing: "cubic-bezier(0.32, 0.72, 0, 1)" },
      );
      // 入场终点即元素默认样式，结束即释放填充，交还 CSS 过渡控制权
      inAnim.onfinish = () => {
        inAnim?.cancel();
        inAnim = null;
      };
      outAnim?.cancel();
      outAnim = null;
    });
  };
};

watch(
  () => props.src,
  (next, prev) => {
    if (next === prev) return;
    // 清空封面：复位全部状态
    if (!next) {
      abortFlip();
      pendingSrc = null;
      blurred.value = false;
      displaySrc.value = "";
      return;
    }
    // 首次出现：直接显示，无翻转对象
    if (!displaySrc.value) {
      pendingSrc = null;
      displaySrc.value = next;
      return;
    }
    if (props.loading) {
      // 加载中：目标一律记录最新 src——快速往返切换（A→B→A）时新 src 可能与
      // displaySrc 相同，但不能因此跳过记录，否则过期的 pendingSrc 会在解除时
      // 把封面翻回中间那首
      pendingSrc = next;
      blurred.value = true;
      return;
    }
    // 秒切（有缓存 / 本地文件）：快速模糊翻转；同图早退与旧动画清理由 flipTo 处理
    pendingSrc = null;
    flipTo(next, 140, 200);
  },
  { immediate: true },
);

watch(
  () => props.loading,
  (loading, was) => {
    if (loading || !was) return;
    blurred.value = false;
    if (!pendingSrc) return;
    // 新歌就绪：完整翻转切换到新封面
    const next = pendingSrc;
    pendingSrc = null;
    flipTo(next, 220, 320);
  },
);

onBeforeUnmount(abortFlip);
</script>

<template>
  <div
    class="island-cover-wrap"
    :style="{ width: (props.w ?? props.size) + 'px', height: (props.h ?? props.size) + 'px' }"
  >
    <img
      v-if="displaySrc"
      ref="imgRef"
      class="island-cover"
      :class="{ 'is-blurred': blurred }"
      :src="displaySrc"
      alt=""
      draggable="false"
    />
  </div>
</template>

<style scoped>
.island-cover-wrap {
  flex: 0 0 auto;
  width: 30px;
  height: 30px;
  position: relative;
  /* 可见性完全由父层 .di-face 的 clip-path 随液体进度控制（随灵动岛整体进退），
     组件自身不再做 phase 驱动的淡入淡出，避免出现/消失时机与液体不一致。 */
}
.island-cover {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border-radius: 7px;
  object-fit: cover;
  background: rgba(255, 255, 255, 0.08);
  /* 微光晕：封面主色柔光 + 细白边 + 暗投影，贴合黑岛质感 */
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.08),
    0 2px 8px rgba(0, 0, 0, 0.45),
    0 0 10px var(--di-accent-soft, rgba(255, 255, 255, 0.15));
  will-change: transform, filter;
  /* 常驻过渡：加载模糊的进入与解除都平滑（解除靠移除类，transition 不能只在类上） */
  transition:
    filter 0.35s ease,
    opacity 0.35s ease;
}
/* 曲目加载中：旧封面模糊化提示"正在换歌"，解除时随翻转一起去模糊 */
.island-cover.is-blurred {
  filter: blur(5px);
  opacity: 0.72;
}
</style>
