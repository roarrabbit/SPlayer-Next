import { BrowserWindow, nativeImage, nativeTheme, ThumbarButton } from "electron";
import { join } from "path";

enum ThumbarKeys {
  Play = "play",
  Pause = "pause",
  Prev = "prev",
  Next = "next",
}

type ThumbarMap = Map<ThumbarKeys, ThumbarButton>;

export interface Thumbar {
  clearThumbar(): void;
  updateThumbar(playing: boolean, clean?: boolean): void;
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

// 缩略图工具栏按钮
const createThumbarButtons = (
  onPlay: () => void,
  onPause: () => void,
  onPrev: () => void,
  onNext: () => void,
): ThumbarMap => {
  return new Map<ThumbarKeys, ThumbarButton>()
    .set(ThumbarKeys.Prev, {
      tooltip: "上一曲",
      icon: thumbarIcon("prev"),
      click: onPrev,
    })
    .set(ThumbarKeys.Next, {
      tooltip: "下一曲",
      icon: thumbarIcon("next"),
      click: onNext,
    })
    .set(ThumbarKeys.Play, {
      tooltip: "播放",
      icon: thumbarIcon("play"),
      click: onPlay,
    })
    .set(ThumbarKeys.Pause, {
      tooltip: "暂停",
      icon: thumbarIcon("pause"),
      click: onPause,
    });
};

// 创建缩略图工具栏
class ThumbarImpl implements Thumbar {
  private _win: BrowserWindow;
  private _thumbar: ThumbarMap;
  private _prev: ThumbarButton;
  private _next: ThumbarButton;
  private _play: ThumbarButton;
  private _pause: ThumbarButton;
  private _isPlaying: boolean = false;
  private _onPlay: () => void;
  private _onPause: () => void;
  private _onPrev: () => void;
  private _onNext: () => void;

  constructor(
    win: BrowserWindow,
    onPlay: () => void,
    onPause: () => void,
    onPrev: () => void,
    onNext: () => void,
  ) {
    this._win = win;
    this._onPlay = onPlay;
    this._onPause = onPause;
    this._onPrev = onPrev;
    this._onNext = onNext;
    this._thumbar = createThumbarButtons(onPlay, onPause, onPrev, onNext);
    this._play = this._thumbar.get(ThumbarKeys.Play)!;
    this._pause = this._thumbar.get(ThumbarKeys.Pause)!;
    this._prev = this._thumbar.get(ThumbarKeys.Prev)!;
    this._next = this._thumbar.get(ThumbarKeys.Next)!;
    // 初始化工具栏
    this.updateThumbar();
    // 监听主题变化
    nativeTheme.on("updated", () => {
      this.refreshThumbarButtons();
    });
  }

  // 刷新工具栏按钮（主题变化时）
  private refreshThumbarButtons(): void {
    this._thumbar = createThumbarButtons(
      this._onPlay,
      this._onPause,
      this._onPrev,
      this._onNext,
    );
    this._play = this._thumbar.get(ThumbarKeys.Play)!;
    this._pause = this._thumbar.get(ThumbarKeys.Pause)!;
    this._prev = this._thumbar.get(ThumbarKeys.Prev)!;
    this._next = this._thumbar.get(ThumbarKeys.Next)!;
    this.updateThumbar(this._isPlaying);
  }

  // 更新工具栏
  updateThumbar(playing: boolean = false, clean: boolean = false): void {
    this._isPlaying = playing;
    if (clean) return this.clearThumbar();
    this._win.setThumbarButtons([this._prev, playing ? this._pause : this._play, this._next]);
  }

  // 清除工具栏
  clearThumbar(): void {
    this._win.setThumbarButtons([]);
  }
}

/**
 * 初始化缩略图工具栏（仅 Windows）
 */
export const initThumbar = (
  win: BrowserWindow,
  onPlay: () => void,
  onPause: () => void,
  onPrev: () => void,
  onNext: () => void,
): Thumbar | null => {
  if (process.platform !== "win32") return null;
  try {
    console.log("[Thumbar] 初始化缩略图工具栏");
    thumbar = new ThumbarImpl(win, onPlay, onPause, onPrev, onNext);
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
