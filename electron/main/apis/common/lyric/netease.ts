/**
 * Netease 歌词匹配
 *
 * 两个入口：
 *  - getByPlatformId(id)    按 Netease song id 直取
 *  - getByQuery(track)      从 track.title/artists/album/duration 拼关键词
 *                           search → 打分 → 串行尝试直到拿到带时间戳的歌词
 *
 * 返回只带原生格式文本（yrc / lrc + 翻译 / 罗马音），不做解析，交给渲染端。
 */

import { callNetease } from "@main/apis/netease";
import { coreLog } from "@main/utils/logger";
import type { LyricMatchResult } from "@shared/types/lyrics";
import type { Track } from "@shared/types/player";
import { isValidLyric, rankCandidates, type LyricCandidate } from "./utils";

type LyricField = { lyric?: string } | undefined;

interface LyricBody {
  code: number;
  lrc?: LyricField;
  tlyric?: LyricField;
  romalrc?: LyricField;
  yrc?: LyricField;
  ytlrc?: LyricField;
  yromalrc?: LyricField;
}

interface SearchSong {
  id: number;
  name: string;
  artists?: { name: string }[];
  album?: { name?: string };
  duration?: number;
}

interface SearchBody {
  result?: { songs?: SearchSong[] };
}

/**
 * 优先选择逐字歌词
 * @param yrc yrc 歌词
 * @param lrc lrc 歌词
 */
const pickFormatted = (
  yrc: LyricField,
  lrc: LyricField,
): { content: string; format: "yrc" | "lrc" } | undefined => {
  const y = yrc?.lyric?.trim();
  if (y) return { content: y, format: "yrc" };
  const l = lrc?.lyric?.trim();
  if (l) return { content: l, format: "lrc" };
  return undefined;
};

/**
 * 按 id 直取歌词
 * @param id 歌曲 id
 */
export const getByPlatformId = async (id: string): Promise<LyricMatchResult | null> => {
  try {
    const { status, body } = await callNetease("lyric_new", { id });
    if (status !== 200) return null;
    const data = body as LyricBody;
    if (data.code !== 200) return null;
    // 主歌词
    const main = pickFormatted(data.yrc, data.lrc);
    if (!main || !isValidLyric(main.content)) return null;
    // 翻译歌词
    const trans = pickFormatted(data.ytlrc, data.tlyric);
    // 罗马音歌词
    const roma = pickFormatted(data.yromalrc, data.romalrc);
    return {
      platform: "netease",
      format: main.format,
      content: main.content,
      translation: trans?.content,
      translationFormat: trans?.format,
      romaji: roma?.content,
      romajiFormat: roma?.format,
    };
  } catch (err) {
    coreLog.warn(`[lyric:netease] getByPlatformId(${id}) failed:`, err);
    return null;
  }
};

/**
 * 按 Track 元数据模糊搜索：search → rankCandidates → 串行 fetch 到有效歌词为止
 * @param track 歌曲信息
 */
export const getByQuery = async (track: Track): Promise<LyricMatchResult | null> => {
  const keyword = `${track.title} ${track.artists[0]?.name ?? ""}`.trim();
  if (!keyword) return null;
  // 搜索歌曲
  let songs: SearchSong[] = [];
  try {
    const { status, body } = await callNetease("search", {
      keywords: keyword,
      type: 1,
      limit: 25,
    });
    if (status !== 200) return null;
    songs = (body as SearchBody).result?.songs ?? [];
  } catch (err) {
    coreLog.warn(`[lyric:netease] search("${keyword}") failed:`, err);
    return null;
  }
  //
  const candidates: LyricCandidate<{ id: string }>[] = songs.map((s) => ({
    platform: "netease",
    name: s.name,
    artist: (s.artists ?? []).map((a) => a.name).join(" / "),
    album: s.album?.name,
    duration: s.duration,
    extra: { id: String(s.id) },
  }));

  const ranked = rankCandidates(candidates, track);
  coreLog.info(
    `[lyric:netease] fuzzy "${keyword}" → ${candidates.length} hits, ${ranked.length} ranked`,
  );

  for (const cand of ranked) {
    const result = await getByPlatformId(cand.extra.id);
    if (result) return result;
  }
  return null;
};
