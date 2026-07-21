/**
 * 快捷键动作元数据 + 出厂默认绑定
 *
 * 主/渲染共享：
 * - 渲染端 hotkey registry 读取这份清单注册 handler
 * - 主进程读取作为 settings.json 的 hotkeys 字段默认值
 */

import type {
  HotkeyActionId,
  HotkeyActionMeta,
  HotkeyBindingsMap,
  HotkeyConfig,
} from "../types/hotkey";

/**
 * 全部动作的元数据
 *
 * 全局快捷键默认全部留空，由用户自行在设置中绑定：
 * - 避免出厂占用系统快捷键
 * - allowGlobal=true 的动作仍可手动设全局键
 */
export const HOTKEY_ACTIONS: HotkeyActionMeta[] = [
  {
    id: "player.togglePlay",
    labelKey: "settings.hotkeys.actions.togglePlay",
    defaultBinding: {
      inApp: "Space",
      global: null,
    },
    allowGlobal: true,
  },
  {
    id: "player.prev",
    labelKey: "settings.hotkeys.actions.prev",
    defaultBinding: {
      inApp: "CommandOrControl+Left",
      global: null,
    },
    allowGlobal: true,
  },
  {
    id: "player.next",
    labelKey: "settings.hotkeys.actions.next",
    defaultBinding: {
      inApp: "CommandOrControl+Right",
      global: null,
    },
    allowGlobal: true,
  },
  {
    id: "player.seekBack",
    labelKey: "settings.hotkeys.actions.seekBack",
    // 全局留空：避免与 prev 的 global 冲突
    defaultBinding: { inApp: "Shift+Left", global: null },
    allowGlobal: true,
  },
  {
    id: "player.seekForward",
    labelKey: "settings.hotkeys.actions.seekForward",
    defaultBinding: { inApp: "Shift+Right", global: null },
    allowGlobal: true,
  },
  {
    id: "player.volumeUp",
    labelKey: "settings.hotkeys.actions.volumeUp",
    defaultBinding: {
      inApp: "CommandOrControl+Up",
      global: null,
    },
    allowGlobal: true,
  },
  {
    id: "player.volumeDown",
    labelKey: "settings.hotkeys.actions.volumeDown",
    defaultBinding: {
      inApp: "CommandOrControl+Down",
      global: null,
    },
    allowGlobal: true,
  },
  {
    id: "player.cycleRepeat",
    labelKey: "settings.hotkeys.actions.cycleRepeat",
    defaultBinding: { inApp: "CommandOrControl+R", global: null },
    allowGlobal: true,
  },
  {
    id: "player.toggleShuffle",
    labelKey: "settings.hotkeys.actions.toggleShuffle",
    defaultBinding: { inApp: "CommandOrControl+S", global: null },
    allowGlobal: true,
  },
  {
    id: "window.toggleDesktopLyric",
    labelKey: "settings.hotkeys.actions.toggleDesktopLyric",
    defaultBinding: { inApp: "CommandOrControl+L", global: null },
    allowGlobal: true,
  },
  {
    id: "window.toggleDynamicIsland",
    labelKey: "settings.hotkeys.actions.toggleDynamicIsland",
    defaultBinding: { inApp: "CommandOrControl+I", global: null },
    allowGlobal: true,
  },
  {
    id: "window.toggleTaskbarLyric",
    labelKey: "settings.hotkeys.actions.toggleTaskbarLyric",
    defaultBinding: { inApp: "CommandOrControl+B", global: null },
    allowGlobal: true,
  },
  {
    id: "view.openPlayer",
    labelKey: "settings.hotkeys.actions.openPlayer",
    defaultBinding: { inApp: "CommandOrControl+Enter", global: null },
    allowGlobal: false,
  },
  {
    id: "view.closePlayer",
    labelKey: "settings.hotkeys.actions.closePlayer",
    defaultBinding: { inApp: "Escape", global: null },
    allowGlobal: false,
  },
  {
    id: "view.togglePlaylist",
    labelKey: "settings.hotkeys.actions.togglePlaylist",
    defaultBinding: { inApp: "CommandOrControl+P", global: null },
    allowGlobal: false,
  },
  {
    id: "view.openSearch",
    labelKey: "settings.hotkeys.actions.openSearch",
    defaultBinding: { inApp: "CommandOrControl+F", global: null },
    allowGlobal: false,
  },
];

/** 默认绑定表（HotkeyBindingsMap） */
export const defaultHotkeyBindings: HotkeyBindingsMap = HOTKEY_ACTIONS.reduce((acc, meta) => {
  acc[meta.id] = { ...meta.defaultBinding };
  return acc;
}, {} as HotkeyBindingsMap);

/** 默认完整配置 */
export const defaultHotkeyConfig: HotkeyConfig = {
  globalEnabled: true,
  bindings: defaultHotkeyBindings,
};

/** 通过 id 拿 meta */
export const getActionMeta = (id: HotkeyActionId): HotkeyActionMeta | undefined =>
  HOTKEY_ACTIONS.find((m) => m.id === id);
