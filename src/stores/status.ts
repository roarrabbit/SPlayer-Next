import type { PlayerState, AudioDevice } from "@shared/types/player";
import * as queue from "./queue";

/** 循环模式 */
export type RepeatMode = "off" | "list" | "one";

/** 随机模式 */
export type ShuffleMode = "off" | "on";

export const useStatusStore = defineStore("status", () => {
  // ── 播放器状态 ──

  const state = ref<PlayerState>("idle");
  const position = ref(0);
  const duration = ref(0);
  const volume = ref(1);
  const fftData = shallowRef<number[]>([]);
  const error = ref<string | null>(null);
  const currentSource = ref<string | null>(null);
  const outputDevices = ref<AudioDevice[]>([]);
  const selectedDeviceName = ref<string | null>(null);
  const isExpanded = ref(false);

  // ── 播放控制状态 ──

  const playIndex = ref(-1);
  const repeatMode = ref<RepeatMode>("list");
  const shuffleMode = ref<ShuffleMode>("off");

  // ── 计算属性 ──

  const isPlaying = computed(() => state.value === "playing");
  const isPaused = computed(() => state.value === "paused");
  const isLoading = computed(() => state.value === "loading");
  const progress = computed(() => (duration.value > 0 ? position.value / duration.value : 0));
  const currentTrack = computed(() => queue.getTrack(playIndex.value));

  return {
    state,
    position,
    duration,
    volume,
    fftData,
    error,
    currentSource,
    isPlaying,
    isPaused,
    isLoading,
    progress,
    isExpanded,
    outputDevices,
    selectedDeviceName,
    playIndex,
    repeatMode,
    shuffleMode,
    currentTrack,
  };
});
