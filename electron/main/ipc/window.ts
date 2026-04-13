import { ipcMain } from "electron";
import { toggleDesktopLyricWindow, getDesktopLyricWindow } from "@main/window";

/** 窗口管理 IPC */
export const registerWindowIpc = (): void => {
  // 切换桌面歌词窗口
  ipcMain.handle("window:toggleDesktopLyric", () => toggleDesktopLyricWindow());

  // 查询桌面歌词窗口是否打开
  ipcMain.handle("window:isDesktopLyricOpen", () => !!getDesktopLyricWindow());
};
