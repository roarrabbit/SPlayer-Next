/**
 * 播放统计采集
 */

import { getDb } from "./index";
import { libraryLog } from "@main/utils/logger";
import type { PlayEventInput, FavoriteEventInput } from "@shared/types/stats";

/** 写入一条播放记录 */
export const insertPlayEvent = (event: PlayEventInput): void => {
  try {
    getDb()
      .prepare(
        `INSERT INTO play_history (track_id, source, started_at, listened_ms, track_json)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .run(
        event.track.id,
        event.track.source,
        event.startedAt,
        event.listenedMs,
        JSON.stringify(event.track),
      );
  } catch (error) {
    libraryLog.error("写入播放记录失败:", error);
  }
};

/** 写入一条收藏变更记录 */
export const insertFavoriteEvent = (event: FavoriteEventInput): void => {
  try {
    getDb()
      .prepare(
        `INSERT INTO favorite_history (track_id, source, action, at, track_json)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .run(
        event.track.id,
        event.track.source,
        event.action,
        Date.now(),
        JSON.stringify(event.track),
      );
  } catch (error) {
    libraryLog.error("写入收藏记录失败:", error);
  }
};
