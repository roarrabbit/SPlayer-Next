<script setup lang="ts">
// 灵动岛右侧实时频谱：6 根柱（中间向上下对称），由主进程推送的 128 段 FFT 驱动。
// 颜色取自封面主色（由父组件传入）。
// 播放时申请 FFT 推送（主进程跨窗口引用计数），暂停/卸载时释放。
import { DEFAULT_PALETTE } from "../composables/useCoverColor";

interface Props {
  /** 频谱柱双色（垂直渐变：primary 顶/secondary 底），#RRGGBB */
  colors?: { primary: string; secondary: string };
  /** 是否活跃（播放中）→ 申请 FFT + 跑 RAF */
  active?: boolean;
  /** 频谱画布宽度（调试台可覆盖） */
  w?: number;
  /** 频谱画布高度 */
  h?: number;
  /** 频谱柱数 */
  barCount?: number;
  /** 频谱柱间隙（px，越大柱越细） */
  barGap?: number;
}
const props = withDefaults(defineProps<Props>(), {
  colors: () => DEFAULT_PALETTE,
  active: false,
  w: 36,
  h: 30,
  barCount: 6,
  barGap: 2,
});

const canvasRef = ref<HTMLCanvasElement | null>(null);

const FFT_SIZE = 128;
/** 次声隆隆噪声集中在 40~50Hz，跳过前 5 段 */
const SKIP_LOW = 5;
const BAR_RADIUS = 1.5;
/** 后端推送间隔（ms），用于时间插值 */
const PUSH_INTERVAL = 16;
// —— 频段聚合 ——
/** 段内聚合权重：峰值为主、均值为辅（纯均值会抹平镲片/齿音瞬态） */
const PEAK_WEIGHT = 0.75;
/** 高频倾斜增益（乘法）：按柱序号放大高频视觉权重，对冲音乐 -3~-6dB/oct 的天然衰减 */
const TILT_GAINS = [1.0, 1.1, 1.25, 1.5, 1.8];
/** 幂次软化指数（Dynamic Knee）：<1 提升低能量弹感、抑制高能量频繁触顶 */
const KNEE_EXP = 0.85;
// —— 双向 LERP 平滑（快攻慢回弹）——
// 系数为 60fps 等效值；rAF 中按 dt 折算，ProMotion 120Hz 下手感一致、不会加速一倍
const ATTACK_LERP = 0.35; // 上升插值系数：连续快速上升（到位 ~90ms），不再接近跳变
const DECAY_LERP = 0.82; // 下降衰减系数：稍利落的回落，减轻拖尾
// —— 静音门限迟滞（hysteresis）——
// 两个方向用不同阈值，中间 [0.015, 0.03] 为保持区：门限附近的能量波动
// 不再导致柱子在「归零」和「上升」两种状态间反复翻转（消除小幅抖振）
const SILENCE_RISE = 0.03; // 上升触发阈值：静音柱须越过此值才重新起跳
const SILENCE_FALL = 0.015; // 下降归零阈值：活动柱低于此值才判静音归零

/** 上一帧推送 */
const prev = new Float32Array(FFT_SIZE);
/** 当前帧推送 */
const curr = new Float32Array(FFT_SIZE);
/** 实际渲染显示值（经过双向 LERP 平滑），长度随柱数变化 */
let display = new Float32Array(props.barCount);
/** 每柱静音迟滞状态：1 = 已判静音（保持 0，直到能量越过 SILENCE_RISE） */
let gated = new Uint8Array(props.barCount);
/** 每频段聚合能量（每帧重算，未经倾斜增益/软化） */
let bandEnergies = new Float32Array(props.barCount);
/** 上一次推送到达时间戳 */
let lastUpdate = 0;
/** 上一帧时间戳（帧率无关包络用） */
let lastFrame = 0;
let rafId: number | null = null;
let unsubFft: (() => void) | null = null;
let fftOn = false;

