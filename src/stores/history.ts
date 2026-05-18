import localforage from "localforage";
import type { Track } from "@shared/types/player";

const db = localforage.createInstance({ name: "splayer", storeName: "history" });
const HISTORY_KEY = "entries";

/** 历史条数上限，超出按时间倒序裁掉尾部 */
const MAX_HISTORY = 500;

/** 单条播放历史 */
export interface HistoryEntry {
  track: Track;
  /** 最近一次播放时间（unix ms） */
  playedAt: number;
}

/** 同源同 id 视为同一首 */
const keyOf = (track: Track): string => `${track.source}:${track.id}`;

export const useHistoryStore = defineStore("history", () => {
  /** 倒序：最近播放在前 */
  const entries = shallowRef<HistoryEntry[]>([]);

  const readFromDisk = async (): Promise<HistoryEntry[]> => {
    const cached = await db.getItem<HistoryEntry[]>(HISTORY_KEY).catch(() => null);
    return Array.isArray(cached) ? cached : [];
  };

  const apply = async (next: HistoryEntry[]): Promise<void> => {
    entries.value = next;
    await db.setItem(HISTORY_KEY, toRaw(next)).catch(() => {});
  };

  const load = async (): Promise<void> => {
    entries.value = await readFromDisk();
  };

  /**
   * 记录一次播放：每次都以硬盘为真值源，避免内存未 load 时覆盖旧历史
   * @param track 当前播放曲目
   */
  const record = async (track: Track): Promise<void> => {
    if (!track?.id) return;
    const key = keyOf(track);
    const list = await readFromDisk();
    const filtered = list.filter((item) => keyOf(item.track) !== key);
    const next = [{ track, playedAt: Date.now() }, ...filtered].slice(0, MAX_HISTORY);
    await apply(next);
  };

  /**
   * 移除单条历史
   * @param track 要删除的曲目
   */
  const remove = async (track: Track): Promise<void> => {
    const key = keyOf(track);
    const list = await readFromDisk();
    const next = list.filter((entry) => keyOf(entry.track) !== key);
    if (next.length === list.length) return;
    await apply(next);
  };

  /** 清空全部历史 */
  const clear = async (): Promise<void> => {
    await apply([]);
  };

  /** 按时间倒序的扁平曲目列表 */
  const tracks = computed<Track[]>(() => entries.value.map((entry) => entry.track));

  return {
    entries,
    tracks,
    load,
    record,
    remove,
    clear,
  };
});
