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
    renderer.setStaticMode(false);
    renderer.setFlowSpeed(props.flowSpeed);
    renderer.resume();
  } else {
    renderer.setFlowSpeed(0);
    renderer.resume();
  }
};

const BEAT_DT_MAX = 0.05;

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
let lastFftFrame: readonly number[] | null = null;
const createBeatState = () => ({ previousBass: 0, riseFloor: 0, pulse: 0, sinceBeat: 1 });
let beatState = createBeatState();

/** 每帧用低频脉冲驱动流体体积 + 节拍脉冲（驱动着色器节拍扭曲与 60fps） */
const updateLowFreqVolume = (): void => {
  const now = performance.now();
  if (lastSmoothAt === 0) lastSmoothAt = now;
  const dt = Math.min(BEAT_DT_MAX, Math.max(0, (now - lastSmoothAt) / 1e3));
  lastSmoothAt = now;

  const data = getFftFrame();
  if (data && data.length > 0 && data !== lastFftFrame) {
    lastFftFrame = data;
    targetPulse = getBassPulse(data);
  }

  const { attack, decay } = beatTauFromSmoothness(props.beatSmoothness);
  const tau = targetPulse > smoothedPulse ? attack : decay;
  const alpha = 1 - Math.exp(-dt / Math.max(1e-4, tau));
  smoothedPulse += (targetPulse - smoothedPulse) * alpha;
  if (smoothedPulse < 2e-3) smoothedPulse = 0;

  bgRenderRef.value?.setLowFreqVolume(toAmllLowFreqVolume(smoothedPulse, props.beatIntensity));
  const beat = advanceBeatPulse(beatState, targetPulse, dt, props.beatIntensity);
  bgRenderRef.value?.setBeatPulse(beat.pulse);

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
});

onBeforeUnmount(() => {
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