/** 频段边界（bin 索引），按当前柱数计算 */
let bandEdges: Array<{ start: number; end: number }> = [];
const computeBands = (): void => {
  const n = props.barCount;
  // 等八度划分：Rust 侧输出的 128 个 bin 已经是「频率对数轴」，
  // 前端直接线性平分即可得到等八度、等宽 bin 数的频段（5 柱时各 ~25 bin，
  // 覆盖 50–146 / 146–411 / 411–1.2k / 1.2k–3.4k / 3.4k–10k Hz）。
  // 注意：不要对 bin 索引再取一次对数——那会让最右柱吃掉近一半 bin 而彻底瘫痪。
  const lo = SKIP_LOW;
  const span = (FFT_SIZE - lo) / n;
  bandEdges = [];
  for (let i = 0; i < n; i++) {
    const start = Math.round(lo + span * i);
    const end = Math.round(lo + span * (i + 1));
    bandEdges.push({ start, end: Math.max(start + 1, end) });
  }
  if (display.length !== n) {
    display = new Float32Array(n);
    bandEnergies = new Float32Array(n);
    gated = new Uint8Array(n);
  }
};
computeBands();
// 柱数变化 → 重算频段与显示缓冲
watch(
  () => props.barCount,
  () => {
    computeBands();
  },
);

const resizeCanvas = (): void => {
  const canvas = canvasRef.value;
  if (!canvas) return;
  const dpr = window.devicePixelRatio || 1;
  const cssW = canvas.clientWidth || 28;
  const cssH = canvas.clientHeight || 20;
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);
  const ctx = canvas.getContext("2d");
  if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
};

const acquire = (): void => {
  if (fftOn) return;
  // 调用主进程 setFftEnabled；主进程按发送方 webContents 跨窗口引用计数，
  // 与主窗口频谱互不干扰。
  window.api.player.setFftEnabled(true);
  fftOn = true;
};
const release = (): void => {
  if (!fftOn) return;
  window.api.player.setFftEnabled(false);
  fftOn = false;
};

const subscribeFft = (): void => {
  if (unsubFft) return;
  unsubFft = window.api.dynamicIsland.onFftData((data) => {
    prev.set(curr);
    for (let i = 0; i < FFT_SIZE; i++) curr[i] = data.ldata[i] ?? 0;
    lastUpdate = performance.now();
  });
};

