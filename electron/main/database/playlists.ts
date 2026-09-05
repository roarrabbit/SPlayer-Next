import type {
  LegacyPlaylistRecord,
  PlaylistCreateInput,
  PlaylistDetail,
  PlaylistType,
  PlaylistSummary,
  PlaylistUpdateInput,
} from "@shared/types/playlist";
import type { Track } from "@shared/types/player";
import { getDb } from "@main/database";
import { getTracksByIds } from "@main/database/queries";

interface PlaylistRow {
  id: string;
  type: PlaylistType;
  title: string;
  description: string | null;
  cover: string | null;
  track_count: number;
  created_at: number;
  updated_at: number;
}

/**
 * 转换数据库歌单记录
 * @param row - 数据库查询结果
 * @returns renderer 可用的歌单列表项
 */
const toSummary = (row: PlaylistRow): PlaylistSummary => ({
  id: row.id,
  type: row.type,
  title: row.title,
  description: row.description ?? undefined,
  cover: row.cover ?? undefined,
  trackCount: row.track_count,
  createTime: row.created_at,
  updateTime: row.updated_at,
});

const SELECT_PLAYLIST = `
  SELECT
    p.id,
    p.type,
    p.title,
    p.description,
    p.cover,
    p.created_at,
    p.updated_at,
    (
      (SELECT COUNT(*) FROM playlist_tracks pt WHERE pt.playlist_id = p.id)
      + (SELECT COUNT(*) FROM playlist_online_tracks pot WHERE pot.playlist_id = p.id)
    ) AS track_count
  FROM playlists p
`;

/** 获取全部歌单列表 */
export const getPlaylists = (): PlaylistSummary[] => {
  const rows = getDb()
    .prepare(
      `${SELECT_PLAYLIST} WHERE p.type = 'local' ORDER BY p.created_at DESC, p.id`,
    )
    .all() as PlaylistRow[];
  return rows.map(toSummary);
};

/**
 * 获取歌单详情
 * @param id - 歌单 ID
 * @returns 歌单及有序歌曲
 */
export const getPlaylist = (id: string): PlaylistDetail | null => {
  const row = getDb()
    .prepare(`${SELECT_PLAYLIST} WHERE p.id = ? AND p.type = 'local'`)
    .get(id) as PlaylistRow | undefined;
  if (!row) return null;
  const database = getDb();
  // 本地歌曲：按曲库解析
  const localRows = database
    .prepare(
      `SELECT pt.track_id, pt.position, pt.added_at
       FROM playlist_tracks pt
       INNER JOIN tracks t ON t.id = pt.track_id
       WHERE pt.playlist_id = ?`,
    )
    .all(id) as { track_id: string; position: number; added_at: number }[];
  const fetched = getTracksByIds(localRows.map((item) => item.track_id));
  const byId = new Map(fetched.map((track) => [track.id, track]));
  // 在线歌曲（QQ/酷狗等）：直接读取存储的 Track JSON
  const onlineRows = database
    .prepare(
      `SELECT track_id, data, position, added_at
       FROM playlist_online_tracks
       WHERE playlist_id = ?`,
    )
    .all(id) as { track_id: string; data: string; position: number; added_at: number }[];
  // 两张表共享 position 域，按全局顺序合并
  const entries = [
    ...localRows.map((item) => ({ ...item, kind: "local" as const })),
    ...onlineRows.map((item) => ({ ...item, kind: "online" as const })),
  ].sort(
    (a, b) =>
      a.position - b.position ||
      a.added_at - b.added_at ||
      a.track_id.localeCompare(b.track_id),
  );
  const tracks: Track[] = [];
  for (const entry of entries) {
    if (entry.kind === "local") {
      const track = byId.get(entry.track_id);
      if (track) tracks.push(track);
      continue;
    }
    try {
      tracks.push(JSON.parse(entry.data) as Track);
    } catch (error) {
      // 单条损坏不应拖垮整个歌单
      console.error("[playlist] parse online track failed:", error);
    }
  }
  return {
    ...toSummary(row),
    tracks,
  };
};

/**
 * 创建歌单
 * @param input - 歌单信息
 * @returns 新歌单
 */
