/**
 * 网易云专属工具：原始接口数据 → 应用层模型 的格式化
 */

import type { AudioQuality, Track, TrackFee } from "@shared/types/player";
import type { NeteaseSong } from "@/types/netease";

/**
 * 网易云 fee → 应用层 TrackFee
 * 网易云 fee：0=免费 1=VIP 4=购买专辑 8=会员高音质（视作 VIP）
 * @param fee - 网易云原始 fee
 */
const toTrackFee = (fee: number | undefined): TrackFee | undefined => {
  if (fee === 0) return 0;
  if (fee === 1 || fee === 8) return 1;
  if (fee === 4) return 2;
  return undefined;
};

/**
 * 给网易云封面 URL 拼尺寸
 * @param url - 网易云封面原始 URL
 * @param size - 期望像素边长，默认 300
 */
export const withPicSize = (url: string | undefined, size = 300): string | undefined => {
  if (!url) return undefined;
  if (url.includes("?param=")) return url;
  return `${url}?param=${size}y${size}`;
};

/**
 * 根据网易云 song 对象选择最佳音质
 * @param song - 网易云原始 song 对象
 * @returns 最佳音质
 */
const pickQuality = (song: NeteaseSong): AudioQuality | undefined => {
  if (song.hr) {
    return {
      codec: "flac",
      sampleRate: Math.max(song.hr.sr ?? 0, 96000),
      bitsPerSample: 24,
      bitRate: song.hr.br,
      channels: 2,
    };
  }
  if (song.sq) {
    return {
      codec: "flac",
      sampleRate: song.sq.sr,
      bitsPerSample: 16,
      bitRate: song.sq.br,
      channels: 2,
    };
  }
  const mp3 = song.h ?? song.m ?? song.l;
  if (mp3) {
    return {
      codec: "mp3",
      sampleRate: mp3.sr,
      bitsPerSample: 16,
      bitRate: mp3.br,
      channels: 2,
    };
  }
  return undefined;
};

/**
 * 网易云 song → 应用层 Track
 * @param song - 网易云原始 song 对象
 */
export const songToTrack = (song: NeteaseSong): Track => {
  const cover = withPicSize(song.al?.picUrl);
  const coverOriginal = withPicSize(song.al?.picUrl, 1024);
  const comment = song.alia?.find((s) => s?.trim()) ?? undefined;
  return {
    id: String(song.id),
    source: "online",
    platform: "netease",
    title: song.name,
    comment,
    artists: (song.ar ?? []).map((artist) => ({ id: String(artist.id), name: artist.name })),
    album: song.al ? { id: String(song.al.id), name: song.al.name, cover } : undefined,
    duration: song.dt ?? 0,
    cover,
    coverOriginal,
    quality: pickQuality(song),
    fee: toTrackFee(song.fee),
  };
};

/**
 * 网易云 songs 列表 → Track 列表，空/缺省安全
 * @param songs - 接口返回的 songs 数组
 */
export const songsToTracks = (songs: NeteaseSong[] | undefined | null): Track[] =>
  songs?.map(songToTrack) ?? [];
