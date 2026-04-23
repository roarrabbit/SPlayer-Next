/**
 * 跨平台歌词匹配
 */

export * as netease from "./netease";
export * as qqmusic from "./qqmusic";
export * as kugou from "./kugou";

export { durationCloseMs, isValidLyric, normalize, rankCandidates } from "./utils";
export type { LyricCandidate } from "./utils";
