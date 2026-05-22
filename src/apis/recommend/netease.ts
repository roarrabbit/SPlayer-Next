import type { Track } from "@shared/types/player";
import type { CoverItem } from "@/types/artist";
import { netease as neteaseApi } from "@/apis/netease";
import { songsToTracks, withPicSize } from "@/utils/format/netease";

/** 每日推荐歌曲（每日 30 首，需登录） */
export const fetchDailySongs = async (): Promise<Track[]> => {
  const body = await neteaseApi.recommend_songs({ timestamp: Date.now() });
  return songsToTracks(body?.data?.dailySongs);
};

/** 推荐歌单展示上限 */
const RECOMMEND_PLAYLIST_LIMIT = 12;
/** personalized 拉取数 */
const PERSONALIZED_FETCH_LIMIT = 20;

interface RawRecommendPlaylist {
  id: number | string;
  name: string;
  picUrl?: string;
  copywriter?: string;
  trackCount?: number;
}

/** 推荐歌单原始结构 → 封面卡片 */
const playlistToCover = (raw: RawRecommendPlaylist): CoverItem => ({
  id: String(raw.id),
  title: raw.name,
  cover: withPicSize(raw.picUrl),
  subtitle: raw.copywriter || undefined,
  trackCount: raw.trackCount ?? 0,
});

/**
 * 推荐歌单
 * 已登录取每日专属歌单（recommend/resource），未登录取通用推荐（personalized）；
 * 过滤掉「私人雷达」类个性化歌单
 * @param loggedIn - 是否已登录
 * @returns 歌单封面卡片列表
 */
export const fetchRecommendPlaylists = async (loggedIn: boolean): Promise<CoverItem[]> => {
  const list = loggedIn
    ? ((await neteaseApi.recommend_resource<{ recommend?: RawRecommendPlaylist[] }>())?.recommend ??
      [])
    : ((
        await neteaseApi.personalized<{ result?: RawRecommendPlaylist[] }>({
          limit: PERSONALIZED_FETCH_LIMIT,
        })
      )?.result ?? []);
  return list
    .filter((raw) => !raw.name.includes("私人雷达"))
    .slice(0, RECOMMEND_PLAYLIST_LIMIT)
    .map(playlistToCover);
};
