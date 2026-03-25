import type { SystemConfig } from "../types/settings";

/** 默认配置 */
export const defaultSystemConfig: SystemConfig = {
  player: {
    fadeDuration: 200,
    outputDevice: null,
    volume: 1,
  },
  media: {
    systemMediaControls: true,
    discord: {
      enabled: false,
      showWhenPaused: false,
      displayMode: "name",
    },
  },
  system: {
    window: {
      width: 900,
      height: 670,
      x: null,
      y: null,
      maximized: false,
    },
  },
};
