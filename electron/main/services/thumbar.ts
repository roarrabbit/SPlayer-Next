import { BrowserWindow, nativeTheme, ThumbarButton } from "electron";
import { broadcast } from "../utils/broadcast";
import { loadThemedIcon } from "../utils/icon";
import { thumbarLog } from "../utils/logger";

export interface Thumbar {
  clearThumbar(): void;
  updateThumbar(playing: boolean): void;
}

let thumbar: Thumbar | null = null;

const thumbarIcon = (name: string) => loadThemedIcon("thumbar", name);

// 创建缩略图工具栏
class ThumbarImpl implements Thumbar {
  private win: BrowserWindow;
  private prev: ThumbarButton;
  private next: ThumbarButton;
  private play: ThumbarButton;
  private pause: ThumbarButton;
  private isPlaying: boolean = false;
  private onThemeUpdated: () => void;

  constructor(win: BrowserWindow) {
    this.win = win;
    this.prev = {
      tooltip: "上一曲",
      icon: thumbarIcon("prev"),
      click: () => broadcast("player:event", { type: "prev" }),
    };
    this.next = {
      tooltip: "下一曲",
      icon: thumbarIcon("next"),
      click: () => broadcast("player:event", { type: "next" }),
    };
    this.play = {
      tooltip: "播放",
      icon: thumbarIcon("play"),
      click: () => broadcast("player:event", { type: "play" }),
    };
    this.pause = {
      tooltip: "暂停",
      icon: thumbarIcon("pause"),
      click: () => broadcast("player:event", { type: "pause" }),
    };
    // 初始化工具栏
    this.updateThumbar(false);
    // 监听主题变化，仅更新图标
    this.onThemeUpdated = () => {
      this.prev.icon = thumbarIcon("prev");
      this.next.icon = thumbarIcon("next");
      this.play.icon = thumbarIcon("play");
      this.pause.icon = thumbarIcon("pause");
      this.updateThumbar(this.isPlaying);
    };
    nativeTheme.on("updated", this.onThemeUpdated);
    // 窗口销毁时移除监听
    win.on("closed", () => {
      nativeTheme.removeListener("updated", this.onThemeUpdated);
    });
  }

  // 更新工具栏
  updateThumbar(playing: boolean): void {
    if (this.win.isDestroyed()) return;
    this.isPlaying = playing;
    this.win.setThumbarButtons([this.prev, playing ? this.pause : this.play, this.next]);
  }

  // 清除工具栏
  clearThumbar(): void {
    if (this.win.isDestroyed()) return;
    this.win.setThumbarButtons([]);
  }
}

/**
 * 初始化缩略图工具栏（仅 Windows）
 */
export const initThumbar = (win: BrowserWindow): Thumbar | null => {
  if (process.platform !== "win32") return null;
  try {
    thumbarLog.info("初始化缩略图工具栏");
    thumbar = new ThumbarImpl(win);
    return thumbar;
  } catch (error) {
    thumbarLog.error("初始化失败:", error);
    return null;
  }
};

/**
 * 获取缩略图工具栏实例
 */
export const getThumbar = (): Thumbar | null => thumbar;
