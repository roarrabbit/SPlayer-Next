import { ipcMain, dialog } from "electron";
import { loadNativeModule } from "../utils/nativeLoader";
import { coverCacheDir } from "../core/index";
import { broadcast } from "../utils/broadcast";
import { toCoverUrl } from "../utils/protocol";
import { mediaService } from "../services/media";
import type { MediaEvent } from "../services/media";

type AudioEngineModule = typeof import("@splayer/audio-engine");

let audioEngine: AudioEngineModule | null = null;
let playerInstance: InstanceType<AudioEngineModule["AudioPlayer"]> | null = null;
let positionTimer: ReturnType<typeof setInterval> | null = null;

/** 上一次推送给系统媒体控件的状态，用于避免重复发送 */
let lastMediaState: string | null = null;

/** 获取原生音频引擎模块 */
const engine = (): AudioEngineModule => {
  if (!audioEngine) {
    audioEngine = loadNativeModule<AudioEngineModule>("audio-engine.node", "audio-engine");
    if (!audioEngine) {
      throw new Error("[Player] Failed to load audio-engine.node");
    }
  }
  return audioEngine;
};

/** 
 * 获取播放器实例
 * 仅在首次创建时设置封面缓存目录
 */
const player = (): InstanceType<AudioEngineModule["AudioPlayer"]> => {
  if (!playerInstance) {
    const mod = engine();
    playerInstance = new mod.AudioPlayer();
    playerInstance.setCoverCacheDir(coverCacheDir);
  }
  return playerInstance;
};

/** 启动播放状态推送 */
const startPositionPush = (): void => {
  stopPositionPush();
  positionTimer = setInterval(() => {
    const status = player().getStatus();
    broadcast("player:event", { type: "status", data: status });

    // 同步进度到系统媒体控件
    mediaService.setTimeline({
      currentMs: status.position * 1000,
      totalMs: status.duration * 1000,
    });

    // 状态变化时同步到系统媒体控件
    if (status.state !== lastMediaState) {
      lastMediaState = status.state;
      if (status.state === "playing") {
        mediaService.setPlayState({ status: "Playing" });
      } else if (status.state === "paused") {
        mediaService.setPlayState({ status: "Paused" });
      }
    }

    // 自动检测播放结束
    if (status.isFinished && status.state === "playing") {
      lastMediaState = "stopped";
      broadcast("player:event", { type: "ended" });
      mediaService.setPlayState({ status: "Paused" });
      stopPositionPush();
    }
  }, 33);
};

/** 停止播放状态推送 */
const stopPositionPush = (): void => {
  if (positionTimer !== null) {
    clearInterval(positionTimer);
    positionTimer = null;
  }
};

/** 注册播放器相关的所有 IPC 事件 */
export const registerPlayerIpc = (): void => {
  // 加载音频文件，返回完整元信息（含封面和歌词），只打开一次 FFmpeg
  ipcMain.handle("player:load", (_event, source: string) => {
    try {
      const inst = player();
      const metadata = inst.load(source);

      // 向系统媒体控件发送元数据
      const coverRaw = inst.getCoverRaw();
      mediaService.setMetadata({
        title: metadata.title ?? "",
        artist: metadata.artist ?? "",
        album: metadata.album ?? "",
        coverData: coverRaw ? Buffer.from(coverRaw) : undefined,
        durationMs: metadata.duration * 1000,
      });
      lastMediaState = "playing";
      mediaService.setPlayState({ status: "Playing" });

      // 封面磁盘路径 → cover:// 协议 URL
      metadata.cover = toCoverUrl(metadata.cover);
      startPositionPush();
      return { success: true, data: metadata };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  // 恢复播放
  ipcMain.handle("player:play", () => {
    try {
      player().play();
      mediaService.setPlayState({ status: "Playing" });
      lastMediaState = "playing";
      startPositionPush();
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  // 暂停播放
  ipcMain.handle("player:pause", () => {
    try {
      player().pause();
      mediaService.setPlayState({ status: "Paused" });
      lastMediaState = "paused";
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  // 停止播放并释放资源
  ipcMain.handle("player:stop", () => {
    try {
      player().stop();
      mediaService.setPlayState({ status: "Paused" });
      lastMediaState = "stopped";
      stopPositionPush();
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  // 跳转到指定播放位置（秒）
  ipcMain.handle("player:seek", (_event, position: number) => {
    try {
      player().seek(position);
      mediaService.setTimeline({
        currentMs: position * 1000,
        totalMs: player().getDuration() * 1000,
        seeked: true,
      });
      startPositionPush();
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  // 设置音量（0.0 ~ 1.0）
  ipcMain.handle("player:setVolume", (_event, volume: number) => {
    try {
      player().setVolume(volume);
      mediaService.setVolume(volume);
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  // 获取当前音量
  ipcMain.handle("player:getVolume", () => {
    return { success: true, data: player().getVolume() };
  });

  // 设置暂停/恢复时的渐变时长（毫秒），0 表示禁用
  ipcMain.handle("player:setFadeDuration", (_event, durationMs: number) => {
    try {
      player().setFadeDuration(durationMs);
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  // 获取当前渐变时长（毫秒）
  ipcMain.handle("player:getFadeDuration", () => {
    return { success: true, data: player().getFadeDuration() };
  });

  // 获取当前播放状态快照
  ipcMain.handle("player:getStatus", () => {
    return { success: true, data: player().getStatus() };
  });

  // 获取 FFT 频谱数据（128 个频段，值域 0.0 ~ 1.0）
  ipcMain.handle("player:getFftData", () => {
    return { success: true, data: player().getFftData() };
  });

  // 打开文件选择对话框，返回用户选中的音频文件路径
  ipcMain.handle("player:openFile", async () => {
    const result = await dialog.showOpenDialog({
      title: "选择音频文件",
      filters: [
        {
          name: "音频文件",
          extensions: ["mp3", "flac", "wav", "ogg", "aac", "m4a", "wma", "opus", "ape"],
        },
        { name: "所有文件", extensions: ["*"] },
      ],
      properties: ["openFile"],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, error: "未选择文件" };
    }
    return { success: true, data: result.filePaths[0] };
  });

  // 注册系统媒体事件处理（系统按键 → 控制播放器）
  mediaService.onEvent((event: MediaEvent) => {
    try {
      const inst = player();
      switch (event.type) {
        case "Play":
          inst.play();
          lastMediaState = "playing";
          mediaService.setPlayState({ status: "Playing" });
          startPositionPush();
          break;
        case "Pause":
          inst.pause();
          lastMediaState = "paused";
          mediaService.setPlayState({ status: "Paused" });
          break;
        case "Stop":
          inst.stop();
          lastMediaState = "stopped";
          mediaService.setPlayState({ status: "Paused" });
          stopPositionPush();
          break;
        case "Seek":
          if (event.positionMs != null) {
            inst.seek(event.positionMs / 1000);
            mediaService.setTimeline({
              currentMs: event.positionMs,
              totalMs: inst.getDuration() * 1000,
              seeked: true,
            });
            startPositionPush();
          }
          break;
        case "SetVolume":
          if (event.volume != null) {
            inst.setVolume(event.volume);
          }
          break;
        // NextTrack / PrevTrack 等需要播放列表支持，后续实现
      }
    } catch {}
  });
};
