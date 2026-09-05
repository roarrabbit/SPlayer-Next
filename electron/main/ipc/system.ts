import { app, ipcMain, Menu, MenuItem, shell } from "electron";
import { writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, basename } from "node:path";
import { getFonts } from "font-list";
import type { LocaleCode } from "@shared/types/settings";
import { setLocale } from "@main/utils/i18n";
import { systemLog } from "@main/utils/logger";
import { refreshTray } from "@main/services/tray";
import { getThumbar } from "@main/services/thumbar";
import { getMainWindow, focusMainWindow } from "@main/window";
import { fetchBytes } from "@main/utils/fetchBytes";
import { logsDir } from "@main/utils/paths";
import { consumePendingOrpheusUrl } from "@main/services/orpheus";
import { consumePendingAudioFiles } from "@main/services/externalFile";
import { testNetworkProxy } from "@main/utils/proxy";

/**
 * 注册系统相关的 IPC 事件
 */
export const registerSystemIpc = (): void => {
  // macOS 标准快捷键 Cmd/Ctrl+, 打开设置：在 app 菜单的 About 之后插入"设置…"。
  // Electron 菜单 accelerator 即使菜单栏隐藏/无焦点也全局生效，天然覆盖所有窗口。
  const openSettings = (): void => {
    focusMainWindow();
    getMainWindow()?.webContents.send("system:openSettings", {});
  };
  try {
    const menu = Menu.getApplicationMenu();
    const appSubmenu = menu?.items[0]?.submenu;
    if (menu && appSubmenu) {
      const idx = Math.max(
        1,
        appSubmenu.items.findIndex((i) => i.role === "about") + 1,
      );
      appSubmenu.insert(
        idx,
        new MenuItem({
          label: "设置…",
          accelerator: "CmdOrCtrl+,",
          click: openSettings,
        }),
      );
      Menu.setApplicationMenu(menu);
    }
  } catch (err) {
    systemLog.warn("[system] install preferences menu failed", err);
  }

  ipcMain.on("ping", () => systemLog.debug("pong"));

  // 渲染层拉取冷启动暂存的 orpheus 唤起 URL
  ipcMain.handle("system:consumePendingProtocolUrl", () => consumePendingOrpheusUrl());

  // 渲染层拉取冷启动暂存的外部音频文件列表
  ipcMain.handle("system:consumePendingAudioFiles", () => consumePendingAudioFiles());

  // 切换开发者工具
  ipcMain.handle("system:toggleDevTools", () => {
    const win = getMainWindow();
    if (win) {
      const wc = win.webContents;
      wc.isDevToolsOpened() ? wc.closeDevTools() : wc.openDevTools({ mode: "detach" });
    }
  });

  // 在文件管理器中显示文件
  ipcMain.handle("system:showInExplorer", (_event, filePath: string) => {
    shell.showItemInFolder(filePath);
  });

  // 打开日志目录
  ipcMain.handle("system:openLogsDir", () => shell.openPath(logsDir));

  // 切换主进程语言
  ipcMain.on("system:setLocale", (_event, locale: LocaleCode) => {
    if (setLocale(locale)) {
      refreshTray();
      getThumbar()?.refreshLocale();
    }
  });

  // 显示并聚焦主窗口
  ipcMain.handle("system:focusMainWindow", () => focusMainWindow());

  // 在主窗口打开设置弹窗
  ipcMain.handle("system:openSettings", (_event, category?: string, highlight?: string) => {
    focusMainWindow();
    getMainWindow()?.webContents.send("system:openSettings", { category, highlight });
  });

  // 获取系统已安装字体
  let fontsCache: Promise<string[]> | null = null;
  ipcMain.handle("system:listFonts", (): Promise<string[]> => {
    if (!fontsCache) {
      fontsCache = getFonts({ disableQuoting: true }).catch((err) => {
        systemLog.error("[system] listFonts failed", err);
        fontsCache = null;
        return [];
      });
    }
    return fontsCache;
  });

  // 重启应用
  ipcMain.handle("system:relaunch", () => {
    app.relaunch();
    app.exit(0);
  });

  // 测试当前网络代理
  ipcMain.handle("system:testNetworkProxy", () => testNetworkProxy());

  // 把封面图 URL 拉成字节回渲染层
  // 用于 canvas 取色等需要绕过跨域 tainted 的场景；限定 image/* 响应
  ipcMain.handle("system:fetchRemoteBytes", async (_event, url: string) => {
    if (typeof url !== "string" || !/^https?:\/\//i.test(url)) {
      return { success: false, error: "无效的 URL" };
    }
    const buf = await fetchBytes(url, { requireImage: true });
    return { success: true, data: buf };
  });

  // 保存文件到下载目录
  ipcMain.handle("system:saveFile", async (_event, data: ArrayBuffer, fileName: string) => {
    try {
      // 只取末段并清洗非法字符
      const safeName = basename(fileName)
        .replace(/[\\/:*?"<>|]/g, " ")
        .trim();
      if (!safeName || safeName === "." || safeName === "..") {
        return { success: false, error: "invalid file name" };
      }
      const dir = app.getPath("downloads");
      const dot = safeName.lastIndexOf(".");
      const base = dot > 0 ? safeName.slice(0, dot) : safeName;
      const ext = dot > 0 ? safeName.slice(dot) : "";
      let target = join(dir, safeName);
      for (let seq = 2; existsSync(target); seq++) {
        target = join(dir, `${base} (${seq})${ext}`);
      }
      await writeFile(target, Buffer.from(data));
      return { success: true, path: target };
    } catch (error) {
      systemLog.error("[system] saveFile failed", error);
      return { success: false, error: String(error) };
    }
  });
};
