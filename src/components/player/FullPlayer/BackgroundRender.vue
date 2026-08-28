<script setup lang="ts">
import { ref, shallowRef, onMounted, onBeforeUnmount, watch } from "vue";
import { getFftFrame } from "@/services/playback";
import { acquireFft, releaseFft } from "@/services/fftCapture";
import { getBassPulse, toAmllLowFreqVolume } from "@/services/audioFeatures";
import { advanceBeatPulse } from "@/fluid/beatPulse";
import { MeshGradientRenderer, BackgroundRender2 } from "@/fluid/MeshGradientRenderer";

export interface BackgroundRenderProps {
  album?: string;
  playing?: boolean;
  flowSpeed?: number;
  hasLyric?: boolean;
  fps?: number;
  renderScale?: number;
  enableBeat?: boolean;
  beatIntensity?: number;
  beatSmoothness?: number;
  /** 1.0.2 遗留 prop：1.0.1 渲染器不支持，声明以吸收透传，不产生副作用 */
  enableMultiBand?: boolean;
  noiseStrength?: number;
  layeredCoverStrength?: number;
  enableForeground?: boolean;
  /** 窗口失焦时自动暂停流体动效（渐变衰减） */
  pauseOnBlur?: boolean;
  /** 渲染器类（默认 1.0.1 的 MeshGradientRenderer 流体背景） */
  renderer?: new (canvas: HTMLCanvasElement) => any;
}

const props = withDefaults(defineProps<BackgroundRenderProps>(), {
  playing: true,
  flowSpeed: 2,
  hasLyric: true,
  fps: 30,
  renderScale: 0.5,
  enableBeat: false,
  beatIntensity: 1,
  beatSmoothness: 0.5,
  enableMultiBand: false,
  noiseStrength: 0.03,
  layeredCoverStrength: 0.5,
  enableForeground: true,
  pauseOnBlur: true,
  renderer: () => MeshGradientRenderer,
});

const wrapperRef = ref<HTMLDivElement | null>(null);
const bgRenderRef = shallowRef<any>();

/** 统一同步更新属性状态到底层渲染器 */
const updateRendererState = () => {
  const renderer = bgRenderRef.value;
  if (!renderer) return;

  if (props.album) {
    renderer.setAlbum(props.album, false);
  }
  renderer.setFPS(props.fps);
  renderer.setRenderScale(props.renderScale);
  renderer.setHasLyric(props.hasLyric);
  syncRendererMotion();
};

/** 同步流体背景运动状态 */
const syncRendererMotion = () => {
  const renderer = bgRenderRef.value;
  if (!renderer) return;

  if (props.playing) {
    // 冻结态不得解除 staticMode，否则渲染循环会以速度 0 空转；回焦时统一恢复
    if (!isBlurFrozen()) renderer.setStaticMode(false);
    applyFlowSpeed();
  } else {
    applyFlowSpeed();
  }
  if (!isBlurFrozen()) renderer.resume();
};

const BEAT_DT_MAX = 0.05;

/** 切歌速度脉冲：峰值倍率、峰值保持与非线性回落时长 */
const SURGE_HOLD_MS = 1000;
const SURGE_FALL_MS = 1500;
const SURGE_BOOST = 2.5;

/** 当前切歌脉冲衰减因子（0 = 无脉冲），与播放态解耦：切歌瞬间 playing 抖动不中断脉冲 */
let surgeDecay = 0;
let surgeStart = 0;
let surgeRaf = 0;

const stopSurge = (): void => {
  if (surgeRaf) cancelAnimationFrame(surgeRaf);
  surgeRaf = 0;
  surgeDecay = 0;
};

/* 失焦自动暂停（仅影响背景动效，不触碰 FFT 采集、播放与按键）：
   失焦后常速保持 1s，再用 2s 先快后慢地衰减到速度 0 并进入冻结态
   （flowSpeed=0 + setStaticMode(true)：画面静止但保留事件驱动渲染，
   切歌色板 crossfade 仍可自走）；回焦后反向，从当前衰减值先慢后快用 2s 恢复常速。 */
