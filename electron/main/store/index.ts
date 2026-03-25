import Store from "electron-store";
import { defaultSystemConfig } from "@shared/defaults/settings";
import type { SystemConfig } from "@shared/types/settings";

/** 主进程配置存储 */
export const store = new Store<SystemConfig>({
  name: "settings",
  defaults: defaultSystemConfig,
});
