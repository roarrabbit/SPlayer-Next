import type { Ref } from "vue";
import { Spring } from "@/components/player/Lyrics/engine/spring";

export interface SheetDismissOptions {
  /** 手势是否允许（通常=面板已挂载） */
  open: Ref<boolean>;
  /**
   * 开始关闭时立刻调用（应用层应在此恢复主界面 isExpanded=false）
   * 与原逻辑对齐：关闭瞬间主界面可见，不再等弹簧结束
   */
  onDismissStart?: () => void;
  /** 弹簧收起完成 / 面板可卸载时调用 */
  onDismissEnd: () => void;
  /** 是否启用手势 */
  enabled?: Ref<boolean> | (() => boolean);
}

interface Sample {
  y: number;
  t: number;
}

/** 开始识别为拖拽的最小位移（px） */
const ACTIVATE_DISTANCE = 10;
/** 关闭位移阈值（相对视口高度） */
const DISMISS_RATIO = 0.22;
/** 关闭速度阈值（px/ms） */
const DISMISS_VELOCITY = 0.9;
/** 速度采样窗口（ms） */
const VELOCITY_WINDOW_MS = 80;
/** 向上拖时的橡皮筋系数 */
const UPWARD_RUBBER = 0.18;

/**
 * FullPlayer 可打断下滑关闭
 * 跟手 1:1；松手按位移/速度决定关闭或回弹。
 * 关闭时 onDismissStart 立即触发（主界面立刻恢复），弹簧结束后再 onDismissEnd 卸载面板。
 */
