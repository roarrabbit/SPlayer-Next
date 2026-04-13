import { BrowserWindow } from "electron";
import { join } from "path";
import { is } from "@electron-toolkit/utils";
import { createWindow } from "./create";
import { setTrayDesktopLyric } from "@main/services/tray";

let desktopLyricWindow: BrowserWindow | null = null;

/** 加载桌面歌词独立入口 */
const loadDesktopLyricEntry = (win: BrowserWindow): void => {
  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    win.loadURL(`${process.env["ELECTRON_RENDERER_URL"]}/windows/desktop-lyric/index.html`);
  } else {
    win.loadFile(join(__dirname, "../renderer/windows/desktop-lyric/index.html"));
  }
};

/**
 * 创建桌面歌词窗口
 * 使用独立 renderer entry（windows/desktop-lyric/index.html），不挂 router/Pinia/i18n/UI 库
 */
export const createDesktopLyricWindow = (): BrowserWindow => {
  if (desktopLyricWindow && !desktopLyricWindow.isDestroyed()) {
    desktopLyricWindow.show();
    desktopLyricWindow.focus();
    return desktopLyricWindow;
  }
  desktopLyricWindow = createWindow({
    width: 800,
    height: 200,
    minWidth: 400,
    minHeight: 120,
    title: "Desktop Lyric",
    resizable: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    backgroundColor: "#101014",
    webPreferences: {
      // 禁用图像解码模块
      images: false,
      // 不会用到 alert/confirm/prompt
      disableDialogs: true,
    },
  });
  loadDesktopLyricEntry(desktopLyricWindow);
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