const BLUR_HOLD_MS = 1000;
const BLUR_FADE_MS = 2000;

/** 失焦衰减因子（1 = 常速，0 = 静止），乘入 flowSpeed */
let blurFactor = 1;
/** 衰减阶段：run 常速 / stop 保持+衰减中 / frozen 已停转 / resume 恢复中 */
type BlurPhase = "run" | "stop" | "frozen" | "resume";
let blurPhase: BlurPhase = "run";
let blurPhaseStart = 0;
let blurResumeFrom = 1;
let blurRaf = 0;

const stopBlurFade = (): void => {
  if (blurRaf) cancelAnimationFrame(blurRaf);
  blurRaf = 0;
};

const blurStep = (): void => {
  blurRaf = 0;
  const renderer = bgRenderRef.value;
  if (!renderer) {
    blurFactor = 1;
    blurPhase = "run";
    return;
  }
  const elapsed = performance.now() - blurPhaseStart;
  if (blurPhase === "stop") {
    if (elapsed < BLUR_HOLD_MS) {
      blurFactor = 1;
    } else if (elapsed < BLUR_HOLD_MS + BLUR_FADE_MS) {
      // 先快后慢：二次缓出衰减到静止
      const p = (elapsed - BLUR_HOLD_MS) / BLUR_FADE_MS;
      blurFactor = (1 - p) * (1 - p);
    } else {
      blurFactor = 0;
    }
    applyFlowSpeed();
    if (blurFactor > 0) {
      blurRaf = requestAnimationFrame(blurStep);
    } else {
      // 衰减完毕：进入冻结态——速度归零 + staticMode，画面静止但保留事件驱动渲染，
      // 失焦中切歌时 setAlbum 的新色板 crossfade 仍可自走，跑完自动停回静态
      blurPhase = "frozen";
      renderer.setStaticMode(true);
    }
  } else if (blurPhase === "resume") {
    // 先慢后快：二次缓入，从回焦瞬间的衰减值恢复到常速
    const p = Math.min(1, elapsed / BLUR_FADE_MS);
    blurFactor = blurResumeFrom + (1 - blurResumeFrom) * p * p;
    applyFlowSpeed();
    if (p < 1) {
      blurRaf = requestAnimationFrame(blurStep);
    } else {
      blurFactor = 1;
      blurPhase = "run";
    }
  }
};

/** 进入失焦态：播放中走「保持 1s + 衰减 2s」；已随播放暂停（speed=0）则直接进入冻结态 */
const enterBlurState = (): void => {
  const renderer = bgRenderRef.value;
  if (!renderer) return;
  if (!props.playing) {
    blurFactor = 0;
    blurPhase = "frozen";
    applyFlowSpeed();
    renderer.setStaticMode(true);
    return;
  }
  stopBlurFade();
  blurPhase = "stop";
  blurPhaseStart = performance.now();
  blurRaf = requestAnimationFrame(blurStep);
};

/** 失焦停转期间渲染器不应被播放态同步重新拉起（后台热键切歌等场景） */
const isBlurFrozen = (): boolean => blurPhase === "frozen";

/** flowSpeed 统一写入出口：基础速度 × 脉冲增益 × 失焦衰减，暂停时归零 */
const applyFlowSpeed = (): void => {
  const speed = props.playing ? props.flowSpeed * (1 + SURGE_BOOST * surgeDecay) * blurFactor : 0;
  bgRenderRef.value?.setFlowSpeed(speed);
};

/**
 * 换曲瞬间流体加速片段：flowSpeed 冲到峰值保持 1.5s 后按二次缓动非线性回落，
 * 色板由 setAlbum 同步切换（加速中变色）
 */
const startSurge = (): void => {
  stopSurge();
  surgeStart = performance.now();
  const step = (): void => {
    if (!bgRenderRef.value) {
      surgeRaf = 0;
      surgeDecay = 0;
      return;
    }
    const elapsed = performance.now() - surgeStart;
    if (elapsed < SURGE_HOLD_MS) {
      surgeDecay = 1;
    } else if (elapsed < SURGE_HOLD_MS + SURGE_FALL_MS) {
      const p = (elapsed - SURGE_HOLD_MS) / SURGE_FALL_MS;
      surgeDecay = (1 - p) * (1 - p);
    } else {
      surgeRaf = 0;
      surgeDecay = 0;
    }
    applyFlowSpeed();
    if (surgeRaf) surgeRaf = requestAnimationFrame(step);
  };
  surgeRaf = requestAnimationFrame(step);
};

