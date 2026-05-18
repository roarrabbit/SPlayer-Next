import localforage from "localforage";
import type { Album, Artist, Playlist, Track } from "@shared/types/player";
import type { UserProfile, UserSubcount } from "@/types/user";
import { clearNeteaseSession } from "@/apis/netease";
import {
  fetchLoginStatus,
  refreshLogin as refreshLoginApi,
  logoutNetease,
} from "@/apis/login/netease";
import {
  fetchLikelist,
  fetchPlaylist,
  fetchSubcount,
  fetchUserAlbums,
  fetchUserArtists,
  fetchUserLevel,
  fetchUserPlaylists,
  toggleLikeSong,
} from "@/apis/user/netease";

/** 登录 cookie 保活间隔 */
const REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000;

/** 用户数据持久化键 */
/** 「我喜欢的音乐」歌单曲目 */
const LIKED_PLAYLIST_CACHE_KEY = "liked-playlist";
/** 用户红心 id 列表 */
const LIKED_SONG_IDS_CACHE_KEY = "liked-song-ids";
/** 用户歌单元数据列表 */
const PLAYLISTS_CACHE_KEY = "playlists";

interface LikedPlaylistCache {
  playlistId: string;
  tracks: Track[];
  cachedAt: number;
}

const cacheDb = localforage.createInstance({ name: "splayer", storeName: "user-cache" });

const EMPTY_SUBCOUNT: UserSubcount = {
  createdPlaylistCount: 0,
  subPlaylistCount: 0,
  artistCount: 0,
};

