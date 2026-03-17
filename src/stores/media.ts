import { defineStore } from "pinia";
import { shallowRef } from "vue";
import type { MusicMetadata, ExternalLyric } from "@/types/player";

/** 静态媒体信息（加载时写入，播放期间不变） */
export interface MediaInfo {
  title?: string;
  artist?: string;
  album?: string;
  sampleRate: number;
  channels: number;
  cover?: string;
  embeddedLyric?: string;
  externalLyrics: ExternalLyric[];
}

/** 从 IPC 返回的完整元数据中提取静态媒体信息 */
export const toMediaInfo = (meta: MusicMetadata): MediaInfo => ({
  title: meta.title,
  artist: meta.artist,
  album: meta.album,
  sampleRate: meta.sampleRate,
  channels: meta.channels,
  cover: meta.cover,
  embeddedLyric: meta.embeddedLyric,
  externalLyrics: meta.externalLyrics,
});

export const useMediaStore = defineStore("media", () => {
  /** shallowRef：Vue 不深度代理歌词、封面等大数据 */
  const info = shallowRef<MediaInfo | null>(null);

  const setMedia = (media: MediaInfo): void => {
    info.value = media;
  };

  const clear = (): void => {
    info.value = null;
  };

  return { info, setMedia, clear };
});
