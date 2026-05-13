import type { TrackSource } from "@shared/types/player";
import router from "@/router";

/**
 * 跳转到专辑页
 * 流媒体没拿到真实 albumId 时静默忽略，避免用专辑名当 ID 触发服务器 400
 * @param albumName - 专辑名称（本地用作聚合 key；流媒体仅用于 query 兜底显示）
 * @param options.source - 来源（local/streaming）；默认为 local
 * @param options.albumId - 流媒体专辑 ID
 */
export const navigateToAlbum = (
  albumName?: string,
  options: { source?: TrackSource; albumId?: string } = {},
) => {
  const source = options.source ?? "local";
  const id = source === "streaming" ? options.albumId : albumName;
  if (!id?.trim()) return;
  const query =
    source === "streaming" && albumName && albumName !== id ? { name: albumName } : undefined;
  router.push({
    name: "collection",
    params: { source, type: "album", id: encodeURIComponent(id) },
    query,
  });
};

/**
 * 跳转到歌手页
 * 流媒体没拿到真实 artistId 时静默忽略
 * @param artistName - 歌手名称（本地用作聚合 key；流媒体仅用于 query 兜底显示）
 * @param options.source - 来源（local/streaming）；默认为 local
 * @param options.artistId - 流媒体歌手 ID
 */
export const navigateToArtist = (
  artistName?: string,
  options: { source?: TrackSource; artistId?: string } = {},
) => {
  const source = options.source ?? "local";
  const id = source === "streaming" ? options.artistId : artistName;
  if (!id?.trim()) return;
  const query =
    source === "streaming" && artistName && artistName !== id ? { name: artistName } : undefined;
  router.push({
    name: "artist",
    params: { source, id: encodeURIComponent(id) },
    query,
  });
};
