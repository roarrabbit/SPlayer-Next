import { store } from "@main/store";
import { isWin } from "@main/utils/config";
import { createDesktopLyricWindow } from "./desktopLyric";
import { createDynamicIslandWindow } from "./dynamicIsland";
import { createTaskbarLyricWindow } from "./taskbarLyric";

export { createWindow } from "./create";
export {
  createMainWindow,
  getMainWindow,
  focusMainWindow,
  setTaskbarProgress,
  applyMainWindowZoom,
  minimizeMainWindow,
  toggleMaximizeMainWindow,
  isMainWindowMaximized,
  toggleFullscreenMainWindow,
  isMainWindowFullscreen,
  hideMainWindow,
} from "./main";
export {
  createDesktopLyricWindow,
  closeDesktopLyricWindow,
  toggleDesktopLyricWindow,
  getDesktopLyricWindow,
  applyDesktopLyricLock,
  applyDesktopLyricAlwaysOnTop,
  applyDesktopLyricUnlockButtonBounds,
  applyDesktopLyricHeight,
  moveDesktopLyricWindow,
  saveDesktopLyricState,
} from "./desktopLyric";
export {
  createDynamicIslandWindow,
  closeDynamicIslandWindow,
  toggleDynamicIslandWindow,
  getDynamicIslandWindow,
  cachedSize,
  applyDynamicIslandAlwaysOnTop,
  applyDynamicIslandHeight,
  applyDynamicIslandHeightAnimated,
  applyDynamicIslandWidth,
  applyDynamicIslandSnapCentered,
  applyDynamicIslandNotchFusion,
  applyDynamicIslandNonOcclusive,
  moveDynamicIslandWindow,
  saveDynamicIslandState,
  getDynamicIslandWidthFromConfig,
  getDynamicIslandVisible,
  syncDynamicIslandVisibility,
  applyDynamicIslandDebugOffset,
} from "./dynamicIsland";
export { toggleDebugGeomWindow } from "./debugGeom";
export {
  createTaskbarLyricWindow,
  closeTaskbarLyricWindow,
  toggleTaskbarLyricWindow,
  getTaskbarLyricWindow,
  applyTaskbarLyricLayout,
  updateTaskbarLyricContentWidth,
} from "./taskbarLyric";
/** 恢复歌词相关窗口 */
export const restoreLyricWindows = (): void => {
  if (store.get("windowStates.desktopLyric.visible")) createDesktopLyricWindow();
  if (store.get("windowStates.dynamicIsland.visible")) createDynamicIslandWindow();
  if (isWin && store.get("windowStates.taskbarLyric.visible")) {
    createTaskbarLyricWindow();
  }
};
