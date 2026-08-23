<script setup lang="ts">
// 灵动岛右侧实时频谱：6 根柱（中间向上下对称），由主进程推送的 128 段 FFT 驱动。
// 颜色取自封面主色（由父组件传入）。
// 播放时申请 FFT 推送（主进程跨窗口引用计数），暂停/卸载时释放。
import { mixWithWhite, DEFAULT_PALETTE } from "../composables/useCoverColor";

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
/** 极低频噪声多，跳过前 8 段 */
const SKIP_LOW = 8;
const BAR_RADIUS = 1.5;
/** 后端推送间隔（ms），用于时间插值 */
const PUSH_INTERVAL = 50;
// —— 频谱感知映射与动态响应参数（仅影响数据→高度链路，不改 UI/颜色/圆角/尺寸）——
const COMPRESS_K = 2.2; // 感知动态范围压缩增益：1 - exp(-K*x)
const ATTACK_TAU = 0.045; // 上升时间常数 ~45ms（快但不瞬跳）
const RELEASE_TAU = 0.19; // 下降时间常数 ~190ms（平滑回落）
const RELEASE_TAU_FAST = 0.07; // 接近静音时更快回落，避免悬停
const SILENCE_FLOOR = 0.02; // 判定为静音的阈值
const NEIGHBOR_SMOOTH = 0.12; // 相邻频段极轻平滑（须足够低，避免 5 柱同步）

/** 上一帧推送 */
const prev = new Float32Array(FFT_SIZE);
/** 当前帧推送 */
const curr = new Float32Array(FFT_SIZE);
/** 实际渲染显示值（经过 attack/decay 包络平滑），长度随柱数变化 */
let display = new Float32Array(props.barCount);
/** 每频段 RMS 压缩后能量（每帧重算） */
let bandEnergies = new Float32Array(props.barCount);
/** 邻域平滑后的目标值（每帧重算） */
let bandTargets = new Float32Array(props.barCount);
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
  // 感知频段分组：在频率轴（bin 索引 ∝ 频率）上做对数划分，
  // 低频分得细、高频分得宽。5 根柱分别覆盖
  // Sub-Bass/Bass → Low-Mid → Mid → High-Mid → High。
  const lo = SKIP_LOW;
  const hi = FFT_SIZE;
  const logLo = Math.log(lo);
  const logHi = Math.log(hi);
  bandEdges = [];
  for (let i = 0; i < n; i++) {
    const s = Math.round(Math.exp(logLo + (logHi - logLo) * (i / n)));
    const e = Math.round(Math.exp(logLo + (logHi - logLo) * ((i + 1) / n)));
    bandEdges.push({ start: Math.max(lo, s), end: Math.max(s + 1, e) });
  }
  if (display.length !== n) {
    display = new Float32Array(n);
    bandEnergies = new Float32Array(n);
    bandTargets = new Float32Array(n);
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
  unsubFft = window.api.dynamicIsland.onFftData((data: number[]) => {
    prev.set(curr);
    for (let i = 0; i < FFT_SIZE; i++) curr[i] = data[i] ?? 0;
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
  // 1. 每频段 RMS 能量（频域线性插值 + 能量聚合，替代简单算术平均）
  for (let i = 0; i < n; i++) {
    const { start, end } = bandEdges[i];
    let sumSq = 0;
    let cnt = 0;
    for (let j = start; j < end; j++) {
      const v = prev[j] + (curr[j] - prev[j]) * t;
      sumSq += v * v;
      cnt++;
    }
    const rms = cnt > 0 ? Math.sqrt(sumSq / cnt) : 0;
    // 感知动态范围压缩：弱信号抬升可见、强瞬态不顶满
    bandEnergies[i] = 1 - Math.exp(-COMPRESS_K * rms);
  }
  // 2. 极轻邻域平滑，让整体更连续但不致 5 柱完全同步
  for (let i = 0; i < n; i++) {
    const left = bandEnergies[Math.max(0, i - 1)];
    const right = bandEnergies[Math.min(n - 1, i + 1)];
    bandTargets[i] =
      bandEnergies[i] * (1 - NEIGHBOR_SMOOTH) + (left + right) * 0.5 * NEIGHBOR_SMOOTH;
  }
  // 3. 帧率无关的非对称 attack / release 包络平滑
  for (let i = 0; i < n; i++) {
    const target = bandTargets[i];
    let tau = RELEASE_TAU;
    if (target > display[i]) tau = ATTACK_TAU;
    else if (target < SILENCE_FLOOR) tau = RELEASE_TAU_FAST;
    const coef = 1 - Math.exp(-dt / tau);
    display[i] += (target - display[i]) * coef;
    if (display[i] < 0) display[i] = 0;
  }

  // 4. 绘制（圆角 / 颜色 / 尺寸 / 布局保持原样，仅使用压缩后的高度）
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
    const halfH = Math.max(1, Math.min(maxHalf, v * maxHalf * 1.3));
    const x = i * slot + gap / 2;
    const topY = centerY - halfH;
    const barH = halfH * 2;

    // 动态高度高亮：振幅爆表（v>0.7）时按超出量掺白（最多 0.6），
    // 仅作用于柱子顶部色，产生高亮/发光瞬间（动感翻倍）
    let topColor = props.colors.primary;
    let bottomColor = props.colors.secondary;
    if (v > 0.7) {
      const whiteRatio = Math.min(0.6, (v - 0.7) * 2);
      topColor = mixWithWhite(topColor, whiteRatio);
      bottomColor = mixWithWhite(bottomColor, whiteRatio * 0.5);
    }

    // 每根柱子：底部 secondary → 顶部 primary 的垂直渐变（圆角矩形）
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
  // 归零，下次启动从静默开始
  display.fill(0);
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