const beatTauFromSmoothness = (smoothness: number): { attack: number; decay: number } => {
  const s = Math.min(1, Math.max(0, smoothness));
  return {
    attack: 0.05 + s * 0.18,
    decay: 0.16 + s * 0.44,
  };
};

let targetPulse = 0;
let smoothedPulse = 0;
let lastSmoothAt = 0;
let lastFftFrame: readonly [number[], number[]] | null = null;
const createBeatState = () => ({ previousBass: 0, riseFloor: 0, pulse: 0, sinceBeat: 1 });
let beatState = createBeatState();
/** 脉冲已归零标记：冻结后跳过渲染器写入（setBeatPulse 会 requestTick，避免每帧空唤醒 staticMode） */
let pulseAtRest = false;

/** 每帧用低频脉冲驱动流体体积 + 节拍脉冲（驱动着色器节拍扭曲与 60fps） */
const updateLowFreqVolume = (): void => {
  const now = performance.now();
  if (lastSmoothAt === 0) lastSmoothAt = now;
  const dt = Math.min(BEAT_DT_MAX, Math.max(0, (now - lastSmoothAt) / 1e3));
  lastSmoothAt = now;

  const data = getFftFrame();
  if (data && data[0].length > 0 && data !== lastFftFrame) {
    lastFftFrame = data;
    targetPulse = getBassPulse(data);
  }

  const { attack, decay } = beatTauFromSmoothness(props.beatSmoothness);
  const tau = targetPulse > smoothedPulse ? attack : decay;
  const alpha = 1 - Math.exp(-dt / Math.max(1e-4, tau));
  smoothedPulse += (targetPulse - smoothedPulse) * alpha;
  if (smoothedPulse < 2e-3) smoothedPulse = 0;

  // 脉冲随失焦衰减同步缩放：1s 保持内照常跳动，2s 渐停中平滑衰减，冻结后归零，回焦随缓入恢复
  const lowFreq = toAmllLowFreqVolume(smoothedPulse, props.beatIntensity) * blurFactor;
  const beat = advanceBeatPulse(beatState, targetPulse, dt, props.beatIntensity);
  const beatPulse = beat.pulse * blurFactor;

  const atRest = lowFreq === 0 && beatPulse === 0;
  if (!atRest || !pulseAtRest) {
    bgRenderRef.value?.setLowFreqVolume(lowFreq);
    bgRenderRef.value?.setBeatPulse(beatPulse);
    pulseAtRest = atRest;
  }

  // 暂停衰减结束后停 RAF
  if (!props.playing && smoothedPulse === 0) {
    pauseFftLoop();
    lastSmoothAt = 0;
  }
};

const { resume: resumeFftLoop, pause: pauseFftLoop } = useRafFn(updateLowFreqVolume, {
  immediate: false,
});

let fftAcquired = false;

const startFftCapture = () => {
  if (!fftAcquired) {
    acquireFft();
    fftAcquired = true;
  }
  pulseAtRest = false;
  resumeFftLoop();
};

const stopFftCapture = () => {
  pauseFftLoop();
  if (fftAcquired) {
    releaseFft();
    fftAcquired = false;
  }
};

const syncFftCapture = (): void => {
  if (!props.enableBeat) {
    stopFftCapture();
    targetPulse = 0;
    smoothedPulse = 0;
    lastSmoothAt = 0;
    lastFftFrame = null;
    beatState = createBeatState();
    bgRenderRef.value?.setLowFreqVolume(1);
    bgRenderRef.value?.setBeatPulse(0);
    pulseAtRest = false;
    return;
  }

  if (props.playing) {
    startFftCapture();
    return;
  }

  targetPulse = 0;
  lastFftFrame = null;
  if (fftAcquired) {
    releaseFft();
    fftAcquired = false;
  }
  if (smoothedPulse > 2e-3) {
    resumeFftLoop();
  } else {
    pauseFftLoop();
    lastSmoothAt = 0;
    bgRenderRef.value?.setLowFreqVolume(1);
    beatState = createBeatState();
    bgRenderRef.value?.setBeatPulse(0);
    pulseAtRest = false;
  }
};

