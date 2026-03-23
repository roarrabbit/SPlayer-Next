import { ipcMain } from "electron";
import { mediaService } from "../services/media";

/**
 * 注册系统相关的 IPC 事件
 */
export const registerSystemIpc = (): void => {
  ipcMain.on("ping", () => console.log("pong"));

  // 渲染器页面挂载完成后触发，延迟初始化原生模块
  ipcMain.once("app:ready", () => {
    mediaService.init();
  });
};
