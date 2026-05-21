import { ipcMain } from "electron";
import { insertPlayEvent, insertFavoriteEvent } from "@main/database/playStats";
import type { PlayEventInput, FavoriteEventInput } from "@shared/types/stats";

/** 播放统计采集 IPC */
export const registerStatsIpc = (): void => {
  ipcMain.on("stats:recordPlay", (_event, payload: PlayEventInput) => {
    insertPlayEvent(payload);
  });
  ipcMain.on("stats:recordFavorite", (_event, payload: FavoriteEventInput) => {
    insertFavoriteEvent(payload);
  });
};
