/**
 * 渲染端快捷键管理器
 *
 * - 启动时 buildRegistry() 填充 handler，挂全局 keydown 监听
 * - in-app 命中：从 useHotkeyStore.bindings 反查动作 id 后 dispatch
 * - global 命中：主进程 broadcast `hotkey:trigger`，订阅后 dispatch
 */

import { useHotkeyStore } from "@/stores/hotkey";
import { matchEvent } from "@shared/utils/accelerator";
import type { HotkeyActionId } from "@shared/types/hotkey";
import { buildRegistry, dispatch } from "./registry";

/** 当前是否 macOS（preload 暴露的 process.platform） */
const isMac = (): boolean => {
  const p = (window as unknown as { electron?: { process?: { platform?: string } } })
    .electron?.process?.platform;
  return p === "darwin";
};

/**
 * 当前焦点是否在不该响应快捷键的元素上：
 * - input/textarea/contenteditable
 * - button / role=button（避免 Space 同时切歌 + 点按钮）
 */
const isInputFocused = (): boolean => {
  const el = document.activeElement as HTMLElement | null;
  if (!el) return false;
  if (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT") return true;
  if (el.isContentEditable) return true;
  if (el.tagName === "BUTTON") return true;
  if (el.getAttribute("role") === "button") return true;
  return false;
};

let installed = false;
let offGlobalTrigger: (() => void) | null = null;

/** 全局 keydown 处理 */
const onKeyDown = (event: KeyboardEvent): void => {
  if (event.isComposing) return;
  if (isInputFocused()) return;

  const store = useHotkeyStore();
  if (!store.initialized) return;

  const mac = isMac();
  const ids = Object.keys(store.bindings) as HotkeyActionId[];
  for (const id of ids) {
    const accel = store.bindings[id]?.inApp;
    if (!accel) continue;
    if (matchEvent(event, accel, mac)) {
      event.preventDefault();
      dispatch(id);
      return;
    }
  }
};

/**
 * 安装快捷键管理器
 * 在 useHotkeyStore.init() 完成后调用一次
 */
export const installHotkeyManager = (): void => {
  if (installed) return;
  installed = true;
  buildRegistry();
  window.addEventListener("keydown", onKeyDown, { capture: true });
  offGlobalTrigger = window.api.hotkey.onTrigger((id) => dispatch(id));
};

/** 卸载（仅测试/HMR 用，正常运行不需要调） */
export const uninstallHotkeyManager = (): void => {
  if (!installed) return;
  installed = false;
  window.removeEventListener("keydown", onKeyDown, { capture: true });
  offGlobalTrigger?.();
  offGlobalTrigger = null;
};
