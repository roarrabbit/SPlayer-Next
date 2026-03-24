import { BrowserWindow, nativeImage, nativeTheme, ThumbarButton } from "electron";
import { join } from "path";
import { playerPlay, playerPause } from "../ipc/player";
import { broadcast } from "../utils/broadcast";

export interface Thumbar {
  clearThumbar(): void;
  updateThumbar(playing: boolean): void;
}

// 缩略图单例
let thumbar: Thumbar | null = null;

// 工具栏图标
const thumbarIcon = (filename: string) => {
  const isDark = nativeTheme.shouldUseDarkColors;
  return nativeImage.createFromPath(
    join(__dirname, `../../public/icons/thumbar/${filename}-${isDark ? "dark" : "light"}.png`),
  );
};

// 创建缩略图工具栏
class ThumbarImpl implements Thumbar {
  private win: BrowserWindow;
  private prev: ThumbarButton;
  private next: ThumbarButton;
  private play: ThumbarButton;
  private pause: ThumbarButton;
  private isPlaying: boolean = false;

  constructor(win: BrowserWindow) {
    this.win = win;
    this.prev = { tooltip: "上一曲", icon: thumbarIcon("prev"), click: () => broadcast("player:event", { type: "prev" }) };
    this.next = { tooltip: "下一曲", icon: thumbarIcon("next"), click: () => broadcast("player:event", { type: "next" }) };
    this.play = { tooltip: "播放", icon: thumbarIcon("play"), click: () => playerPlay() };
    this.pause = { tooltip: "暂停", icon: thumbarIcon("pause"), click: () => playerPause() };
    // 初始化工具栏
    this.updateThumbar(false);
    // 监听主题变化，仅更新图标
    nativeTheme.on("updated", () => {
      this.prev.icon = thumbarIcon("prev");
      this.next.icon = thumbarIcon("next");
      this.play.icon = thumbarIcon("play");
      this.pause.icon = thumbarIcon("pause");
      this.updateThumbar(this.isPlaying);
    });
  }

  // 更新工具栏
  updateThumbar(playing: boolean): void {
    this.isPlaying = playing;
    this.win.setThumbarButtons([this.prev, playing ? this.pause : this.play, this.next]);
  }

  // 清除工具栏
  clearThumbar(): void {
    this.win.setThumbarButtons([]);
  }
}

/**
 * 初始化缩略图工具栏（仅 Windows）
 */
export const initThumbar = (win: BrowserWindow): Thumbar | null => {
  if (process.platform !== "win32") return null;
  try {
    console.log("[Thumbar] 初始化缩略图工具栏");
    thumbar = new ThumbarImpl(win);
    return thumbar;
  } catch (error) {
    console.error("[Thumbar] 初始化失败:", error);
    return null;
  }
};

/**
 * 获取缩略图工具栏实例
 */
export const getThumbar = (): Thumbar | null => thumbar;
