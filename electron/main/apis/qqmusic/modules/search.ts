/**
 * 综合搜索（单曲 / 歌手 / 专辑 / 歌单）
 *
 * params:
 * - keywords  关键词（必填）
 * - page      页码，默认 1
 * - limit     每页数，默认 30
 * - type      0 单曲 / 1 歌手 / 2 专辑 / 3 歌单，默认 0
 *
 * 端点（按类型）：
 * - 0 → musicu.fcg / DoSearchForQQMusicLite（与 dev 分支一致，稳定）
 * - 1/2 → c.y.qq.com/.../client_search_cp（jsososo/QQMusicApi 路径，t=9 singer/t=8 album）
 * - 3 → c.y.qq.com/.../client_music_search_songlist
 */

import { qmRequest } from "../core/request";
import { QM_HEADERS, formatSingerName } from "../core/config";
import type { QMModule } from "../core/types";

const C_SEARCH_URL = "https://c.y.qq.com/soso/fcgi-bin/client_search_cp";
const C_SONGLIST_URL = "https://c.y.qq.com/soso/fcgi-bin/client_music_search_songlist";

const ALBUM_COVER = (mid: string): string =>
  `https://y.gtimg.cn/music/photo_new/T002R300x300M000${mid}.jpg`;
const SINGER_COVER = (mid: string): string =>
  `https://y.gtimg.cn/music/photo_new/T001R300x300M000${mid}.jpg`;

/** 移动端随机 search_id */
const genSearchId = (): string =>
  String(
    Math.floor(Math.random() * 20) * 18014398509481984 +
      Math.floor(Math.random() * 4194304) * 4294967296 +
      (Date.now() % 86400000),
  );

/** c.y.qq.com 返回有时包了 jsonCallback(...)，去壳 */
const stripCallback = (text: string): string =>
  text.replace(/^[a-zA-Z_]+\(/, "").replace(/\)$/, "");

const callCSearch = async <T>(
  url: string,
  query: Record<string, string | number>,
): Promise<T> => {
  const qs = new URLSearchParams(Object.entries(query).map(([k, v]) => [k, String(v)]));
  const res = await fetch(`${url}?${qs}`, {
    headers: { Referer: "https://y.qq.com", "User-Agent": QM_HEADERS["User-Agent"] },
    signal: AbortSignal.timeout(8000),
  });
  if (res.status !== 200) throw new Error(`QM c.y HTTP ${res.status}`);
  const text = await res.text();
  return JSON.parse(stripCallback(text.trim())) as T;
};

interface QMSong {
  id: number;
  mid: string;
  title: string;
  interval: number;
  singer?: Array<{ id?: number; mid?: string; name?: string }>;
  album?: { id?: number; mid?: string; name?: string };
  file?: {
    media_mid?: string;
    size_128mp3?: number;
    size_320mp3?: number;
    size_flac?: number;
    size_hires?: number;
  };
}

const searchSongs = async (keywords: string, page: number, limit: number) => {
  const data = await qmRequest<{
    body?: { item_song?: QMSong[]; meta?: { sum?: number } };
  }>("music.search.SearchCgiService", "DoSearchForQQMusicLite", {
    search_id: genSearchId(),
    remoteplace: "search.android.keyboard",
    query: keywords,
    search_type: 0,
    num_per_page: limit,
    page_num: page,
    highlight: 0,
    nqc_flag: 0,
    page_id: 1,
    grp: 1,
  });

  const songs = (data?.body?.item_song ?? []).map((song) => ({
    id: String(song.id),
    mid: song.mid,
    name: song.title,
    artist: formatSingerName(song.singer),
    album: song.album?.name ?? "",
    albumMid: song.album?.mid ?? "",
    duration: (song.interval ?? 0) * 1000,
    mediaMid: song.file?.media_mid ?? "",
  }));

  return {
    code: 200,
    total: data?.body?.meta?.sum ?? songs.length,
    songs,
  };
};

