import { app, ipcMain } from "electron";
import { store } from "@main/store";
import { isWin } from "@main/utils/config";
import { systemLog } from "@main/utils/logger";
import {
  toggleDesktopLyricWindow,
  closeDesktopLyricWindow,
  getDesktopLyricWindow,
  applyDesktopLyricHeight,
  applyDesktopLyricUnlockButtonBounds,
  moveDesktopLyricWindow,
  saveDesktopLyricState,
  toggleDynamicIslandWindow,
  closeDynamicIslandWindow,
  getDynamicIslandWindow,
  moveDynamicIslandWindow,
  saveDynamicIslandState,
  applyDynamicIslandWidth,
  applyDynamicIslandHeight,
  applyDynamicIslandHeightAnimated,
  cachedSize,
  getDynamicIslandVisible,
  toggleDebugGeomWindow,
  applyDynamicIslandDebugOffset,
  toggleTaskbarLyricWindow,
  closeTaskbarLyricWindow,
  getTaskbarLyricWindow,
  updateTaskbarLyricContentWidth,
  minimizeMainWindow,
  toggleMaximizeMainWindow,
  isMainWindowMaximized,
  toggleFullscreenMainWindow,
  isMainWindowFullscreen,
  hideMainWindow,
} from "@main/window";

/** 窗口管理 IPC */
export const registerWindowIpc = (): void => {
  // 切换桌面歌词窗口
  ipcMain.handle("window:toggleDesktopLyric", () => toggleDesktopLyricWindow());

  // 关闭桌面歌词窗口
  ipcMain.handle("window:closeDesktopLyric", () => closeDesktopLyricWindow());

  // 查询桌面歌词窗口是否打开
  ipcMain.handle("window:isDesktopLyricOpen", () => !!getDesktopLyricWindow());

  // 锁定桌面歌词窗口高度
  ipcMain.handle("desktopLyric:setHeight", (_event, height: number) => {
    applyDesktopLyricHeight(height);
  });

  // 更新锁定态下唯一可交互的解锁按钮区域
  ipcMain.on("desktopLyric:setUnlockButtonBounds", (_event, bounds) => {
    applyDesktopLyricUnlockButtonBounds(bounds);
  });

  // 拖拽移动；只传位置，尺寸由主进程权威 cachedSize 写回
  ipcMain.on("desktopLyric:move", (_event, x: number, y: number) => {
    moveDesktopLyricWindow(x, y);
  });

  // 拖拽结束后保存最终位置
  ipcMain.on("desktopLyric:saveState", () => {
    saveDesktopLyricState();
  });

  // 切换灵动岛窗口
  ipcMain.handle("window:toggleDynamicIsland", () => toggleDynamicIslandWindow());

  // 关闭灵动岛窗口
  ipcMain.handle("window:closeDynamicIsland", () => closeDynamicIslandWindow());

  // 查询灵动岛窗口是否打开
  ipcMain.handle("window:isDynamicIslandOpen", () => !!getDynamicIslandWindow());

  // 灵动岛拖拽移动
  ipcMain.on("dynamicIsland:move", (_event, x: number, y: number) => {
    moveDynamicIslandWindow(x, y);
  });

  // 灵动岛拖拽结束：主进程判定吸附并持久化
  ipcMain.on("dynamicIsland:saveState", () => {
    saveDynamicIslandState();
  });

  // 灵动岛宽度变化：渲染端上报目标宽度
  ipcMain.on("dynamicIsland:resize", (_event, width: number) => {
    applyDynamicIslandWidth(width);
  });

  // 灵动岛高度变化（弹性动画版：液体展开/收起）
  ipcMain.on("dynamicIsland:setHeightAnimated", (_event, height: number) => {
    applyDynamicIslandHeightAnimated(height);
  });

  // 灵动岛高度变化
  ipcMain.on("dynamicIsland:setHeight", (_event, height: number) => {
    applyDynamicIslandHeight(height);
  });

  // 灵动岛一次性设置位置+尺寸：绕过中间拖拽逻辑，直接 setBounds
  ipcMain.on("dynamicIsland:setBounds", (_event, x: number, y: number, w: number, h: number) => {
    const win = getDynamicIslandWindow();
    if (!win) return;
    cachedSize.width = w;
    cachedSize.height = h;
    win.setBounds({ x, y, width: w, height: h });
  });

  // 灵动岛显隐：仅 show/hide，绝不 destroy/close
  ipcMain.on("dynamicIsland:setVisible", (_event, visible: boolean) => {
    const win = getDynamicIslandWindow();
    systemLog.info(`[dynamic-island] setVisible(${visible}) win=${!!win}`);
    if (!win) return;
    if (visible) {
      win.show();
      win.setAlwaysOnTop(store.get("dynamicIsland").alwaysOnTop, "screen-saver");
    } else {
      win.hide();
    }
  });

  // 灵动岛几何调试控制窗开关
  ipcMain.on("dynamicIsland:toggleDebugPanel", () => {
    toggleDebugGeomWindow();
  });

  // 几何调试参数转发到灵动岛渲染端实时应用；岛整体偏移由主进程直接移动窗口
  ipcMain.on("dynamicIsland:setDebugGeom", (_event, params) => {
    if (typeof params?.islandDX === "number" || typeof params?.islandDY === "number") {
      applyDynamicIslandDebugOffset(params.islandDX ?? 0, params.islandDY ?? 0);
    }
    const win = getDynamicIslandWindow();
    if (win && !win.isDestroyed()) {
      win.webContents.send("dynamicIsland:debugGeom", params);
    }
  });

  // 灵动岛查询当前宽度（权威缓存值，渲染端用它避免 getBounds 回写漂移）
  ipcMain.handle("dynamicIsland:getWidth", () => cachedSize.width);

  // 灵动岛查询当前是否可见（渲染端挂载时兜底初始态）
  ipcMain.handle("dynamicIsland:getVisibility", () => getDynamicIslandVisible());

  // 灵动岛查询当前吸附模式
  ipcMain.handle("dynamicIsland:getMode", () => {
    const saved = store.get("windowStates.dynamicIsland");
    return saved.mode === "floating" ? "floating" : "snapped";
  });

  // 任务栏歌词仅在 Windows 注册
  if (isWin) {
    // 切换任务栏歌词窗口
    ipcMain.handle("window:toggleTaskbarLyric", () => toggleTaskbarLyricWindow());
    // 关闭任务栏歌词窗口
    ipcMain.handle("window:closeTaskbarLyric", () => closeTaskbarLyricWindow());
    // 查询任务栏歌词窗口是否打开
    ipcMain.handle("window:isTaskbarLyricOpen", () => !!getTaskbarLyricWindow());
    ipcMain.on("taskbarLyric:setContentWidth", (_event, width: number) => {
      updateTaskbarLyricContentWidth(width);
    });
  } else {
    ipcMain.handle("window:toggleTaskbarLyric", () => false);
    ipcMain.handle("window:closeTaskbarLyric", () => undefined);
    ipcMain.handle("window:isTaskbarLyricOpen", () => false);
  }

  // 主窗口控制
  ipcMain.on("window:minimize", () => minimizeMainWindow());
  ipcMain.on("window:toggleMaximize", () => toggleMaximizeMainWindow());
  ipcMain.handle("window:isMaximized", () => isMainWindowMaximized());
  ipcMain.on("window:toggleFullscreen", () => toggleFullscreenMainWindow());
  ipcMain.handle("window:isFullscreen", () => isMainWindowFullscreen());
  ipcMain.on("window:hide", () => hideMainWindow());
  ipcMain.on("window:quit", () => app.quit());
};
