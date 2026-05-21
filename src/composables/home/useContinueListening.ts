import type { Track } from "@shared/types/player";

/** 区域展示曲目数上限 */
const MAX_ITEMS = 6;
/** 最高播放次数达到此值才呈现为「反复聆听」，否则降为「继续聆听」 */
const REPEAT_TITLE_THRESHOLD = 2;

/**
 * 首页「反复聆听 / 继续聆听」区域
 *
 * 统一取最常播放的曲目，不足时由播放次数少的、乃至只播过一次的补足
 * （getTopTracks 同次数按最近播放排序，故次数都很低时即等价于「继续聆听」）。
 * 最高播放次数达阈值才呈现为「反复聆听」，否则标题降为「继续聆听」。
 */
export const useContinueListening = () => {
  const { t } = useI18n();

  // shallowRef：Track 数组不做深度代理，避免入队列后 IDB 持久化报 DataCloneError
  const tracks = shallowRef<Track[]>([]);
  /** 是否呈现为「反复聆听」 */
  const isRepeat = ref(false);

  /** 区域标题 */
  const title = computed(() =>
    isRepeat.value ? t("home.continue.repeatTitle") : t("home.continue.continueTitle"),
  );

  /** 区域副标题，无数据时为空 */
  const subtitle = computed(() => {
    const count = tracks.value.length;
    if (count === 0) return "";
    return isRepeat.value
      ? t("home.continue.repeatSubtitle", { count })
      : t("home.continue.continueSubtitle", { count });
  });

  /** 拉取最常播放曲目 */
  const load = async (): Promise<void> => {
    try {
      const top = await window.api.stats.getTopTracks(MAX_ITEMS);
      tracks.value = top.map((item) => item.track);
      isRepeat.value = (top[0]?.playCount ?? 0) >= REPEAT_TITLE_THRESHOLD;
    } catch (error) {
      console.warn("[home] getTopTracks failed:", error);
    }
  };

  return { tracks, title, subtitle, load };
};
