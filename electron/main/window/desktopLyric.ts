import { BrowserWindow } from "electron";
import { join } from "path";
import { is } from "@electron-toolkit/utils";
import { createWindow } from "./create";
import { setTrayDesktopLyric } from "@main/services/tray";
import { store } from "@main/store";
import { windowStateStore } from "@main/store/windowStates";

let desktopLyricWindow: BrowserWindow | null = null;

/** 最小宽度 */
const MIN_WIDTH = 400;
/** 最大宽度 */
const MAX_WIDTH = 10000;
/** 默认高度 */
const FALLBACK_HEIGHT = 200;
/** 默认宽度 */
const FALLBACK_WIDTH = 800;

/**
 * 权威尺寸缓存
 * 所有 setBounds 写宽高都用它，绝不从 getBounds 读尺寸回写，
 * 避免 Windows 高 DPI 下 DIP↔物理像素有损回环造成尺寸漂移
 */
const cachedSize = { width: 0, height: 0 };

/** 把当前位置 + 权威尺寸保存到 windowStateStore */
const saveWindowState = (): void => {
  if (!desktopLyricWindow || desktopLyricWindow.isDestroyed()) return;
  const { x, y } = desktopLyricWindow.getBounds();
  windowStateStore.set("desktopLyric", {
    x,
    y,
    width: cachedSize.width,
    height: cachedSize.height,
  });
};

/** 应用锁定状态：鼠标穿透 + 禁止拖动 */
export const applyDesktopLyricLock = (locked: boolean): void => {
  const win = getDesktopLyricWindow();
  if (!win) return;
  win.setIgnoreMouseEvents(locked, { forward: true });
  win.setMovable(!locked);
  win.setResizable(!locked);
};

/** 应用置顶状态 */
export const applyDesktopLyricAlwaysOnTop = (alwaysOnTop: boolean): void => {
  const win = getDesktopLyricWindow();
  if (!win) return;
  win.setAlwaysOnTop(alwaysOnTop);
};

/** 锁定状态下由渲染端切换鼠标事件穿透 */
export const applyDesktopLyricMouseIgnore = (ignore: boolean): void => {
  const win = getDesktopLyricWindow();
  if (!win) return;
  win.setIgnoreMouseEvents(ignore, { forward: true });
};

/** 把窗口移动到指定位置；尺寸始终用权威 cachedSize 写回 */
export const moveDesktopLyricWindow = (x: number, y: number): void => {
  const win = getDesktopLyricWindow();
  if (!win) return;
  win.setBounds({
    x: Math.round(x),
    y: Math.round(y),
    width: cachedSize.width,
    height: cachedSize.height,
  });
};

/** 拖拽结束后保存最终位置；程序 setBounds 不触发 moved 事件，需显式存 */
export const saveDesktopLyricState = (): void => {
  saveWindowState();
};

/** 锁定窗口高度并更新权威 cachedSize.height */
export const applyDesktopLyricHeight = (height: number): void => {
  const win = getDesktopLyricWindow();
  if (!win) return;
  const h = Math.round(height);
  cachedSize.height = h;
  win.setMinimumSize(MIN_WIDTH, h);
  win.setMaximumSize(MAX_WIDTH, h);
  const { x, y } = win.getBounds();
  win.setBounds({ x, y, width: cachedSize.width, height: h });
};

/** 创建桌面歌词窗口 */
export const createDesktopLyricWindow = (): BrowserWindow => {
  if (desktopLyricWindow && !desktopLyricWindow.isDestroyed()) {
    desktopLyricWindow.show();
    desktopLyricWindow.focus();
    return desktopLyricWindow;
  }
  const config = store.get("desktopLyric");
  const saved = windowStateStore.get("desktopLyric");
  const initialHeight = saved.height || FALLBACK_HEIGHT;
  const initialWidth = saved.width || FALLBACK_WIDTH;

  desktopLyricWindow = createWindow({
    width: initialWidth,
    height: initialHeight,
    ...(saved.x !== null && saved.y !== null ? { x: saved.x, y: saved.y } : {}),
    minWidth: MIN_WIDTH,
    minHeight: initialHeight,
    maxHeight: initialHeight,
    title: "Desktop Lyric",
    frame: false,
    transparent: true,
    hasShadow: false,
    resizable: !config.locked,
    movable: !config.locked,
    alwaysOnTop: config.alwaysOnTop,
    skipTaskbar: true,
    backgroundColor: "#00000000",
    webPreferences: {
      images: false,
      disableDialogs: true,
      zoomFactor: 1.0,
    },
  });

  cachedSize.width = initialWidth;
  cachedSize.height = initialHeight;

  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    desktopLyricWindow.loadURL(
      `${process.env["ELECTRON_RENDERER_URL"]}/windows/desktop-lyric/index.html`,
    );
  } else {
    desktopLyricWindow.loadFile(join(__dirname, "../renderer/windows/desktop-lyric/index.html"));
  }

  desktopLyricWindow.webContents.on("did-finish-load", () => {
    desktopLyricWindow?.webContents.setZoomFactor(1.0);
  });

  desktopLyricWindow.once("ready-to-show", () => {
    if (!desktopLyricWindow) return;
    const b = desktopLyricWindow.getBounds();
    cachedSize.width = b.width;
    cachedSize.height = b.height;
  });

  if (config.locked) {
    desktopLyricWindow.setIgnoreMouseEvents(true, { forward: true });
  }

  // resized 仅由用户拖边触发；程序 setBounds 不触发，所以不会被脏值污染
  desktopLyricWindow.on("resized", () => {
    if (!desktopLyricWindow) return;
    const b = desktopLyricWindow.getBounds();
    cachedSize.width = b.width;
    cachedSize.height = b.height;
    saveWindowState();
  });

  setTrayDesktopLyric(true);
  desktopLyricWindow.on("closed", () => {
    desktopLyricWindow = null;
    setTrayDesktopLyric(false);
  });
  return desktopLyricWindow;
};

/** 关闭桌面歌词窗口 */
export const closeDesktopLyricWindow = (): void => {
  if (desktopLyricWindow && !desktopLyricWindow.isDestroyed()) {
    desktopLyricWindow.close();
  }
};

/** 切换桌面歌词窗口 */
export const toggleDesktopLyricWindow = (): boolean => {
  if (desktopLyricWindow && !desktopLyricWindow.isDestroyed()) {
    closeDesktopLyricWindow();
    return false;
  }
  createDesktopLyricWindow();
  return true;
};

/** 获取桌面歌词窗口实例 */
export const getDesktopLyricWindow = (): BrowserWindow | null => {
  if (desktopLyricWindow && !desktopLyricWindow.isDestroyed()) return desktopLyricWindow;
  return null;
};
