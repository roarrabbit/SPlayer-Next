import type { Ref } from "vue";
import type { Track } from "@shared/types/player";
import type { DropdownMenuItem } from "@/components/ui/SDropdownMenu.vue";
import * as player from "@/core/player";
import IconPlay from "~icons/lucide/play";
import IconListEnd from "~icons/lucide/list-end";
import IconFolderOpen from "~icons/lucide/folder-open";
import IconCopy from "~icons/lucide/copy";

/**
 * 歌曲操作菜单（右键菜单 / 下拉菜单共用）
 * @param track - 当前操作的歌曲（响应式）
 */
export const useTrackMenu = (track: Ref<Track | undefined>) => {
  const { t } = useI18n();

  const items = computed<DropdownMenuItem[]>(() => [
    { key: "play", label: t("songList.context.play"), icon: IconPlay },
    { key: "playNext", label: t("songList.context.playNext"), icon: IconListEnd },
    { key: "showInExplorer", label: t("songList.context.showInExplorer"), icon: IconFolderOpen, separator: true },
    { key: "copyPath", label: t("songList.context.copyPath"), icon: IconCopy },
  ]);

  const handleSelect = (key: string): void => {
    const t = track.value;
    if (!t) return;

    switch (key) {
      case "play":
        player.playNow(t);
        break;
      case "playNext":
        player.insertToQueue(t);
        break;
      case "showInExplorer":
        if (t.path) window.api.system.showInExplorer(t.path);
        break;
      case "copyPath":
        if (t.path) navigator.clipboard.writeText(t.path);
        break;
    }
  };

  return { items, handleSelect };
};
