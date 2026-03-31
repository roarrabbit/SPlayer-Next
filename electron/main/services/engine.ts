import { loadNativeModule } from "../utils/nativeLoader";
import { coverCacheDir, isDev } from "../utils/config";
import { playerLog, nativeLogsDir } from "../utils/logger";

type AudioEngineModule = typeof import("@splayer/audio-engine");

let audioEngine: AudioEngineModule | null = null;
let playerInstance: InstanceType<AudioEngineModule["AudioPlayer"]> | null = null;

/** 获取原生音频引擎模块 */
export const getEngine = (): AudioEngineModule => {
  if (!audioEngine) {
    audioEngine = loadNativeModule<AudioEngineModule>("audio-engine.node", "audio-engine");
    if (!audioEngine) {
      throw new Error("Failed to load audio-engine.node");
    }
    // 初始化原生日志系统
    audioEngine.initLogger(nativeLogsDir, isDev);
  }
  return audioEngine;
};

/** 获取播放器实例（首次创建时设置封面缓存目录） */
export const getPlayer = (
  onCreated?: (inst: InstanceType<AudioEngineModule["AudioPlayer"]>) => void,
): InstanceType<AudioEngineModule["AudioPlayer"]> => {
  if (!playerInstance) {
    const mod = getEngine();
    playerInstance = new mod.AudioPlayer();
    playerInstance.setCoverCacheDir(coverCacheDir);
    onCreated?.(playerInstance);
    playerLog.info("播放器实例已创建");
  }
  return playerInstance;
};

/** 销毁播放器实例，下次调用 getPlayer() 时自动重建 */
export const resetPlayer = (): void => {
  playerLog.warn("销毁播放器实例，将在下次操作时重建");
  playerInstance = null;
};
