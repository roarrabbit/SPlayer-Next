import type { Track } from "@shared/types/player";
import type { ContentScope } from "@/types/collection";
import { useUserStore } from "@/stores/user";
import { toast } from "@/composables/useToast";

/**
 * 添加到歌单选择器
 * 在线歌曲未登录时拦截并提示，不打开弹窗
 */
export const usePlaylistPicker = () => {
  const user = useUserStore();
  const { t } = useI18n();

  /** 弹窗开关 */
  const open = ref(false);
  /** 待添加曲目 */
  const tracks = shallowRef<Track[]>([]);
  /** 本地 / 在线 */
  const mode = ref<ContentScope>("local");

  /**
   * 打开添加到歌单弹窗
   * 网易云歌曲走在线歌单；其余（本地/QQ/酷狗）走本地歌单，
   * 混选时本地模式会剔除网易云歌曲（网易云不入本地缓冲）
   * @param items - 待添加曲目
   */
  const openPicker = (items: Track[]): void => {
    if (items.length === 0) return;
    const scope: ContentScope = items[0].source === "netease" ? "online" : "local";
    const selected =
      scope === "local" ? items.filter((track) => track.source !== "netease") : items;
    if (selected.length === 0) return;
    if (scope === "online" && !user.isLoggedIn) {
      toast.warning(t("liked.toast.needLogin"));
      return;
    }
    tracks.value = selected;
    mode.value = scope;
    open.value = true;
  };

  return { open, tracks, mode, openPicker };
};