onMounted(() => {
  if (!wrapperRef.value) return;

  bgRenderRef.value = BackgroundRender2.new(props.renderer);
  const el = bgRenderRef.value.getElement();
  el.style.width = "100%";
  el.style.height = "100%";
  el.style.display = "block";
  wrapperRef.value.appendChild(el);

  updateRendererState();
  syncFftCapture();

  // 挂载时窗口已失焦：直接进入衰减流程
  if (!windowFocused.value && props.pauseOnBlur) enterBlurState();
});

onBeforeUnmount(() => {
  stopSurge();
  stopBlurFade();
  stopFftCapture();
  const renderer = bgRenderRef.value;
  if (renderer) {
    renderer.setBeatPulse(0);
    renderer.pause();
    renderer.dispose();
    bgRenderRef.value = undefined;
  }
});

watch(
  () => props.album,
  (val) => {
    if (val && bgRenderRef.value) {
      const renderer = bgRenderRef.value;
      const wasFrozen = isBlurFrozen();
      Promise.resolve(renderer.setAlbum(val, false)).then(() => {
        // 冻结态（失焦 staticMode）下补一次 tick：MeshGradientRenderer 的 setAlbum
        // 末尾自带 requestTick，Enhanced 版没有；补一次保证色板 crossfade 自走后停回静态。
        // 双重检查：若期间已回焦（isBlurFrozen() 为 false）则由回焦路径恢复，无需处理
        if (wasFrozen && isBlurFrozen()) renderer.setStaticMode(true);
      });
      startSurge();
    }
  },
);

watch(
  () => props.playing,
  () => {
    syncRendererMotion();
    syncFftCapture();
  },
);

// 窗口焦点：失焦进入衰减流程，回焦从当前衰减值反向恢复
const windowFocused = useWindowFocus();
watch(windowFocused, (focused) => {
  stopBlurFade();
  const renderer = bgRenderRef.value;
  if (!renderer) return;
  if (focused) {
    if (blurPhase === "run") return;
    blurResumeFrom = blurFactor;
    blurPhase = "resume";
    blurPhaseStart = performance.now();
    renderer.setStaticMode(false);
    renderer.resume();
    blurRaf = requestAnimationFrame(blurStep);
  } else if (props.pauseOnBlur) {
    enterBlurState();
  }
});

watch(
  () => props.pauseOnBlur,
  (enabled) => {
    if (enabled) {
      if (!windowFocused.value) enterBlurState();
    } else {
      // 用户选择动效常驻：终止进行中的衰减并恢复常速
      stopBlurFade();
      blurFactor = 1;
      blurPhase = "run";
      bgRenderRef.value?.setStaticMode(false);
      bgRenderRef.value?.resume();
      applyFlowSpeed();
    }
  },
);

watch(
  () => props.enableBeat,
  () => syncFftCapture(),
);

watch(
  () => props.fps,
  (val) => {
    bgRenderRef.value?.setFPS(val);
  },
);

watch(
  () => props.flowSpeed,
  () => {
    applyFlowSpeed();
  },
);

watch(
  () => props.renderScale,
  (val) => {
    bgRenderRef.value?.setRenderScale(val);
  },
);

watch(
  () => props.hasLyric,
  (val) => {
    bgRenderRef.value?.setHasLyric(val);
  },
);

defineExpose({
  bgRender: bgRenderRef,
  wrapperEl: wrapperRef,
});
</script>

<template>
  <div ref="wrapperRef" class="background-render-wrapper" aria-hidden="true" />
</template>

<style scoped>
.background-render-wrapper {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  z-index: 0;
  pointer-events: none;
}
</style>
