<script setup lang="ts">
import {
  type AbstractBaseRenderer,
  type BaseRenderer,
  BackgroundRender as CoreBackgroundRender,
  MeshGradientRenderer,
} from "@applemusic-like-lyrics/core";
import { getFftFrame } from "@/services/playback";
import { acquireFft, releaseFft } from "@/services/fftCapture";
import { getBassPulse, toAmllLowFreqVolume } from "@/services/audioFeatures";

export interface BackgroundRenderProps {
  /** 专辑封面资源 URL */
  album?: string;
  /** 是否处于播放状态，默认为 true */
  playing?: boolean;
  /** 动画流动速度，默认为 2 */
  flowSpeed?: number;
  /** 是否有歌词，默认为 true */
  hasLyric?: boolean;
  /** 帧率，默认为 30 */
  fps?: number;
  /** 渲染缩放比例，默认为 0.5 */
  renderScale?: number;
  /** 是否随低频节拍脉动（默认 false，关闭则不采集 FFT） */
  enableBeat?: boolean;
  /** 跳动强度倍率，1 为默认 */
  beatIntensity?: number;
  /** 跳动平滑度 0..1，越大过渡越柔 */
  beatSmoothness?: number;
  /** 渲染器类，默认为 MeshGradientRenderer */
  renderer?: new (...args: ConstructorParameters<typeof BaseRenderer>) => BaseRenderer;
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
  renderer: () => MeshGradientRenderer,
});

const wrapperRef = ref<HTMLDivElement | null>(null);

// 外部渲染器实例引用
const bgRenderRef = shallowRef<AbstractBaseRenderer>();

/**
 * 统一同步更新属性状态到底层渲染器
 */
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

/**
 * 同步流体背景运动状态
 */
const syncRendererMotion = () => {
  const renderer = bgRenderRef.value;
  if (!renderer) return;

  if (props.playing) {
    renderer.setStaticMode(false);
    renderer.setFlowSpeed(props.flowSpeed);
    renderer.resume();
  } else {
    renderer.setFlowSpeed(0);
    renderer.resume();
  }
};

/** 单帧 dt 上限，防止切后台后一帧跳变 */
const BEAT_DT_MAX = 0.05;

/**
 * 由平滑度得到上升/回落时间常数（秒）
 * smoothness=0.5 时约为 0.14 / 0.38（默认观感）
 * @param smoothness - 0..1
 */
const beatTauFromSmoothness = (smoothness: number): { attack: number; decay: number } => {
  const s = Math.min(1, Math.max(0, smoothness));
  return {
    attack: 0.05 + s * 0.18,
    decay: 0.16 + s * 0.44,
  };
};

// 目标脉冲（仅在 FFT 新帧时更新）与显示脉冲（每帧时间常数逼近）
let targetPulse = 0;
let smoothedPulse = 0;
let lastSmoothAt = 0;
let lastFftFrame: readonly number[] | null = null;

/**
 * 每帧更新低频音量：FFT 只改目标，显示值用时间常数连续平滑
 * 即使 native 只按 ~50ms 推频谱，节拍仍是过渡感而不是阶跃
 */
const updateLowFreqVolume = (): void => {
  const now = performance.now();
  if (lastSmoothAt === 0) lastSmoothAt = now;
  const dt = Math.min(BEAT_DT_MAX, Math.max(0, (now - lastSmoothAt) / 1000));
  lastSmoothAt = now;

  const data = getFftFrame();
  if (data && data.length > 0 && data !== lastFftFrame) {
    lastFftFrame = data;
    targetPulse = getBassPulse(data);
  }

  // exp 平滑：tau 越小越贴目标；上升快、回落慢；由设置「跳动平滑」控制
  const { attack, decay } = beatTauFromSmoothness(props.beatSmoothness);
  const tau = targetPulse > smoothedPulse ? attack : decay;
  const alpha = 1 - Math.exp(-dt / Math.max(1e-4, tau));
  smoothedPulse += (targetPulse - smoothedPulse) * alpha;
  if (smoothedPulse < 0.002) smoothedPulse = 0;

  bgRenderRef.value?.setLowFreqVolume(
    toAmllLowFreqVolume(smoothedPulse, props.beatIntensity),
  );

  // 暂停衰减结束后停 RAF，避免空转
  if (!props.playing && smoothedPulse === 0) {
    pauseFftLoop();
    lastSmoothAt = 0;
  }
};

const { resume: resumeFftLoop, pause: pauseFftLoop } = useRafFn(updateLowFreqVolume, {
  immediate: false,
});

// 本地持有标记，保证 acquire / release 严格配对
let fftAcquired = false;

/**
 * 开始捕获 FFT 频谱数据
 */
const startFftCapture = () => {
  if (!fftAcquired) {
    acquireFft();
    fftAcquired = true;
  }
  resumeFftLoop();
};

/**
 * 停止捕获 FFT 频谱数据
 */
const stopFftCapture = () => {
  pauseFftLoop();
  if (fftAcquired) {
    releaseFft();
    fftAcquired = false;
  }
};

/**
 * 按播放状态与跳动开关同步 FFT 采集 / 节拍平滑
 * - 播放且开启跳动：采 FFT + 每帧平滑
 * - 暂停仍开跳动：停 FFT，目标归零，RAF 继续让显示值回落（避免定格在最后一拍）
 * - 关闭跳动：立即复位
 */
const syncFftCapture = (): void => {
  if (!props.enableBeat) {
    stopFftCapture();
    targetPulse = 0;
    smoothedPulse = 0;
    lastSmoothAt = 0;
    lastFftFrame = null;
    bgRenderRef.value?.setLowFreqVolume(1.0);
    return;
  }

  if (props.playing) {
    startFftCapture();
    return;
  }

  // 暂停：不再推新频谱，但继续平滑衰减
  targetPulse = 0;
  lastFftFrame = null;
  if (fftAcquired) {
    releaseFft();
    fftAcquired = false;
  }
  if (smoothedPulse > 0.002) {
    resumeFftLoop();
  } else {
    pauseFftLoop();
    lastSmoothAt = 0;
    bgRenderRef.value?.setLowFreqVolume(1.0);
  }
};

onMounted(() => {
  if (!wrapperRef.value) return;

  // 初始化 AMLL 底层渲染器
  bgRenderRef.value = CoreBackgroundRender.new(props.renderer);

  // 设置 Canvas 自适应容器并附着 DOM
  const el = bgRenderRef.value.getElement();
  el.style.width = "100%";
  el.style.height = "100%";
  el.style.display = "block";
  wrapperRef.value.appendChild(el);

  updateRendererState();
  syncFftCapture();
});

onBeforeUnmount(() => {
  stopFftCapture();

  const renderer = bgRenderRef.value;
  if (renderer) {
    // 同步释放底层 Canvas 与 WebGL 上下文，避免上下文泄漏
    renderer.pause();
    renderer.dispose();
    bgRenderRef.value = undefined;
  }
});

// 属性变化监听
watch(
  () => props.album,
  (val) => {
    if (val && bgRenderRef.value) {
      bgRenderRef.value.setAlbum(val, false);
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
  (val) => {
    if (props.playing) bgRenderRef.value?.setFlowSpeed(val);
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
