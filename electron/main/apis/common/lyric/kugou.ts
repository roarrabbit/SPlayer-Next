/**
 * Kugou 歌词匹配
 *
 * 两个入口：
 *  - getByPlatformId(hash) 按 hash 直取（kugou 的主键是 hash，不是数字 id；
 *                          单 hash 无 name/duration，服务端命中率低，建议走 getByQuery）
 *  - getByQuery(track)     search → 打分 → 串行尝试直到拿到带时间戳的歌词
 *
 * 返回只带原生格式文本（krc / lrc + 翻译 / 罗马音），不做解析，交给渲染端。
 */

import { callKugou } from "@main/apis/kugou";
import { coreLog } from "@main/utils/logger";
import type { LyricMatchResult } from "@shared/types/lyrics";
import type { Track } from "@shared/types/player";
import { isValidLyric, rankCandidates, type LyricCandidate } from "./utils";

interface LyricBody {
  code: number;
  lrc?: string;
  krc?: string;
  trans?: string;
  roma?: string;
  message?: string;
}

interface SearchSong {
  id: string;
  hash: string;
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

/** 选 krc；没有就选 lrc；都没有返回 undefined */
const pickFormatted = (
  krc: string | undefined,
  lrc: string | undefined,
): { content: string; format: "krc" | "lrc" } | undefined => {
  const k = krc?.trim();
  if (k) return { content: k, format: "krc" };
  const l = lrc?.trim();
  if (l) return { content: l, format: "lrc" };
  return undefined;
};

/**
 * Kugou lyric 接口强依赖 hash + name + duration 三者：
 * 只有 hash 时服务端 candidates 基本为空，必须把 name/duration 一并传过去。
 */
const fetchLyric = async (args: {
  hash: string;
  name?: string;
  /** 毫秒 */
  durationMs?: number;
}): Promise<LyricMatchResult | null> => {
  try {
    const body = (await callKugou("lyric", {
      hash: args.hash,
      name: args.name ?? "",
      duration: args.durationMs ? Math.round(args.durationMs / 1000) : 0,
    })) as LyricBody;
    if (body.code !== 200) {
      coreLog.warn(
        `[lyric:kugou] fetchLyric(${args.hash}) code=${body.code}: ${body.message ?? "no message"}`,
      );
      return null;
    }

    const main = pickFormatted(body.krc, body.lrc);
    if (!main || !isValidLyric(main.content)) return null;

    const trans = body.trans?.trim();
    const roma = body.roma?.trim();

    return {
      platform: "kugou",
      format: main.format,
      content: main.content,
      translation: trans || undefined,
      translationFormat: trans ? "lrc" : undefined,
      romaji: roma || undefined,
      romajiFormat: roma ? "lrc" : undefined,
    };
  } catch (err) {
    coreLog.warn(`[lyric:kugou] fetchLyric(${args.hash}) failed:`, err);
    return null;
  }
};

/** 按 Kugou hash 直取（只有 hash 时用；精度受限） */
export const getByPlatformId = (hash: string): Promise<LyricMatchResult | null> =>
  fetchLyric({ hash });

/** 按 Track 元数据模糊搜索：search → rankCandidates → 串行 fetch 到有效歌词为止 */
export const getByQuery = async (track: Track): Promise<LyricMatchResult | null> => {
  const keyword = `${track.title} ${track.artists[0]?.name ?? ""}`.trim();
  if (!keyword) return null;

  let songs: SearchSong[] = [];
  try {
    const body = (await callKugou("search", { keywords: keyword, limit: 25 })) as SearchBody;
    if (body.code !== 200) return null;
    songs = body.songs ?? [];
  } catch (err) {
    coreLog.warn(`[lyric:kugou] search("${keyword}") failed:`, err);
    return null;
  }

  const candidates: LyricCandidate<{ hash: string }>[] = songs.map((s) => ({
    platform: "kugou",
    name: s.name,
    artist: s.artist,
    album: s.album,
    duration: s.duration,
    extra: { hash: s.hash },
  }));

  const ranked = rankCandidates(candidates, track);
  coreLog.info(
    `[lyric:kugou] fuzzy "${keyword}" → ${candidates.length} hits, ${ranked.length} ranked`,
  );

  for (const cand of ranked) {
    const result = await fetchLyric({
      hash: cand.extra.hash,
      name: cand.name,
      durationMs: cand.duration,
    });
    if (result) return result;
  }
  return null;
};
