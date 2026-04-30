/**
 * 渲染端动作注册表
 *
 * 每个 HotkeyActionId 对应一个无参 handler。in-app keydown 命中和 main 进程
 * global 触发都通过 dispatch(id) 走同一条路径。
 */

import type { HotkeyActionId } from "@shared/types/hotkey";
import { useStatusStore } from "@/stores/status";
import * as player from "@/core/player";

/** 调音量步长 */
const VOLUME_STEP = 0.05;
/** 快进/快退步长（毫秒） */
const SEEK_STEP_MS = 5000;

const handlers = new Map<HotkeyActionId, () => void>();

/** 填充 handler 表（manager.install 时调一次） */
export const buildRegistry = (): void => {
  handlers.clear();

  handlers.set("player.togglePlay", () => player.togglePlay());
  handlers.set("player.next", () => player.nextTrack());
  handlers.set("player.prev", () => player.prevTrack());

  handlers.set("player.seekForward", () => {
    const status = useStatusStore();
    const next = Math.min(status.duration, status.position + SEEK_STEP_MS);
    player.seek(next);
  });
  handlers.set("player.seekBack", () => {
    const status = useStatusStore();
    const next = Math.max(0, status.position - SEEK_STEP_MS);
    player.seek(next);
  });

  handlers.set("player.volumeUp", () => {
    const status = useStatusStore();
    player.setVolume(Math.min(1, status.volume + VOLUME_STEP));
  });
  handlers.set("player.volumeDown", () => {
    const status = useStatusStore();
    player.setVolume(Math.max(0, status.volume - VOLUME_STEP));
  });

  handlers.set("player.cycleRepeat", () => player.cycleRepeatMode());
  handlers.set("player.toggleShuffle", () => player.toggleShuffleMode());
};

/** 派发某动作 */
export const dispatch = (id: HotkeyActionId): void => {
  const fn = handlers.get(id);
  if (!fn) return;
  try {
    fn();
  } catch (err) {
    console.error(`[hotkey] dispatch ${id} failed`, err);
  }
};
