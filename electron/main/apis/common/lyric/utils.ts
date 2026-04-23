/**
 * 歌词匹配 - 跨平台共享工具
 *
 * 归一化 / 打分 / 有效性校验。Netease / QQ / Kugou 都会复用。
 */

import type { Platform } from "@shared/types/platform";
import type { Track } from "@shared/types/player";

/**
 * 归一化后的候选项（主进程打分器内部数据结构，不跨进程）
 *
 * 各平台的 search 原始响应结构不同，归一化成本结构后 rankCandidates 才能统一打分。
 * 各端的 id / mid / hash 放在 extra 里，命中后用来发起 getByPlatformId。
 */
export interface LyricCandidate<Extra = unknown> {
  platform: Platform;
  name: string;
  artist: string;
  album?: string;
  /** 毫秒 */
  duration?: number;
  extra: Extra;
}

/** 字符串归一化：小写 + 去空白与常见分隔符 */
export const normalize = (s: string | undefined | null): string => {
  if (!s) return "";
  return s.toLowerCase().replace(/[、&;，,/|()·・\s\-_'"`~!?？！.。]+/g, "");
};

/** 歌词是否带时间戳 */
export const isValidLyric = (content: string | undefined | null): boolean => {
  if (!content) return false;
  return /\[\d+[:.]\d+/.test(content);
};

/** 时长是否接近（±5 秒） */
export const durationCloseMs = (a?: number, b?: number, tolMs = 5000): boolean => {
  if (!a || !b) return false;
  return Math.abs(a - b) <= tolMs;
};

const contains = (a: string, b: string): boolean =>
  a.length > 0 && b.length > 0 && (a.includes(b) || b.includes(a));

/**
 * 按分层规则排序候选
 *
 * 层级（只取第一个有命中的层）：
 *  1. name 全等 + artist 双向 includes
 *  2. artist 全等 + name 双向 includes
 *  3. album 全等 + artist 双向 includes + name 双向 includes
 *  4. name 双向 includes（兜底）
 *
 * 同层内：durationClose 优先，再按原顺序
 */
export const rankCandidates = <E>(
  candidates: LyricCandidate<E>[],
  track: Track,
): LyricCandidate<E>[] => {
  const qName = normalize(track.title);
  const qArtist = normalize(track.artists[0]?.name);
  const qAlbum = normalize(track.album?.name);
  const qDuration = track.duration;

  const tierOf = (c: LyricCandidate<E>): number => {
    const n = normalize(c.name);
    const ar = normalize(c.artist);
    const al = normalize(c.album);
    if (n === qName && contains(ar, qArtist)) return 1;
    if (ar === qArtist && contains(n, qName)) return 2;
    if (al && qAlbum && al === qAlbum && contains(ar, qArtist) && contains(n, qName)) return 3;
    if (contains(n, qName)) return 4;
    return 99;
  };

  return candidates
    .map((c, idx) => ({ c, idx, tier: tierOf(c) }))
    .filter((x) => x.tier < 99)
    .sort((a, b) => {
      if (a.tier !== b.tier) return a.tier - b.tier;
      const aClose = durationCloseMs(a.c.duration, qDuration) ? 0 : 1;
      const bClose = durationCloseMs(b.c.duration, qDuration) ? 0 : 1;
      if (aClose !== bClose) return aClose - bClose;
      return a.idx - b.idx;
    })
    .map((x) => x.c);
};