interface CSingerItem {
  singerID?: number;
  singerMID?: string;
  singerName?: string;
  singerPic?: string;
  songNum?: number;
  albumNum?: number;
}

const searchArtists = async (keywords: string, page: number, limit: number) => {
  const data = await callCSearch<{
    data?: { singer?: { list?: CSingerItem[]; totalnum?: number; curnum?: number } };
  }>(C_SEARCH_URL, {
    format: "json",
    n: limit,
    p: page,
    w: keywords,
    cr: 1,
    g_tk: 5381,
    t: 9,
  });

  const list = data?.data?.singer?.list ?? [];
  const artists = list.map((item) => ({
    id: String(item.singerID ?? ""),
    mid: item.singerMID ?? "",
    name: item.singerName ?? "",
    cover: item.singerPic || (item.singerMID ? SINGER_COVER(item.singerMID) : ""),
    songCount: item.songNum ?? 0,
    albumCount: item.albumNum ?? 0,
  }));
  return { code: 200, total: data?.data?.singer?.totalnum ?? artists.length, artists };
};

interface CAlbumItem {
  albumID?: number;
  albumMID?: string;
  albumName?: string;
  albumPic?: string;
  singerName?: string;
  singer_list?: Array<{ name?: string }>;
  song_count?: number;
  songNum?: number;
  publicTime?: string;
  publishDate?: string;
}

const searchAlbums = async (keywords: string, page: number, limit: number) => {
  const data = await callCSearch<{
    data?: { album?: { list?: CAlbumItem[]; totalnum?: number; curnum?: number } };
  }>(C_SEARCH_URL, {
    format: "json",
    n: limit,
    p: page,
    w: keywords,
    cr: 1,
    g_tk: 5381,
    t: 8,
  });

  const list = data?.data?.album?.list ?? [];
  const albums = list.map((item) => ({
    id: String(item.albumID ?? ""),
    mid: item.albumMID ?? "",
    name: item.albumName ?? "",
    cover: item.albumPic || (item.albumMID ? ALBUM_COVER(item.albumMID) : ""),
    artist: item.singerName || formatSingerName(item.singer_list),
    trackCount: item.song_count ?? item.songNum ?? 0,
    publicTime: item.publicTime ?? item.publishDate ?? "",
  }));
  return { code: 200, total: data?.data?.album?.totalnum ?? albums.length, albums };
};

interface CSonglistItem {
  dissid?: number | string;
  dissname?: string;
  imgurl?: string;
  creator?: { name?: string };
  song_count?: number;
  listennum?: number;
}

const searchPlaylists = async (keywords: string, page: number, limit: number) => {
  const data = await callCSearch<{
    data?: { list?: CSonglistItem[]; display_num?: number; sum?: number };
  }>(C_SONGLIST_URL, {
    remoteplace: "txt.yqq.playlist",
    page_no: page - 1,
    num_per_page: limit,
    query: keywords,
    format: "json",
    g_tk: 5381,
  });

  const list = data?.data?.list ?? [];
  const playlists = list.map((item) => ({
    id: String(item.dissid ?? ""),
    name: item.dissname ?? "",
    cover: item.imgurl ?? "",
    creator: item.creator?.name ?? "",
    trackCount: item.song_count ?? 0,
    playCount: item.listennum ?? 0,
  }));
  return {
    code: 200,
    total: data?.data?.display_num ?? data?.data?.sum ?? playlists.length,
    playlists,
  };
};

const search: QMModule = async (params) => {
  const {
    keywords,
    page = 1,
    limit = 30,
    type = 0,
  } = params as {
    keywords?: string;
    page?: number;
    limit?: number;
    type?: number;
  };

  if (!keywords) return { code: 400, total: 0, message: "keywords required" };

  if (type === 1) return searchArtists(keywords, page, limit);
  if (type === 2) return searchAlbums(keywords, page, limit);
  if (type === 3) return searchPlaylists(keywords, page, limit);
  return searchSongs(keywords, page, limit);
};

export default search;
