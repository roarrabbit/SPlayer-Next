import path from "node:path";
import type { Track, Artist, Album, AudioQuality } from "@shared/types/player";
import { getDb } from "./index";

/** 数据库行类型 */
interface TrackRow {
  id: string;
  path: string;
  title: string;
  artists: string;
  album: string | null;
  duration: number;
  cover: string | null;
  codec: string | null;
  sample_rate: number | null;
  bit_rate: number | null;
  channels: number | null;
  bits_per_sample: number | null;
  file_size: number;
  file_mtime: number | null;
  file_ctime: number | null;
  scanned_at: number;
}

/** 将数据库行解析为 Track */
const rowToTrack = (row: TrackRow): Track => {
  const quality: AudioQuality | undefined =
    row.codec != null
      ? {
          codec: row.codec,
          sampleRate: row.sample_rate ?? 0,
          bitRate: row.bit_rate ?? 0,
          channels: row.channels ?? 0,
          bitsPerSample: row.bits_per_sample ?? 0,
        }
      : undefined;

  return {
    id: row.id,
    source: "local",
    path: row.path,
    title: row.title,
    artists: JSON.parse(row.artists) as Artist[],
    album: row.album ? (JSON.parse(row.album) as Album) : undefined,
    duration: row.duration,
    cover: row.cover ?? undefined,
    fileSize: row.file_size ?? undefined,
    mtime: row.file_mtime ?? undefined,
    ctime: row.file_ctime ?? undefined,
    quality,
  };
};

/** 查询全部曲目 */
export const getAllTracks = (): Track[] => {
  const rows = getDb().prepare("SELECT * FROM tracks").all() as TrackRow[];
  return rows.map(rowToTrack);
};

/** 获取曲目总数 */
export const getTrackCount = (): number => {
  const row = getDb().prepare("SELECT COUNT(*) as count FROM tracks").get() as { count: number };
  return row.count;
};

/** 用于增量扫描比对的文件记录 */
export interface FileRecord {
  path: string;
  mtime: number;
  size: number;
}

/** 获取所有文件记录（path + mtime + size），用于增量扫描比对 */
export const getFileRecords = (): FileRecord[] => {
  return getDb()
    .prepare(
      "SELECT path, COALESCE(file_mtime, 0) as mtime, file_size as size FROM tracks",
    )
    .all() as FileRecord[];
};

/** 批量插入/更新的扫描结果 */
export interface UpsertTrack {
  id: string;
  path: string;
  title: string;
  artists: Artist[];
  album?: Album;
  duration: number;
  cover?: string;
  codec?: string;
  sampleRate?: number;
  bitRate?: number;
  channels?: number;
  bitsPerSample?: number;
  fileSize: number;
  mtime: number;
  ctime: number;
}

/** 批量插入/更新曲目（使用事务） */
export const upsertTracks = (tracks: UpsertTrack[]): void => {
  if (tracks.length === 0) return;
  const d = getDb();
  const stmt = d.prepare(`
    INSERT OR REPLACE INTO tracks
      (id, path, title, artists, album, duration, cover, codec, sample_rate, bit_rate, channels, bits_per_sample, file_size, file_mtime, file_ctime, scanned_at)
    VALUES
      (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const now = Date.now();
  const tx = d.transaction(() => {
    for (const t of tracks) {
      stmt.run(
        t.id,
        t.path,
        t.title,
        JSON.stringify(t.artists),
        t.album ? JSON.stringify(t.album) : null,
        t.duration,
        t.cover ?? null,
        t.codec ?? null,
        t.sampleRate ?? null,
        t.bitRate ?? null,
        t.channels ?? null,
        t.bitsPerSample ?? null,
        t.fileSize,
        t.mtime,
        t.ctime,
        now,
      );
    }
  });
  tx();
};

/** 批量删除曲目（按路径） */
export const deleteTracksByPaths = (paths: string[]): void => {
  if (paths.length === 0) return;
  const d = getDb();
  const stmt = d.prepare("DELETE FROM tracks WHERE path = ?");
  const tx = d.transaction(() => {
    for (const p of paths) {
      stmt.run(p);
    }
  });
  tx();
};

/** 模糊搜索曲目（title / artists / album） */
export const searchTracks = (query: string): Track[] => {
  const escaped = query.replace(/[%_\\]/g, "\\$&");
  const pattern = `%${escaped}%`;
  const rows = getDb()
    .prepare(
      "SELECT * FROM tracks WHERE title LIKE ? ESCAPE '\\' OR artists LIKE ? ESCAPE '\\' OR album LIKE ? ESCAPE '\\'",
    )
    .all(pattern, pattern, pattern) as TrackRow[];
  return rows.map(rowToTrack);
};

/** 删除指定目录下的所有曲目 */
export const deleteTracksByDir = (dir: string): void => {
  const prefix = dir.endsWith("/") || dir.endsWith("\\") ? dir : dir + path.sep;
  getDb().prepare("DELETE FROM tracks WHERE path LIKE ?").run(prefix + "%");
};
