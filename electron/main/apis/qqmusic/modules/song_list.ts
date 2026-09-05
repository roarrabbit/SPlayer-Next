/**
 * 歌单详情
 * 使用 c.y.qq.com 的 GET 接口（不走 musicu.fcg）
 * 端点：https://c.y.qq.com/qzone/fcg-bin/fcg_ucc_getcdinfo_byids_cp.fcg
 *
 * params:
 * - id  disstid（歌单 ID，必填）
 */

import { QM_HEADERS, formatSingerName } from "../core/config";
import type { QMModule } from "../core/types";

interface CdSongItem {
  songid?: number;
  songmid?: string;
  songname?: string;
  interval?: number;
  singer?: Array<{ name?: string; mid?: string }>;
  albumname?: string;
  albummid?: string;
  strMediaMid?: string;
  pay?: {
    payalbum?: number;
    payplay?: number;
  };
  size128?: number;
  size320?: number;
  sizeape?: number;
  sizeflac?: number;
  sizeogg?: number;
}

interface CdListResp {
  code?: number;
  cdlist?: Array<{
    disstid?: number;
    dissname?: string;
    desc?: string;
    nickname?: string;
    logo?: string;
    visitnum?: number;
    songlist?: CdSongItem[];
  }>;
}

const SONGLIST_URL =
  "https://c.y.qq.com/qzone/fcg-bin/fcg_ucc_getcdinfo_byids_cp.fcg?type=1&json=1&utf8=1&onlysonglist=0&platform=yqq&needNewCode=0";

const songList: QMModule = async (params) => {
  const { id } = params;

  const url = `${SONGLIST_URL}&disstid=${id}`;
  const res = await fetch(url, { headers: QM_HEADERS });
  const data = (await res.json()) as CdListResp;

  const cd = data.cdlist?.[0];
  if (!cd) return { code: 404, message: "歌单不存在" };

  const songs = (cd.songlist ?? []).map((item) => ({
    id: String(item.songid ?? ""),
    mid: item.songmid ?? "",
    name: item.songname ?? "",
    artist: formatSingerName(item.singer),
    album: item.albumname ?? "",
    albumMid: item.albummid ?? "",
    duration: (item.interval ?? 0) * 1000,
    mediaMid: item.strMediaMid ?? "",
    pay: item.pay,
    size128: item.size128 ?? 0,
    size320: item.size320 ?? 0,
    sizeApe: item.sizeape ?? 0,
    sizeFlac: item.sizeflac ?? 0,
    sizeOgg: item.sizeogg ?? 0,
  }));

  return {
    code: 200,
    id: cd.disstid,
    name: cd.dissname ?? "",
    description: cd.desc ?? "",
    creator: cd.nickname ?? "",
    cover: cd.logo ?? "",
    playCount: cd.visitnum ?? 0,
    songs,
  };
};

export default songList;
