import { storeToRefs } from "pinia";
import { onMounted, onUnmounted } from "vue";
import { usePlayerStore } from "@/stores/player";

/**
 * 播放器 composable
 */
export const usePlayer = () => {
  const store = usePlayerStore();

  const {
    state,
    position,
    duration,
    volume,
    metadata,
    fftData,
    error,
    currentSource,
    isPlaying,
    isPaused,
    progress,
  } = storeToRefs(store);

  onMounted(() => {
    store.init();
  });

  onUnmounted(() => {
    store.dispose();
  });

  return {
    // 响应式状态
    state,
    position,
    duration,
    volume,
    metadata,
    fftData,
    error,
    currentSource,
    isPlaying,
    isPaused,
    progress,
    // 操作
    /** 加载音频源（本地路径或网络地址） */
    load: store.load,
    /** 恢复播放 */
    play: store.play,
    /** 暂停播放 */
    pause: store.pause,
    /** 停止播放 */
    stop: store.stop,
    /** 跳转到指定位置（秒） */
    seek: store.seek,
    /** 设置音量（0.0 ~ 1.0） */
    setVolume: store.setVolume,
  };
};