export const useUserStore = defineStore(
  "user",
  () => {
    /** 用户基础资料 */
    const profile = ref<UserProfile | null>(null);
    /** 上一次 login_refresh 时间戳（毫秒） */
    const lastRefreshAt = ref<number>(0);
    /** 是否已登录 */
    const isLoggedIn = computed(() => profile.value !== null);
    /** 全部歌单 */
    const playlists = shallowRef<Playlist[]>([]);
    /** 红心歌曲 id 集合 */
    const likedSongIds = ref<Set<string>>(new Set());
    /** 收藏专辑 */
    const albums = shallowRef<Album[]>([]);
    /** 收藏歌手 */
    const artists = shallowRef<Artist[]>([]);
    /** 用户等级 */
    const level = ref<number | undefined>(undefined);
    /** 订阅计数 */
    const subcount = ref<UserSubcount>(EMPTY_SUBCOUNT);
    /** 内容拉取最近时间（ms） */
    const lastFetchedAt = ref<number>(0);
    /** 是否在拉内容 */
    const contentLoading = ref(false);
    /** 「我喜欢的音乐」歌单 */
    const likedPlaylistTracks = shallowRef<Track[]>([]);
    /** 是否在拉取歌单曲目 */
    const likedPlaylistLoading = ref(false);
    /** 当前 tracks 关联的 playlistId */
    let currentLikedPlaylistId: string | null = null;
    /** 进行中的拉取 */
    let likedPlaylistAbort: AbortController | null = null;

    /** 「我喜欢的音乐」歌单 id */
    const likedPlaylistId = computed<string | null>(() => playlists.value[0]?.id ?? null);

    /**
     * 自建歌单
     * NCM /user/playlist 返回数组前 createdPlaylistCount 条为自建，其后为收藏
     */
    const createdPlaylists = computed<Playlist[]>(() => {
      const n = subcount.value.createdPlaylistCount || 0;
      if (n <= 0) return playlists.value.slice(0, 1);
      return playlists.value.slice(0, n);
    });

    /** 收藏歌单 */
    const subscribedPlaylists = computed<Playlist[]>(() => {
      const n = subcount.value.createdPlaylistCount || 0;
      return playlists.value.slice(n > 0 ? n : 1);
    });

    /** 是否红心 */
    const isLiked = (trackId: string): boolean => likedSongIds.value.has(trackId);

    /** 清空所有用户内容 */
    const clearContent = (): void => {
      playlists.value = [];
      likedSongIds.value = new Set();
      albums.value = [];
      artists.value = [];
      level.value = undefined;
      subcount.value = EMPTY_SUBCOUNT;
      lastFetchedAt.value = 0;
      likedPlaylistAbort?.abort();
      likedPlaylistTracks.value = [];
      likedPlaylistLoading.value = false;
      currentLikedPlaylistId = null;
    };

    /** 从缓存填充喜欢歌单 */
    const hydrateLikedPlaylistFromCache = async (playlistId: string): Promise<void> => {
      try {
        const cached = await cacheDb.getItem<LikedPlaylistCache>(LIKED_PLAYLIST_CACHE_KEY);
        if (cached && cached.playlistId === playlistId && cached.tracks.length > 0) {
          likedPlaylistTracks.value = cached.tracks;
        }
      } catch {
        console.error("[user] hydrate liked playlist from cache failed");
      }
    };

    /** 拉取最新喜欢歌单曲目 */
    const refreshLikedPlaylist = async (playlistId: string): Promise<void> => {
      likedPlaylistAbort?.abort();
      const controller = new AbortController();
      likedPlaylistAbort = controller;
      if (likedPlaylistTracks.value.length === 0) likedPlaylistLoading.value = true;
      try {
        const accumulated: Track[] = [];
        await fetchPlaylist(playlistId, {
          signal: controller.signal,
          fresh: true,
          onBatch: (batch) => {
            if (controller.signal.aborted) return;
            accumulated.push(...batch);
            likedPlaylistTracks.value = [...accumulated];
          },
        });
        if (controller.signal.aborted) return;
        if (accumulated.length > 0) {
          const payload: LikedPlaylistCache = {
            playlistId,
            tracks: accumulated.map((track) => ({ ...track })),
            cachedAt: Date.now(),
          };
          cacheDb.setItem(LIKED_PLAYLIST_CACHE_KEY, payload).catch(() => {});
        }
      } finally {
        if (!controller.signal.aborted) likedPlaylistLoading.value = false;
      }
    };

    /**
     * 确保「我喜欢的音乐」曲目已就绪
     * - 首次访问该歌单：缓存即时上屏 + 网络刷新
     * - 再次访问：仅当 likedSongIds 数量与已加载曲目数量不一致时才刷新（外部增删过 → 数据脏）
     * @param force true 强制走网络刷新（用户手动点刷新时用）
     */
    const ensureLikedPlaylist = async (force = false): Promise<void> => {
      const playlistId = likedPlaylistId.value;
      if (!playlistId) return;
      if (currentLikedPlaylistId !== playlistId) {
        currentLikedPlaylistId = playlistId;
        likedPlaylistTracks.value = [];
        await hydrateLikedPlaylistFromCache(playlistId);
        refreshLikedPlaylist(playlistId);
        return;
      }
      if (force || likedSongIds.value.size !== likedPlaylistTracks.value.length) {
        refreshLikedPlaylist(playlistId);
      }
    };

    /** 从缓存恢复轻量内容 */
    const hydrateContentFromCache = async (): Promise<void> => {
      try {
        const [cachedIds, cachedPlaylists] = await Promise.all([
          cacheDb.getItem<string[]>(LIKED_SONG_IDS_CACHE_KEY),
          cacheDb.getItem<Playlist[]>(PLAYLISTS_CACHE_KEY),
        ]);
        if (Array.isArray(cachedIds) && cachedIds.length > 0) {
          likedSongIds.value = new Set(cachedIds);
        }
        if (Array.isArray(cachedPlaylists) && cachedPlaylists.length > 0) {
          playlists.value = cachedPlaylists;
        }
      } catch {
        console.error("[user] hydrate content from cache failed");
      }
    };

    /**
     * 全量拉取用户内容
     * 并行发起，失败的子任务不会阻塞其他类目
     */
    const loadContent = async (uid: number): Promise<void> => {
      if (!uid) return;
      contentLoading.value = true;
      // 缓存即时上屏，不阻塞后续网络
      await hydrateContentFromCache();
      try {
        const sub = await fetchSubcount().catch((err) => {
          console.warn("[user] subcount failed:", err);
          return EMPTY_SUBCOUNT;
        });
        subcount.value = sub;
        const playlistTotal = (sub.createdPlaylistCount || 0) + (sub.subPlaylistCount || 0) || 50;
        const settled = await Promise.allSettled([
          fetchUserPlaylists(uid, playlistTotal),
          fetchLikelist(uid),
          fetchUserAlbums(),
          fetchUserArtists(),
          fetchUserLevel(),
        ]);
        /** 拉取结果 */
        const [plRes, likeRes, albumRes, artistRes, levelRes] = settled;
        if (plRes.status === "fulfilled") {
          playlists.value = plRes.value;
          cacheDb.setItem(PLAYLISTS_CACHE_KEY, plRes.value).catch(() => {});
        }
        if (likeRes.status === "fulfilled") {
          likedSongIds.value = new Set(likeRes.value);
          cacheDb.setItem(LIKED_SONG_IDS_CACHE_KEY, likeRes.value).catch(() => {});
        }
        if (albumRes.status === "fulfilled") albums.value = albumRes.value;
        if (artistRes.status === "fulfilled") artists.value = artistRes.value;
        if (levelRes.status === "fulfilled") level.value = levelRes.value;

        for (const r of settled) {
          if (r.status === "rejected") console.warn("[user] content load failed:", r.reason);
        }
        lastFetchedAt.value = Date.now();
      } finally {
        contentLoading.value = false;
      }
    };

    /**
     * 切换红心状态
     * @param trackId - 曲目全局 id
     */
    const toggleLike = async (trackId: string): Promise<boolean> => {
      const wasLiked = likedSongIds.value.has(trackId);
      const next = new Set(likedSongIds.value);
      if (wasLiked) next.delete(trackId);
      else next.add(trackId);
      likedSongIds.value = next;
      try {
        const ok = await toggleLikeSong(trackId, !wasLiked);
        if (!ok) throw new Error("like api returned non-200");
        cacheDb.setItem(LIKED_SONG_IDS_CACHE_KEY, [...next]).catch(() => {});
        return true;
      } catch (err) {
        const rollback = new Set(likedSongIds.value);
        if (wasLiked) rollback.add(trackId);
        else rollback.delete(trackId);
        likedSongIds.value = rollback;
        console.warn("[user] toggle like failed:", err);
        return false;
      }
    };

    /** 同步用户内容 */
    const syncContent = (uid: number | undefined): void => {
      if (uid) void loadContent(uid);
      else clearContent();
    };

    /** 用给定 profile 填充登录态 */
    const setProfile = (newProfile: UserProfile | null): void => {
      profile.value = newProfile;
      lastRefreshAt.value = newProfile ? Date.now() : 0;
      syncContent(newProfile?.userId);
    };

    /** 续期 cookie */
    const refresh = async (): Promise<void> => {
      try {
        await refreshLoginApi();
        lastRefreshAt.value = Date.now();
      } catch {}
    };

    /** 校验 cookie 并同步最新 profile 与用户内容 */
    const fetchStatus = async (): Promise<boolean> => {
      try {
        const latest = await fetchLoginStatus();
        if (latest) {
          profile.value = latest;
          syncContent(latest.userId);
          if (Date.now() - lastRefreshAt.value > REFRESH_INTERVAL_MS) {
            void refresh();
          }
          return true;
        }
        profile.value = null;
        lastRefreshAt.value = 0;
        syncContent(undefined);
        return false;
      } catch {
        // 网络失败保留缓存的 profile，不强制登出（离线可用性）
        return profile.value !== null;
      }
    };

    /** 登出 */
    const logout = async (): Promise<void> => {
      try {
        await logoutNetease();
      } catch {
        console.error("[user] logout failed");
      }
      await clearNeteaseSession();
      profile.value = null;
      lastRefreshAt.value = 0;
      syncContent(undefined);
    };

    return {
      profile,
      lastRefreshAt,
      isLoggedIn,
      setProfile,
      fetchStatus,
      logout,

      playlists,
      likedSongIds,
      albums,
      artists,
      level,
      subcount,
      lastFetchedAt,
      contentLoading,
      likedPlaylistId,
      likedPlaylistTracks,
      likedPlaylistLoading,
      createdPlaylists,
      subscribedPlaylists,
      isLiked,
      loadContent,
      toggleLike,
      ensureLikedPlaylist,
      clearContent,
    };
  },
  {
    persist: {
      storage: localStorage,
      pick: ["profile", "lastRefreshAt", "level"],
    },
  },
);
