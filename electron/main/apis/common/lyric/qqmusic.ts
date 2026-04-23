/**
 * QQMusic 歌词匹配
 *
 * 两个入口：
 *  - getByPlatformId(id)    按 QQMusic song id 直取
 *  - getByQuery(track)      search → 打分 → 串行尝试直到拿到带时间戳的歌词
 *
 * 返回只带原生格式文本（qrc / lrc + 翻译 / 罗马音），不做解析，交给渲染端。
 */

import { callQQMusic } from "@main/apis/qqmusic";
import { coreLog } from "@main/utils/logger";
import type { LyricMatchResult } from "@shared/types/lyrics";
import type { Track } from "@shared/types/player";
import { isValidLyric, rankCandidates, type LyricCandidate } from "./utils";

interface LyricBody {
  code: number;
  lrc?: string;
  qrc?: string;
  trans?: string;
  roma?: string;
  message?: string;
}

interface SearchSong {
  id: string;
  name: string;
  artist: string;
  album: string;
  /** 毫秒 */
  duration: number;
}

interface SearchBody {
  code: number;
  songs: SearchSong[];
}

/** 选 qrc；没有就选 lrc；都没有返回 undefined */
const pickFormatted = (
  qrc: string | undefined,
  lrc: string | undefined,
): { content: string; format: "qrc" | "lrc" } | undefined => {
  const q = qrc?.trim();
  if (q) return { content: q, format: "qrc" };
  const l = lrc?.trim();
  if (l) return { content: l, format: "lrc" };
  return undefined;
};

/** 按 QQMusic song id 直取歌词 */
export const getByPlatformId = async (id: string): Promise<LyricMatchResult | null> => {
  try {
    const body = (await callQQMusic("lyric", { id })) as LyricBody;
    if (body.code !== 200) {
      coreLog.warn(
        `[lyric:qqmusic] getByPlatformId(${id}) code=${body.code}: ${body.message ?? "no message"}`,
      );
      return null;
    }

    const main = pickFormatted(body.qrc, body.lrc);
    if (!main || !isValidLyric(main.content)) return null;

    const trans = body.trans?.trim();
    const roma = body.roma?.trim();

    return {
      platform: "qqmusic",
      format: main.format,
      content: main.content,
      translation: trans || undefined,
      translationFormat: trans ? "lrc" : undefined,
      romaji: roma || undefined,
      romajiFormat: roma ? "lrc" : undefined,
    };
  } catch (err) {
    coreLog.warn(`[lyric:qqmusic] getByPlatformId(${id}) failed:`, err);
    return null;
  }
};

/** 按 Track 元数据模糊搜索：search → rankCandidates → 串行 fetch 到有效歌词为止 */
export const getByQuery = async (track: Track): Promise<LyricMatchResult | null> => {
  const keyword = `${track.title} ${track.artists[0]?.name ?? ""}`.trim();
  if (!keyword) return null;

  let songs: SearchSong[] = [];
  try {
    const body = (await callQQMusic("search", { keywords: keyword, limit: 25 })) as SearchBody;
    if (body.code !== 200) return null;
    songs = body.songs ?? [];
  } catch (err) {
    coreLog.warn(`[lyric:qqmusic] search("${keyword}") failed:`, err);
    return null;
  }

  const candidates: LyricCandidate<{ id: string }>[] = songs.map((s) => ({
    platform: "qqmusic",
    name: s.name,
    artist: s.artist,
    album: s.album,
    duration: s.duration,
    extra: { id: s.id },
  }));

  const ranked = rankCandidates(candidates, track);
  coreLog.info(
    `[lyric:qqmusic] fuzzy "${keyword}" → ${candidates.length} hits, ${ranked.length} ranked`,
  );

  for (const cand of ranked) {
    const result = await getByPlatformId(cand.extra.id);
    if (result) return result;
  }
  return null;
};
