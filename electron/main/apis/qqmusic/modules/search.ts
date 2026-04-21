/**
 * 搜索歌曲
 * module: music.search.SearchCgiService / DoSearchForQQMusicMobile
 *
 * params:
 * - keywords  关键词（必填）
 * - page      页码，默认 1
 * - limit     每页数，默认 30
 * - type      0 单曲 / 1 歌手 / 2 专辑 / 3 歌单 / 4 MV / 7 歌词 / 8 用户，默认 0
 */

import { qmRequest } from "../core/request";
import { formatSingerName } from "../core/config";
import type { QMModule } from "../core/types";

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

const search: QMModule = async (params) => {
  const { keywords, page = 1, limit = 30, type = 0 } = params;

  const data = await qmRequest<{
    body?: { item_song?: QMSong[]; meta?: { sum?: number } };
  }>("music.search.SearchCgiService", "DoSearchForQQMusicMobile", {
    search_type: type,
    query: keywords,
    page_num: page,
    num_per_page: limit,
    highlight: 0,
    nqc_flag: 0,
    multi_zhida: 0,
    cat: 2,
    grp: 1,
    sin: 0,
    sem: 0,
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

export default search;
