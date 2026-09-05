import localforage from "localforage";
import type { Track } from "@shared/types/player";
import type { LegacyPlaylistRecord, PlaylistSummary } from "@shared/types/playlist";
import type { Collection } from "@/types/collection";
import i18n from "@/i18n";

const legacyDb = localforage.createInstance({ name: "splayer", storeName: "playlists" });

/** 爱心歌单固定 ID（QQ/酷狗等音源红心的落点，本地缓冲歌单） */
export const HEART_PLAYLIST_ID = "pl_loved_local";

export const usePlaylistStore = defineStore("playlist", () => {
  /** 本地歌单列表 */
  const playlists = shallowRef<PlaylistSummary[]>([]);
  const initialized = ref(false);
  /** 爱心歌单内的歌曲 ID（QQ/酷狗等在线歌的红心状态） */
  const heartTrackIds = ref<string[]>([]);
  /** 爱心歌单是否已就绪 */
  const heartReady = ref(false);

  /** 将旧版 IndexedDB 本地歌单一次性导入主进程 */
  const migrateLegacy = async (): Promise<void> => {
    const records: LegacyPlaylistRecord[] = [];
    await legacyDb.iterate<LegacyPlaylistRecord, void>((record) => {
      records.push({
        id: record.id,
        title: record.title,
        description: record.description,
        cover: record.cover,
        trackIds: record.trackIds,
        createTime: record.createTime,
        updateTime: record.updateTime,
      });
    });
    if (records.length === 0) return;
    await window.api.playlist.importLegacy(records);
    await legacyDb.clear();
  };

  /** 加载全部类型的歌单列表 */
  const load = async (): Promise<void> => {
    await migrateLegacy();
    playlists.value = await window.api.playlist.list();
    initialized.value = true;
    await ensureHeart(i18n.global.t("collection.heartPlaylist"));
  };

  /**
   * 保障爱心歌单存在并同步红心集合
   * @param title - 歌单标题（仅在首次创建时生效）
   */
  const ensureHeart = async (title: string): Promise<void> => {
    try {
      const heart = await window.api.playlist.ensureHeart(HEART_PLAYLIST_ID, title);
      if (!playlists.value.some((playlist) => playlist.id === HEART_PLAYLIST_ID)) {
        playlists.value = [heart, ...playlists.value];
      }
      const detail = await window.api.playlist.get(HEART_PLAYLIST_ID);
      heartTrackIds.value = detail?.tracks.map((track) => track.id) ?? [];
      heartReady.value = true;
    } catch (error) {
      console.error("[playlist] ensure heart playlist failed:", error);
    }
  };

  /**
   * 歌曲是否已加入爱心歌单
   * @param trackId - 歌曲 ID
   */
  const isHeartLoved = (trackId: string): boolean => heartTrackIds.value.includes(trackId);

  /**
   * 切换歌曲在爱心歌单中的红心状态
   * @param track - 歌曲
   * @returns 切换后是否已红心
   */
  const toggleHeart = async (track: Track): Promise<boolean> => {
    if (heartTrackIds.value.includes(track.id)) {
      await removeTracks(HEART_PLAYLIST_ID, [track.id]);
      heartTrackIds.value = heartTrackIds.value.filter((id) => id !== track.id);
      return false;
    }
    await addTracks(HEART_PLAYLIST_ID, [track]);
    heartTrackIds.value = [...heartTrackIds.value, track.id];
    return true;
  };

  /** 获取本地歌单完整数据 */
  const get = async (id: string): Promise<Collection | null> => {
    const detail = await window.api.playlist.get(id);
    if (!detail || detail.type !== "local") return null;
    return {
      id: detail.id,
      type: "playlist",
      source: "local",
      title: detail.title,
      description: detail.description,
      cover: detail.cover,
      tracks: detail.tracks,
      trackCount: detail.tracks.length,
      createTime: detail.createTime,
      updateTime: detail.updateTime,
    };
  };

  /** 创建本地歌单 */
  const create = async (title: string, description?: string): Promise<Collection> => {
    const created = await window.api.playlist.create({
      type: "local",
      title,
      description,
    });
    playlists.value = [created, ...playlists.value];
    return {
      id: created.id,
      type: "playlist",
      source: "local",
      title: created.title,
      description: created.description,
      cover: created.cover,
      tracks: [],
      trackCount: 0,
      createTime: created.createTime,
      updateTime: created.updateTime,
    };
  };

  /** 更新歌单信息 */
  const update = async (
    id: string,
    data: Partial<Pick<PlaylistSummary, "title" | "description">>,
  ): Promise<void> => {
    const updated = await window.api.playlist.update(id, data);
    if (!updated) return;
    playlists.value = playlists.value.map((playlist) => (playlist.id === id ? updated : playlist));
  };

  /** 删除歌单 */
  const remove = async (id: string): Promise<void> => {
    if (id === HEART_PLAYLIST_ID) return;
    await window.api.playlist.remove(id);
    playlists.value = playlists.value.filter((playlist) => playlist.id !== id);
  };

  /** 添加歌曲到本地歌单（本地歌曲存 ID，QQ/酷狗等在线歌曲存 Track JSON；网易云歌曲不入本地） */
  const addTracks = async (id: string, tracks: Track[]): Promise<number> => {
    const localIds = tracks.filter((track) => track.source === "local").map((track) => track.id);
    const onlineTracks = tracks.filter(
      (track) => track.source !== "local" && track.source !== "netease",
    );
    const [localCount, onlineCount] = await Promise.all([
      localIds.length > 0 ? window.api.playlist.addTracks(id, localIds) : Promise.resolve(0),
      onlineTracks.length > 0
        ? window.api.playlist.addOnlineTracks(id, onlineTracks)
        : Promise.resolve(0),
    ]);
    const count = localCount + onlineCount;
    if (count > 0) {
      const cover = tracks.find((track) => track.cover)?.cover;
      playlists.value = playlists.value.map((playlist) =>
        playlist.id === id
          ? {
              ...playlist,
              cover: cover ?? playlist.cover,
              trackCount: playlist.trackCount + count,
              updateTime: Date.now(),
            }
          : playlist,
      );
    }
    return count;
  };

  /** 从本地歌单移除歌曲 */
  const removeTracks = async (id: string, trackIds: string[]): Promise<void> => {
    const count = await window.api.playlist.removeTracks(id, trackIds);
    if (count === 0) return;
    if (id === HEART_PLAYLIST_ID) {
      const removed = new Set(trackIds);
      heartTrackIds.value = heartTrackIds.value.filter((tid) => !removed.has(tid));
    }
    playlists.value = playlists.value.map((playlist) => {
      if (playlist.id !== id) return playlist;
      const trackCount = Math.max(0, playlist.trackCount - count);
      return {
        ...playlist,
        cover: trackCount === 0 ? undefined : playlist.cover,
        trackCount,
        updateTime: Date.now(),
      };
    });
  };

  /** 清空全部歌单 */
  const clear = async (): Promise<void> => {
    await window.api.playlist.clear();
    await legacyDb.clear();
    playlists.value = [];
    heartTrackIds.value = [];
    heartReady.value = false;
  };

  return {
    playlists,
    localPlaylists: playlists,
    initialized,
    heartTrackIds,
    heartReady,
    load,
    ensureHeart,
    isHeartLoved,
    toggleHeart,
    get,
    create,
    update,
    remove,
    addTracks,
    removeTracks,
    clear,
  };
});
