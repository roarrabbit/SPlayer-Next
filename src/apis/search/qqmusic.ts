import type { Track } from "@shared/types/player";
import type { CoverItem } from "@/types/artist";
import { qqmusic as qmApi } from "@/apis/qqmusic";
import type { SearchResult } from "./index";

/** 主进程返回的单曲行 */
interface QMSong {
  id: string;
  mid?: string;
  name: string;
  artist: string;
  album?: string;
  albumMid?: string;
  duration: number;
}
interface QMAlbumRow {
  id: string;
  mid?: string;
  name: string;
  cover?: string;
  artist?: string;
  trackCount?: number;
}
interface QMArtistRow {
  id: string;
  mid?: string;
  name: string;
  cover?: string;
  songCount?: number;
  albumCount?: number;
}
interface QMPlaylistRow {
  id: string;
  name: string;
  cover?: string;
  creator?: string;
  trackCount?: number;
}

interface SongsResp {
  total?: number;
  songs?: QMSong[];
}
interface AlbumsResp {
  total?: number;
  albums?: QMAlbumRow[];
}
interface ArtistsResp {
  total?: number;
  artists?: QMArtistRow[];
}
interface PlaylistsResp {
  total?: number;
  playlists?: QMPlaylistRow[];
}

/** type 编码，对齐主进程 search_type */
const TYPE = { songs: 0, artists: 1, albums: 2, playlists: 3 } as const;

const call = <T>(
  type: keyof typeof TYPE,
  keyword: string,
  offset: number,
  limit: number,
): Promise<T> =>
  qmApi.search<T>({
    keywords: keyword,
    type: TYPE[type],
    page: Math.floor(offset / limit) + 1,
    limit,
  });

const albumCoverByMid = (mid: string): string =>
  `https://y.gtimg.cn/music/photo_new/T002R300x300M000${mid}.jpg`;

const songToTrack = (song: QMSong): Track => {
  const cover = song.albumMid ? albumCoverByMid(song.albumMid) : undefined;
  return {
    id: song.mid || song.id,
    source: "online",
    platform: "qqmusic",
    title: song.name,
    // QM 的 song.artist 是合并字符串（"A / B"），没单独 id，列表里会自动暗显
    artists: song.artist ? [{ name: song.artist }] : [],
    // 在线专辑详情页还没接通（Artist.vue 的 TODO: online），暂不把 albumMid 当 id 暴露，
    // 列表里会跟 artist 一起暗显；mid 只留给封面 URL
    album: song.album ? { name: song.album, cover } : undefined,
    duration: song.duration ?? 0,
    cover,
  };
};

const albumToCover = (album: QMAlbumRow): CoverItem => ({
  id: album.mid || album.id,
  title: album.name,
  cover: album.cover,
  subtitle: album.artist ?? "",
  trackCount: album.trackCount ?? 0,
});

const artistToCover = (artist: QMArtistRow): CoverItem => ({
  id: artist.mid || artist.id,
  title: artist.name,
  cover: artist.cover,
  subtitle: "",
  trackCount: artist.albumCount ?? 0,
});

const playlistToCover = (playlist: QMPlaylistRow): CoverItem => ({
  id: playlist.id,
  title: playlist.name,
  cover: playlist.cover,
  subtitle: playlist.creator ?? "",
  trackCount: playlist.trackCount ?? 0,
});

/** QM 多个接口不返回可靠总数，用满页启发式判断是否还有下一页 */
const hasMoreByPage = (got: number, limit: number): boolean => got >= limit;

export const songs = async (
  keyword: string,
  offset: number,
  limit: number,
): Promise<SearchResult<Track>> => {
  const body = await call<SongsResp>("songs", keyword, offset, limit);
  const items = (body?.songs ?? []).map(songToTrack);
  const total = body?.total ?? items.length;
  return { items, total, hasMore: hasMoreByPage(items.length, limit) };
};

export const albums = async (
  keyword: string,
  offset: number,
  limit: number,
): Promise<SearchResult<CoverItem>> => {
  const body = await call<AlbumsResp>("albums", keyword, offset, limit);
  const items = (body?.albums ?? []).map(albumToCover);
  const total = body?.total ?? items.length;
  return { items, total, hasMore: hasMoreByPage(items.length, limit) };
};

export const artists = async (
  keyword: string,
  offset: number,
  limit: number,
): Promise<SearchResult<CoverItem>> => {
  const body = await call<ArtistsResp>("artists", keyword, offset, limit);
  const items = (body?.artists ?? []).map(artistToCover);
  const total = body?.total ?? items.length;
  return { items, total, hasMore: hasMoreByPage(items.length, limit) };
};

export const playlists = async (
  keyword: string,
  offset: number,
  limit: number,
): Promise<SearchResult<CoverItem>> => {
  const body = await call<PlaylistsResp>("playlists", keyword, offset, limit);
  const items = (body?.playlists ?? []).map(playlistToCover);
  const total = body?.total ?? items.length;
  return { items, total, hasMore: hasMoreByPage(items.length, limit) };
};
