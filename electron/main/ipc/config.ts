import { ipcMain } from "electron";
import { store } from "../store";

/** 注册配置相关 IPC */
export const registerConfigIpc = (): void => {
  ipcMain.handle("config:get", (_event, keyPath: string) => store.get(keyPath));
  ipcMain.handle("config:set", (_event, keyPath: string, value: unknown) => store.set(keyPath, value));
  ipcMain.handle("config:getAll", () => store.store);
  ipcMain.handle("config:reset", () => store.clear());
};
