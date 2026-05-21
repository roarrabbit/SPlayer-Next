/**
 * 播放统计采集类型
 *
 * 渲染端构造、主进程写入 SQLite。直接带完整 Track,行即自包含、可还原重播。
 */

import type { Track } from "./player";

/** 一次播放的统计事件,写入 play_history */
export interface PlayEventInput {
  /** 完整曲目（播放当时的快照） */
  track: Track;
  /** 本次播放开始 unix ms */
  startedAt: number;
  /** 实际收听墙钟毫秒（扣掉暂停） */
  listenedMs: number;
}

/** 一次收藏变更事件,写入 favorite_history */
export interface FavoriteEventInput {
  /** 完整曲目（操作当时的快照） */
  track: Track;
  /** 收藏 / 取消收藏 */
  action: "add" | "remove";
}

/** preload 暴露的统计写入 API */
export interface StatsApi {
  /** 记录一次播放 */
  recordPlay: (event: PlayEventInput) => void;
  /** 记录一次收藏变更 */
  recordFavorite: (event: FavoriteEventInput) => void;
}
