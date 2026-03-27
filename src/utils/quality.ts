import type { AudioQuality } from "@shared/types/player";

/** 音质等级 */
export type QualityLevel = "hi-res" | "lossless" | "hq" | "sq" | "lq" | null;

/** 无损编解码器 */
const LOSSLESS_CODECS = new Set(["flac", "alac", "ape", "wav", "aiff", "wavpack", "tta"]);

/** 音质等级标签映射 */
const QUALITY_LABELS: Record<string, string> = {
  "hi-res": "高解析度无损",
  lossless: "无损",
  hq: "HQ",
  sq: "SQ",
  lq: "LQ",
};

/**
 * 判断音质等级
 * - Hi-Res：无损编码 + 采样率 ≥ 96kHz + 位深 ≥ 24bit
 * - 无损：无损编码
 * - HQ：有损 + 比特率 ≥ 320kbps
 * - SQ：有损 + 比特率 ≥ 192kbps
 * - LQ：有损 + 比特率 < 192kbps
 */
export const getQualityLevel = (quality: AudioQuality | undefined): QualityLevel => {
  if (!quality || quality.codec === "unknown") return null;
  const isLossless = LOSSLESS_CODECS.has(quality.codec.toLowerCase());
  if (isLossless) {
    if (quality.sampleRate >= 96000 && quality.bitsPerSample >= 24) return "hi-res";
    return "lossless";
  }
  const kbps = quality.bitRate / 1000;
  if (kbps >= 320) return "hq";
  if (kbps >= 192) return "sq";
  return "lq";
};

/** 获取音质等级的显示标签 */
export const getQualityLabel = (quality: AudioQuality | undefined): string | null => {
  const level = getQualityLevel(quality);
  return level ? (QUALITY_LABELS[level] ?? null) : null;
};

/** 是否为无损级别（hi-res 或 lossless） */
export const isLosslessQuality = (quality: AudioQuality | undefined): boolean => {
  const level = getQualityLevel(quality);
  return level === "hi-res" || level === "lossless";
};
