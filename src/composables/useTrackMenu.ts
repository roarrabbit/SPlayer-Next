import type { Ref } from "vue";
import type { Track, TrackSource } from "@shared/types/player";
import type { CollectionType } from "@/types/collection";
import type { DropdownMenuItem } from "@/components/ui/SDropdownMenu.vue";
import { usePlaylistStore } from "@/stores/playlist";
import * as player from "@/core/player";
import IconPlay from "~icons/lucide/play";
import IconListEnd from "~icons/lucide/list-end";
import IconListPlus from "~icons/lucide/list-plus";
import IconPlus from "~icons/lucide/plus";
import IconLucideListMusic from "~icons/lucide/list-music";
import IconFolderOpen from "~icons/lucide/folder-open";
import IconCopy from "~icons/lucide/copy";
import IconTrash2 from "~icons/lucide/trash-2";
import IconListMinus from "~icons/lucide/list-minus";

export interface TrackMenuOptions {
  /** 列表来源 */
  source?: TrackSource;
  /** 集合类型（仅 playlist 启用"从XX移除"） */
  collectionType?: CollectionType;
  /** 从集合移除回调 */
  onRemove?: (track: Track) => void;
  /** 删除文件回调 */
  onDeleteFile?: (track: Track) => void;
}

/**
 * 歌曲操作菜单
 * @param track - 当前操作的歌曲
 * @param options - 配置项
 */
export const useTrackMenu = (track: Ref<Track | undefined>, options: TrackMenuOptions = {}) => {
  const { t } = useI18n();
  const playlistStore = usePlaylistStore();

  // 状态判断
  const isLocal = options.source === "local";
  const isPlaylist = options.collectionType === "playlist";

  // 菜单项
  const items = computed<DropdownMenuItem[]>(() => [
    { key: "play", label: t("songList.context.play"), icon: markRaw(IconPlay) },
    { key: "playNext", label: t("songList.context.playNext"), icon: markRaw(IconListEnd) },
    {
      key: "addToPlaylist",
      label: t("collection.addTo", { type: t("collection.playlist") }),
      icon: markRaw(IconListPlus),
      separator: true,
      children: [
        {
          key: "playlist:new",
          label: t("collection.create", { type: t("collection.playlist") }),
          icon: markRaw(IconPlus),
        },
        ...(playlistStore.playlists.length > 0
          ? [
              { key: "playlist:divider", label: "", separator: true },
              ...playlistStore.playlists.map((pl) => ({
                key: `playlist:${pl.id}`,
                label: pl.title,
                icon: markRaw(IconLucideListMusic),
              })),
            ]
          : []),
      ],
    },
    {
      key: "showInExplorer",
      label: t("songList.context.showInExplorer"),
      icon: markRaw(IconFolderOpen),
      separator: true,
      show: isLocal,
    },
    {
      key: "copyPath",
      label: t("songList.context.copyPath"),
      icon: markRaw(IconCopy),
      show: isLocal,
    },
    {
      key: "removeFromCollection",
      label: t("collection.removeFrom", { type: t("collection.playlist") }),
      icon: markRaw(IconListMinus),
      separator: true,
      show: isPlaylist,
    },
    {
      key: "deleteFile",
      label: t("songList.context.deleteFile"),
      icon: markRaw(IconTrash2),
      separator: !isPlaylist,
      show: isLocal,
    },
  ]);

  const handleSelect = async (key: string): Promise<void> => {
    const current = track.value;
    if (!current) return;
    // 歌单相关
    if (key === "playlist:new") {
      const playlist = await playlistStore.create(
        t("collection.create", { type: t("collection.playlist") }),
      );
      await playlistStore.addTracks(playlist.id, [current]);
      return;
    }
    if (key.startsWith("playlist:")) {
      await playlistStore.addTracks(key.slice("playlist:".length), [current]);
      return;
    }
    // 歌曲相关
    switch (key) {
      case "play":
        player.playNow(current);
        break;
      case "playNext":
        player.insertToQueue(current);
        break;
      case "showInExplorer":
        if (current.path) window.api.system.showInExplorer(current.path);
        break;
      case "copyPath":
        if (current.path) navigator.clipboard.writeText(current.path);
        break;
      case "removeFromCollection":
        options.onRemove?.(current);
        break;
      case "deleteFile":
        options.onDeleteFile?.(current);
        break;
    }
  };

  return { items, handleSelect };
};