const draw = (): void => {
  const canvas = canvasRef.value;
  const ctx = canvas?.getContext("2d");
  if (!canvas || !ctx) {
    rafId = requestAnimationFrame(draw);
    return;
  }

  const now = performance.now();
  if (lastFrame === 0) lastFrame = now;
  const dt = Math.min((now - lastFrame) / 1000, 0.05);
  lastFrame = now;
  // 时间插值：prev → curr 之间按推送间隔平滑，消除 stair-step
  const t = Math.min((now - lastUpdate) / PUSH_INTERVAL, 1);
  const n = props.barCount;
  // 1. 段内聚合：峰值为主 + 均值兜底（纯均值会把瞬态抹平）
  for (let i = 0; i < n; i++) {
    const { start, end } = bandEdges[i];
    let peak = 0;
    let sum = 0;
    let cnt = 0;
    for (let j = start; j < end; j++) {
      const v = prev[j] + (curr[j] - prev[j]) * t;
      if (v > peak) peak = v;
      sum += v;
      cnt++;
    }
    const mean = cnt > 0 ? sum / cnt : 0;
    bandEnergies[i] = PEAK_WEIGHT * peak + (1 - PEAK_WEIGHT) * mean;
  }
  // 2. 能量整形：乘法高频增益 → 幂次软化 → 硬限幅 → 底噪门限
  //    乘法增益在 0 能量处自然归零（无加法补偿的"悬空"问题）
  //    柱数超出 TILT_GAINS 时复用最高档增益（调试台可改柱数）
  // 3. 统一双向 LERP：上升平滑插值跟进（不再一帧贴顶），下降纯指数衰减（重力感）。
  //    系数为 60fps 等效值，按 dt 折算成逐帧系数，帧率无关
  const riseCoef = 1 - Math.pow(1 - ATTACK_LERP, dt * 60);
  const fallFactor = Math.pow(DECAY_LERP, dt * 60);
  for (let i = 0; i < n; i++) {
    const gain = TILT_GAINS[Math.min(i, TILT_GAINS.length - 1)];
    let target = Math.min(Math.pow(bandEnergies[i] * gain, KNEE_EXP), 1);
    // 静音迟滞：状态翻转各走各的阈值，[SILENCE_FALL, SILENCE_RISE] 为保持区。
    // 已归零的柱须能量 > 0.03 才重新起跳；活动柱须能量 < 0.015 才判静音归零。
    // 门限附近的能量波动只会让柱子保持原状态，不再 0 ↔ 非 0 反复抖动。
    if (gated[i]) {
      if (target > SILENCE_RISE) {
        gated[i] = 0;
      } else {
        target = 0;
      }
    } else if (target < SILENCE_FALL) {
      gated[i] = 1;
      target = 0;
    }
    if (target > display[i]) {
      display[i] += (target - display[i]) * riseCoef;
    } else {
      display[i] *= fallFactor;
    }
    if (display[i] < 0) display[i] = 0;
    else if (display[i] > 1) display[i] = 1;
  }

  // 4. 绘制（圆角 / 颜色 / 尺寸 / 布局保持原样）
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  ctx.clearRect(0, 0, w, h);

  // 中间对称频谱：bar 从画布中线向上下等长展开（无音乐时贴中线，有音乐上下对称拉伸）
  const centerY = h / 2;
  const slot = w / n;
  const gap = props.barGap;
  const barWidth = Math.max(1, slot - gap);
  const maxHalf = h / 2;
  for (let i = 0; i < n; i++) {
    const v = Math.min(1, display[i]);
    // 整体高度 +1px（仍截断在 maxHalf 内，满格时不会溢出画布）
    const halfH = Math.max(1, Math.min(maxHalf, v * maxHalf + 1));
    const x = i * slot + gap / 2;
    const topY = centerY - halfH;
    const barH = halfH * 2;

    // 每根柱子：底部 secondary → 顶部 primary 的垂直渐变（圆角矩形）
    const topColor = props.colors.primary;
    const bottomColor = props.colors.secondary;
    const grad = ctx.createLinearGradient(0, centerY + halfH, 0, topY);
    grad.addColorStop(0, bottomColor); // 底部：深辅色
    grad.addColorStop(1, topColor); // 顶部：亮主色（发光感）
    ctx.fillStyle = grad;

    ctx.beginPath();
    ctx.roundRect(x, topY, barWidth, barH, BAR_RADIUS);
    ctx.fill();
  }
  rafId = requestAnimationFrame(draw);
};

const startLoop = (): void => {
  if (rafId !== null) return;
  rafId = requestAnimationFrame(draw);
};
const stopLoop = (): void => {
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
  // 归零，下次启动从静默开始（迟滞状态一并复位）
  display.fill(0);
  gated.fill(0);
  prev.fill(0);
  curr.fill(0);
};

// 活跃态切换：播放→申请 FFT+跑 RAF；暂停→释放+停止
watch(
  () => props.active,
  (on) => {
    if (on) {
      acquire();
      subscribeFft();
      startLoop();
    } else {
      release();
      stopLoop();
    }
  },
  { immediate: true },
);

let resizeObs: ResizeObserver | null = null;

onMounted(() => {
  resizeCanvas();
  // 尺寸可由调试台实时改变：clientWidth 变化时重设画布像素缓冲，保持清晰
  resizeObs = new ResizeObserver(() => resizeCanvas());
  if (canvasRef.value) resizeObs.observe(canvasRef.value);
  if (props.active) {
    acquire();
    subscribeFft();
    startLoop();
  }
});

onBeforeUnmount(() => {
  stopLoop();
  release();
  resizeObs?.disconnect();
  resizeObs = null;
  unsubFft?.();
  unsubFft = null;
});
</script>

<template>
  <canvas
    ref="canvasRef"
    class="island-spectrum"
    :style="{ width: props.w + 'px', height: props.h + 'px' }"
  />
</template>

<style scoped>
/* 可见性完全由父层 .di-face 的 clip-path 随液体进度控制（随灵动岛整体进退），
   组件自身不再做 phase 驱动的淡入淡出，避免出现/消失时机与液体不一致。 */
.island-spectrum {
  flex: 0 0 auto;
}
</style>