export const useSheetDismiss = (options: SheetDismissOptions) => {
  const offsetY = ref(0);
  const dragging = ref(false);
  const settling = ref(false);
  /** 手势/弹簧已把面板推到屏外，跳过 CSS leave 避免回闪 */
  const skipLeaveTransition = ref(false);

  const spring = new Spring(0);
  spring.updateParams({ mass: 1, damping: 28, stiffness: 280, soft: true });

  let pointerId: number | null = null;
  let startY = 0;
  let startX = 0;
  let baseOffset = 0;
  let activated = false;
  let samples: Sample[] = [];
  let rafId = 0;
  let lastFrame = 0;
  let hostEl: HTMLElement | null = null;
  /** 本次关闭是否已通知过 start（避免重复） */
  let dismissStarted = false;

  const isEnabled = (): boolean => {
    if (!options.enabled) return true;
    return typeof options.enabled === "function" ? options.enabled() : options.enabled.value;
  };

  const viewportH = (): number => window.innerHeight || 1;

  /** 交互控件 / 未滚到顶的歌词区：不启动下滑手势 */
  const shouldIgnoreTarget = (target: EventTarget | null): boolean => {
    if (!(target instanceof Element)) return false;
    if (
      target.closest(
        'button, a, input, textarea, select, [role="slider"], [role="button"], [role="menu"], [role="listbox"], .s-slider, .s-button',
      )
    ) {
      return true;
    }
    const lyric = target.closest(".lyric-area");
    if (lyric instanceof HTMLElement) {
      let node: HTMLElement | null = target as HTMLElement;
      while (node && node !== lyric) {
        const style = getComputedStyle(node);
        const oy = style.overflowY;
        if (
          (oy === "auto" || oy === "scroll" || oy === "overlay") &&
          node.scrollHeight > node.clientHeight + 1 &&
          node.scrollTop > 2
        ) {
          return true;
        }
        node = node.parentElement;
      }
    }
    return false;
  };

  const stopRaf = (): void => {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }
    lastFrame = 0;
  };

  const applyOffset = (y: number): void => {
    offsetY.value = y;
    if (hostEl) {
      hostEl.style.transform = y <= 0.5 ? "" : `translate3d(0, ${y}px, 0)`;
      hostEl.style.transition = "none";
    }
  };

  const clearHostInline = (): void => {
    if (!hostEl) return;
    hostEl.style.transform = "";
    hostEl.style.transition = "";
    hostEl.style.touchAction = "";
  };

  /** 绑定面板 DOM（打开后 / ref 就绪时调用） */
  const bindHost = (el: HTMLElement | null): void => {
    hostEl = el;
  };

  const notifyDismissStart = (): void => {
    if (dismissStarted) return;
    dismissStarted = true;
    options.onDismissStart?.();
  };

  const tick = (now: number): void => {
    if (!lastFrame) lastFrame = now;
    const delta = Math.min(32, now - lastFrame);
    lastFrame = now;
    spring.update(delta);
    applyOffset(Math.max(0, spring.getCurrentPosition()));

    if (!spring.arrived()) {
      rafId = requestAnimationFrame(tick);
      return;
    }

    settling.value = false;
    stopRaf();
    const finalY = spring.getCurrentPosition();
    const h = viewportH();
    if (finalY >= h * 0.92) {
      skipLeaveTransition.value = true;
      options.onDismissEnd();
      return;
    }
    applyOffset(0);
    spring.setPosition(0);
    clearHostInline();
    dismissStarted = false;
  };

  const startRaf = (): void => {
    if (rafId) return;
    settling.value = true;
    lastFrame = 0;
    rafId = requestAnimationFrame(tick);
  };

  /**
   * 从当前呈现值带着速度重定向到目标
   * @param target - 目标偏移
   * @param velocityPxPerMs - 松手速度（px/ms，向下为正）
   */
  const retarget = (target: number, velocityPxPerMs = 0): void => {
    spring.setPosition(offsetY.value);
    spring.setTargetPositionWithVelocity(target, velocityPxPerMs * 1000);
    startRaf();
  };

  const estimateVelocity = (): number => {
    if (samples.length < 2) return 0;
    const latest = samples[samples.length - 1];
    let oldest = samples[0];
    for (let i = samples.length - 2; i >= 0; i--) {
      if (latest.t - samples[i].t >= VELOCITY_WINDOW_MS) {
        oldest = samples[i];
        break;
      }
      oldest = samples[i];
    }
    const dt = latest.t - oldest.t;
    if (dt <= 0) return 0;
    return (latest.y - oldest.y) / dt;
  };

  const endGesture = (commit: boolean): void => {
    if (pointerId == null) return;
    if (hostEl?.hasPointerCapture(pointerId)) {
      try {
        hostEl.releasePointerCapture(pointerId);
      } catch {
        /* ignore */
      }
    }

    const velocity = estimateVelocity();
    const h = viewportH();
    const shouldDismiss =
      commit && activated && (offsetY.value > h * DISMISS_RATIO || velocity > DISMISS_VELOCITY);

    dragging.value = false;
    activated = false;
    pointerId = null;
    samples = [];

    if (shouldDismiss) {
      // 立刻恢复主界面，弹簧只负责 FullPlayer 离场
      notifyDismissStart();
      retarget(h, Math.max(velocity, DISMISS_VELOCITY * 0.6));
    } else if (offsetY.value > 0.5 || settling.value) {
      retarget(0, velocity);
    }
  };

  const onPointerDown = (e: PointerEvent): void => {
    if (!options.open.value || !isEnabled()) return;
    if (e.button !== 0) return;
    if (shouldIgnoreTarget(e.target)) return;
    if (pointerId != null) return;

    // 打断进行中的弹簧，从当前呈现值接手
    if (settling.value) {
      stopRaf();
      settling.value = false;
      spring.setPosition(offsetY.value);
    }

    pointerId = e.pointerId;
    startY = e.clientY;
    startX = e.clientX;
    baseOffset = offsetY.value;
    activated = false;
    dragging.value = false;
    samples = [{ y: e.clientY, t: e.timeStamp }];
    hostEl = e.currentTarget as HTMLElement;
  };

  const onPointerMove = (e: PointerEvent): void => {
    if (pointerId !== e.pointerId) return;

    samples.push({ y: e.clientY, t: e.timeStamp });
    if (samples.length > 12) samples.shift();

    const dy = e.clientY - startY;
    const dx = e.clientX - startX;

    if (!activated) {
      if (Math.abs(dy) < ACTIVATE_DISTANCE && Math.abs(dx) < ACTIVATE_DISTANCE) return;
      // 仅接受明显向下的竖向手势
      if (dy < ACTIVATE_DISTANCE || dy < Math.abs(dx) * 1.15) {
        endGesture(false);
        return;
      }
      activated = true;
      dragging.value = true;
      if (hostEl) {
        hostEl.style.touchAction = "none";
        hostEl.setPointerCapture(e.pointerId);
      }
    }

    e.preventDefault();
    const raw = baseOffset + dy;
    const next = raw < 0 ? raw * UPWARD_RUBBER : raw;
    applyOffset(Math.max(0, next));
    spring.setPosition(offsetY.value);
  };

  const onPointerUp = (e: PointerEvent): void => {
    if (pointerId !== e.pointerId) return;
    endGesture(true);
  };

  const onPointerCancel = (e: PointerEvent): void => {
    if (pointerId !== e.pointerId) return;
    endGesture(false);
  };

  /**
   * 按钮关闭：与原逻辑一致——立刻 onDismissStart，再弹簧离场
   * 应用层通常同时把 sheetOpen 交给 CSS leave 或弹簧 end
   */
  const dismissAnimated = (): void => {
    if (!options.open.value && !settling.value) return;
    if (pointerId != null) endGesture(false);
    if (!hostEl) {
      hostEl = document.querySelector(".full-player-root") as HTMLElement | null;
    }
    if (hostEl) hostEl.style.touchAction = "none";
    notifyDismissStart();
    // 按钮退出给更高初速度，接近原 CSS leave ~360ms，避免拖沓
    retarget(viewportH(), Math.max(DISMISS_VELOCITY, 1.8));
  };

  /** 关闭动画结束（或 v-show 隐藏）后清理内联样式 */
  const resetAfterClose = (): void => {
    stopRaf();
    settling.value = false;
    dragging.value = false;
    activated = false;
    pointerId = null;
    samples = [];
    spring.setPosition(0);
    offsetY.value = 0;
    clearHostInline();
    skipLeaveTransition.value = false;
    dismissStarted = false;
    hostEl = null;
  };

  watch(
    () => options.open.value,
    (open) => {
      if (open) {
        skipLeaveTransition.value = false;
        dismissStarted = false;
        stopRaf();
        settling.value = false;
        dragging.value = false;
        activated = false;
        pointerId = null;
        samples = [];
        spring.setPosition(0);
        offsetY.value = 0;
        clearHostInline();
      }
    },
  );

  onBeforeUnmount(() => {
    stopRaf();
  });

  return {
    offsetY,
    dragging,
    settling,
    skipLeaveTransition,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    dismissAnimated,
    resetAfterClose,
    bindHost,
  };
};
