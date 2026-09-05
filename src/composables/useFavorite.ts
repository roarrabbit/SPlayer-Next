import type { Track } from "@shared/types/player";
import { useLibraryStore } from "@/stores/library";
import { useUserStore } from "@/stores/user";
import { usePlaylistStore } from "@/stores/playlist";
import { useSettingsStore } from "@/stores/settings";
import { toast } from "@/composables/useToast";
import i18n from "@/i18n";

/**
 * 记一次收藏变更
 * @param track 歌曲
 * @param liked 是否已收藏
 */
const recordFavoriteChange = (track: Track, liked: boolean): void => {
  window.api.stats.recordFavorite({ track, action: liked ? "add" : "remove" });
};

/**
 * 红心收藏的统一入口
 * 按 track.source 分发
 * 返回的 `isLiked` 在模板里直接调用即可保持响应式
 * - local: useLibraryStore.toggleLike
 * - netease: useUserStore.toggleLike
 * - qqmusic / kugou: 本地爱心歌单缓冲（usePlaylistStore.toggleHeart）
 */
export const useFavorite = () => {
  const library = useLibraryStore();
  const user = useUserStore();
  const playlist = usePlaylistStore();
  const settings = useSettingsStore();
  const t = (key: string): string => i18n.global.t(key);

  /**
   * 同步喜欢到 Last.fm（未开启/未连接时由主进程静默兜底）
   * @param track - 歌曲
   * @param loved - 是否已喜欢
   */
  const syncLastfmLove = (track: Track, loved: boolean): void => {
    if (!settings.system.lastfm.enabled || !settings.system.lastfm.loveSync) return;
    const artist = track.artists?.[0]?.name ?? "";
    if (!artist || !track.title) return;
    void window.api.lastfm.love(artist, track.title, loved).catch(() => {});
  };

  /**
   * 当前 Track 是否已收藏
   * @param track 歌曲
   * @returns 是否已收藏
   */
  const isLiked = (track: Track | null | undefined): boolean => {
    if (!track) return false;
    if (track.source === "local") return library.isLiked(track.id);
    if (track.source === "netease") return user.isLiked(track.id);
    if (track.source === "qqmusic" || track.source === "kugou") {
      return playlist.isHeartLoved(track.id);
    }
    return false;
  };

  /**
   * 是否支持收藏
   * @param track 歌曲
   * @returns 是否支持收藏
   */
  const isSupported = (track: Track | null | undefined): boolean => {
    if (!track) return false;
    if (track.source === "local") return true;
    if (track.source === "netease") return user.isLoggedIn;
    if (track.source === "qqmusic" || track.source === "kugou") return playlist.heartReady;
    return false;
  };

  /**
   * 切换收藏
   * @param track 歌曲
   * @returns 是否切换成功
   */
  const toggle = async (track: Track | null | undefined): Promise<void> => {
    if (!track) return;
    if (track.source === "local") {
      const next = library.toggleLike(track.id);
      recordFavoriteChange(track, next);
      syncLastfmLove(track, next);
      toast.success(t(next ? "liked.toast.added" : "liked.toast.removed"));
      return;
    }
    if (track.source === "netease") {
      if (!user.isLoggedIn) {
        toast.warning(t("liked.toast.needLogin"));
        return;
      }
      const wasLiked = user.isLiked(track.id);
      const ok = await user.toggleLike(track.id);
      if (!ok) {
        toast.error(t("liked.toast.failed"));
        return;
      }
      recordFavoriteChange(track, !wasLiked);
      syncLastfmLove(track, !wasLiked);
      toast.success(t(wasLiked ? "liked.toast.removed" : "liked.toast.added"));
      return;
    }
    if (track.source === "qqmusic" || track.source === "kugou") {
      try {
        const loved = await playlist.toggleHeart(track);
        recordFavoriteChange(track, loved);
        syncLastfmLove(track, loved);
        toast.success(t(loved ? "liked.toast.added" : "liked.toast.removed"));
      } catch {
        toast.error(t("liked.toast.failed"));
      }
      return;
    }
    toast.warning(t("liked.toast.unsupported"));
  };

  return { isLiked, isSupported, toggle };
};