export const createPlaylist = (input: PlaylistCreateInput): PlaylistSummary => {
  const title = input.title.trim();
  if (!title) throw new Error("歌单名称不能为空");
  if (input.type !== "local") throw new Error("歌单类型无效");
  const now = Date.now();
  const id = `pl_${crypto.randomUUID()}`;
  getDb()
    .prepare(
      `INSERT INTO playlists
        (id, type, title, description, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(id, input.type, title, input.description?.trim() || null, now, now);
  return getPlaylists().find((playlist) => playlist.id === id)!;
};

/**
 * 更新歌单信息
 * @param id - 歌单 ID
 * @param input - 更新内容
 * @returns 更新后的歌单
 */
export const updatePlaylist = (id: string, input: PlaylistUpdateInput): PlaylistSummary | null => {
  const current = getPlaylists().find((playlist) => playlist.id === id);
  if (!current) return null;
  const title = input.title?.trim() ?? current.title;
  if (!title) throw new Error("歌单名称不能为空");
  getDb()
    .prepare(
      `UPDATE playlists
       SET title = ?, description = ?, cover = ?, updated_at = ?
       WHERE id = ?`,
    )
    .run(
      title,
      input.description === undefined ? (current.description ?? null) : input.description || null,
      input.cover === undefined ? (current.cover ?? null) : input.cover || null,
      Date.now(),
      id,
    );
  return getPlaylists().find((playlist) => playlist.id === id) ?? null;
};

/**
 * 删除歌单
 * @param id - 歌单 ID
 */
export const deletePlaylist = (id: string): void => {
  getDb().transaction(() => {
    getDb().prepare("DELETE FROM playlist_tracks WHERE playlist_id = ?").run(id);
    getDb().prepare("DELETE FROM playlist_online_tracks WHERE playlist_id = ?").run(id);
    getDb().prepare("DELETE FROM playlists WHERE id = ?").run(id);
  })();
};

/**
 * 添加本地歌曲到歌单
 * @param id - 歌单 ID
 * @param trackIds - 本地歌曲 ID
 * @returns 实际新增数量
 */
export const addPlaylistTracks = (id: string, trackIds: string[]): number => {
  const playlist = getPlaylists().find((item) => item.id === id);
  if (!playlist || playlist.type !== "local") return 0;
  const uniqueIds = [...new Set(trackIds)];
  if (uniqueIds.length === 0) return 0;
  const database = getDb();
  return database.transaction(() => {
    const existing = database
      .prepare("SELECT track_id FROM playlist_tracks WHERE playlist_id = ?")
      .all(id) as { track_id: string }[];
    const existingIds = new Set(existing.map((item) => item.track_id));
    const validIds = uniqueIds.filter((trackId) => {
      if (existingIds.has(trackId)) return false;
      return Boolean(database.prepare("SELECT 1 FROM tracks WHERE id = ?").get(trackId));
    });
    if (validIds.length === 0) return 0;
    database
      .prepare("UPDATE playlist_tracks SET position = position + ? WHERE playlist_id = ?")
      .run(validIds.length, id);
    database
      .prepare("UPDATE playlist_online_tracks SET position = position + ? WHERE playlist_id = ?")
      .run(validIds.length, id);
    const insert = database.prepare(
      `INSERT INTO playlist_tracks (playlist_id, track_id, position, added_at)
       VALUES (?, ?, ?, ?)`,
    );
    const now = Date.now();
    validIds.forEach((trackId, position) => insert.run(id, trackId, position, now));
    const coverRow = database
      .prepare(
        `SELECT cover FROM tracks WHERE id IN (${validIds.map(() => "?").join(",")}) AND cover IS NOT NULL LIMIT 1`,
      )
      .get(...validIds) as { cover?: string } | undefined;
    database
      .prepare("UPDATE playlists SET cover = COALESCE(?, cover), updated_at = ? WHERE id = ?")
      .run(coverRow?.cover ?? null, now, id);
    return validIds.length;
  })();
};

/**
 * 保障爱心歌单存在（固定 ID，不存在则创建）
 * @param id - 固定歌单 ID
 * @param title - 歌单标题
 * @returns 歌单信息
 */
export const ensureHeartPlaylist = (id: string, title: string): PlaylistSummary => {
  const now = Date.now();
  getDb()
    .prepare(
      `INSERT OR IGNORE INTO playlists
        (id, type, title, created_at, updated_at)
       VALUES (?, 'local', ?, ?, ?)`,
    )
    .run(id, title, now, now);
  return getPlaylists().find((playlist) => playlist.id === id)!;
};

/**
 * 添加在线歌曲（QQ/酷狗等）到歌单
 * 以 Track JSON 形式存储，不依赖本地曲库
 * 网易云歌曲不入本地歌单（走网易云在线歌单体系）
 * @param id - 歌单 ID
 * @param tracks - 在线曲目列表
 * @returns 实际新增数量
 */
export const addOnlinePlaylistTracks = (id: string, tracks: Track[]): number => {
  const playlist = getPlaylists().find((item) => item.id === id);
  if (!playlist || playlist.type !== "local") return 0;
  const candidates = tracks.filter(
    (track) => track.source && track.source !== "local" && track.source !== "netease",
  );
  const unique = new Map(candidates.map((track) => [track.id, track]));
  if (unique.size === 0) return 0;
  const database = getDb();
  return database.transaction(() => {
    const existing = new Set([
      ...(database
        .prepare("SELECT track_id FROM playlist_tracks WHERE playlist_id = ?")
        .all(id) as { track_id: string }[]),
      ...(database
        .prepare("SELECT track_id FROM playlist_online_tracks WHERE playlist_id = ?")
        .all(id) as { track_id: string }[]),
    ].map((item) => item.track_id));
    const newTracks = [...unique.values()].filter((track) => !existing.has(track.id));
    if (newTracks.length === 0) return 0;
    // 新增歌曲置顶：两张表整体后移
    database
      .prepare("UPDATE playlist_tracks SET position = position + ? WHERE playlist_id = ?")
      .run(newTracks.length, id);
    database
      .prepare("UPDATE playlist_online_tracks SET position = position + ? WHERE playlist_id = ?")
      .run(newTracks.length, id);
    const insert = database.prepare(
      `INSERT INTO playlist_online_tracks (playlist_id, track_id, position, added_at, data)
       VALUES (?, ?, ?, ?, ?)`,
    );
    const now = Date.now();
    newTracks.forEach((track, position) =>
      insert.run(id, track.id, position, now, JSON.stringify(track)),
    );
    const cover = newTracks.find((track) => track.cover)?.cover;
    database
      .prepare("UPDATE playlists SET cover = COALESCE(?, cover), updated_at = ? WHERE id = ?")
      .run(cover ?? null, now, id);
    return newTracks.length;
  })();
};

/**
 * 从本地歌单移除歌曲
 * @param id - 歌单 ID
 * @param trackIds - 歌曲 ID
 */
export const removePlaylistTracks = (id: string, trackIds: string[]): number => {
  const playlist = getPlaylists().find((item) => item.id === id);
  if (!playlist || playlist.type !== "local") return 0;
  const ids = [...new Set(trackIds)];
  if (ids.length === 0) return 0;
  const database = getDb();
  return database.transaction(() => {
    const deleteLocal = database
      .prepare(
        `DELETE FROM playlist_tracks
         WHERE playlist_id = ? AND track_id IN (${ids.map(() => "?").join(",")})`,
      )
      .run(id, ...ids).changes;
    const deleteOnline = database
      .prepare(
        `DELETE FROM playlist_online_tracks
         WHERE playlist_id = ? AND track_id IN (${ids.map(() => "?").join(",")})`,
      )
      .run(id, ...ids).changes;
    const removed = deleteLocal + deleteOnline;
    if (removed === 0) return 0;
    // 按剩余条目的全局顺序（两表共享 position 域）重排为连续位置
    const remainingLocal = database
      .prepare(
        "SELECT track_id, position, added_at FROM playlist_tracks WHERE playlist_id = ?",
      )
      .all(id) as { track_id: string; position: number; added_at: number }[];
    const remainingOnline = database
      .prepare(
        "SELECT track_id, position, added_at FROM playlist_online_tracks WHERE playlist_id = ?",
      )
      .all(id) as { track_id: string; position: number; added_at: number }[];
    const remaining = [
      ...remainingLocal.map((item) => ({ ...item, kind: "local" as const })),
      ...remainingOnline.map((item) => ({ ...item, kind: "online" as const })),
    ].sort(
      (a, b) =>
        a.position - b.position ||
        a.added_at - b.added_at ||
        a.track_id.localeCompare(b.track_id),
    );
    const updateLocal = database.prepare(
      "UPDATE playlist_tracks SET position = ? WHERE playlist_id = ? AND track_id = ?",
    );
    const updateOnline = database.prepare(
      "UPDATE playlist_online_tracks SET position = ? WHERE playlist_id = ? AND track_id = ?",
    );
    remaining.forEach((item, position) => {
      if (item.kind === "local") updateLocal.run(position, id, item.track_id);
      else updateOnline.run(position, id, item.track_id);
    });
    database
      .prepare(
        "UPDATE playlists SET cover = CASE WHEN ? = 0 THEN NULL ELSE cover END, updated_at = ? WHERE id = ?",
      )
      .run(remaining.length, Date.now(), id);
    return removed;
  })();
};

/**
 * 导入旧版 renderer 本地歌单
 * @param records - IndexedDB 歌单记录
 */
export const importLegacyPlaylists = (records: LegacyPlaylistRecord[]): void => {
  if (records.length === 0) return;
  const database = getDb();
  database.transaction(() => {
    const insertPlaylist = database.prepare(
      `INSERT OR IGNORE INTO playlists
        (id, type, title, description, cover, created_at, updated_at)
       VALUES (?, 'local', ?, ?, ?, ?, ?)`,
    );
    const insertTrack = database.prepare(
      `INSERT OR IGNORE INTO playlist_tracks (playlist_id, track_id, position, added_at)
       SELECT ?, ?, ?, ? WHERE EXISTS (SELECT 1 FROM tracks WHERE id = ?)`,
    );
    const now = Date.now();
    for (const record of records) {
      const createdAt = record.createTime ?? now;
      const updatedAt = record.updateTime ?? createdAt;
      insertPlaylist.run(
        record.id,
        record.title,
        record.description ?? null,
        record.cover ?? null,
        createdAt,
        updatedAt,
      );
      record.trackIds.forEach((trackId, position) =>
        insertTrack.run(record.id, trackId, position, updatedAt, trackId),
      );
    }
  })();
};

/** 清空全部歌单及歌曲关系 */
export const clearPlaylists = (): void => {
  const database = getDb();
  database.transaction(() => {
    database.prepare("DELETE FROM playlist_tracks").run();
    database.prepare("DELETE FROM playlist_online_tracks").run();
    database.prepare("DELETE FROM playlists").run();
  })();
};
