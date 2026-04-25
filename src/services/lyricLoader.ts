/**
 * 歌词加载服务
 */

import type { Track, TrackDetail } from "@shared/types/player";
import type { LyricData, LyricInput } from "@shared/types/lyrics";
import type { Platform } from "@shared/types/platform";
import { bestExternalIndex, detectFormat } from "@/utils/lyric/parse";
import { useMediaStore } from "@/stores/media";
import { useSettingsStore } from "@/stores/settings";

/** 一次在线 fetch 的结果 */
interface OnlineResult {
  source: LyricData;
  input: LyricInput;
}

/** 竞态 token */
let currentToken = 0;

/** 偏好 watcher 是否已初始化 */
let watcherInitialized = false;

/** auto 模式下的平台回落顺序 */
const AUTO_FALLBACK_ORDER: Platform[] = ["netease", "qqmusic", "kugou"];

/** 挑本地歌词源：外置 > 内嵌 > null */
const pickLocalSource = (detail: TrackDetail): LyricData => {
  const idx = bestExternalIndex(detail.externalLyrics);
  if (idx !== -1) {
    return { source: "external", format: detail.externalLyrics[idx].format };
  }
  if (detail.embeddedLyric) {
    return { source: "embedded", format: detectFormat(detail.embeddedLyric) };
  }
  return null;
};

/** 读取本地歌词内容：external 读文件，embedded 直取 detail 字段 */
const readLocalContent = async (detail: TrackDetail, source: LyricData): Promise<string | null> => {
  if (!source) return null;
  if (source.source === "embedded") return detail.embeddedLyric ?? null;
  if (source.source === "external") {
    const ext = detail.externalLyrics.find((item) => item.format === source.format);
    if (!ext) return null;
    const result = await window.api.player.readLyricFile(ext.path);
    return result.success ? (result.data ?? null) : null;
  }
  return null;
};

/**
 * 向指定平台请求歌词
 * track.platform 等于目标平台时走 byId（精确），否则 byQuery（搜索打分）
 */
const fetchFromPlatform = async (
  platform: Platform,
  track: Track,
): Promise<OnlineResult | null> => {
  const mode = track.platform === platform ? "byId" : "byQuery";
  const resp =
    mode === "byId"
      ? await window.api.lyrics.matchById(platform, track.id)
      : await window.api.lyrics.matchByQuery(platform, track);
  if (!resp.ok || !resp.data) return null;
  const data = resp.data;
  return {
    source: { source: "online", format: data.format, platform: data.platform },
    input: {
      content: data.content,
      translation: data.translation,
      translationFormat: data.translationFormat,
      romaji: data.romaji,
      romajiFormat: data.romajiFormat,
    },
  };
};

/**
 * 获取在线歌词
 * - self：不走第三方
 * - auto + 已有本地：不走第三方（本地优先）
 * - auto + 无本地：按 AUTO_FALLBACK_ORDER 顺序试，首个命中即返回
 * - 指定平台：查该平台
 */
const tryOnlineByPreference = async (
  token: number,
  track: Track,
  hasLocal: boolean,
): Promise<OnlineResult | null> => {
  const preference = useSettingsStore().lyric.lyricSourcePreference;
  if (preference === "self") return null;
  if (preference === "auto") {
    if (hasLocal) return null;
    for (const platform of AUTO_FALLBACK_ORDER) {
      const result = await fetchFromPlatform(platform, track);
      if (token !== currentToken) return null;
      if (result) return result;
    }
    return null;
  }
  return fetchFromPlatform(preference, track);
};

/**
 * 提交歌词
 * @param token - 竞态 token
 * @param source - 歌词源
 * @param input - 歌词内容
 */
const commit = (token: number, source: LyricData, input: LyricInput | null): void => {
  if (token !== currentToken) return;
  useMediaStore().setLyric(source, input);
};

/** 开启新一轮加载周期 */
export const beginLoad = (): number => {
  currentToken++;
  useMediaStore().resetLyricState();
  return currentToken;
};

/**
 * 为当前 track 加载歌词
 *
 * 1. 无 track：commit null 收尾
 * 2. 在线歌曲：暂无
 * 3. 本地歌曲：本地有先立即 commit 显示；再按偏好查在线，命中热替换
 * 4. 本地 + 在线都无：commit null 收尾 loading
 *
 * @param detail - 歌曲详细信息（null 表示加载失败的收尾调用）
 */
export const loadForTrack = async (detail: TrackDetail | null): Promise<void> => {
  const token = beginLoad();
  const media = useMediaStore();
  const track = media.track;
  // 无 track
  if (!track) {
    commit(token, null, null);
    return;
  }
  // 在线歌曲
  if (track.source === "online") {
    commit(token, null, null);
    return;
  }
  // 本地文件
  const localSource = detail ? pickLocalSource(detail) : null;
  const localContent = localSource && detail ? await readLocalContent(detail, localSource) : null;
  if (token !== currentToken) return;
  // 本地立即显示
  if (localSource) commit(token, localSource, localContent ? { content: localContent } : null);
  // 按偏好获取歌词
  const online = await tryOnlineByPreference(token, track, !!localSource);
  if (token !== currentToken) return;
  if (online) {
    commit(token, online.source, online.input);
  } else if (!localSource) {
    commit(token, null, null);
  }
};

/** 偏好变化时的刷新 */
const refreshPreference = async (): Promise<void> => {
  currentToken++;
  const token = currentToken;
  const media = useMediaStore();
  const track = media.track;
  if (!track || track.source === "online") return;

  const detail = media.detail;
  const localSource = detail ? pickLocalSource(detail) : null;
  const preference = useSettingsStore().lyric.lyricSourcePreference;
  const showingOnline = media.activeLyric?.source === "online";

  // 目标应当显示本地
  const shouldShowLocal = preference === "self" || (preference === "auto" && !!localSource);
  if (shouldShowLocal) {
    if (!showingOnline) return;
    if (localSource && detail) {
      const content = await readLocalContent(detail, localSource);
      commit(token, localSource, content ? { content } : null);
    } else {
      commit(token, null, null);
    }
    return;
  }

  // 其它情况需要查在线
  const online = await tryOnlineByPreference(token, track, !!localSource);
  if (token !== currentToken) return;
  if (online) {
    commit(token, online.source, online.input);
  } else if (localSource && detail) {
    // 在线失败：回退到本地
    const content = await readLocalContent(detail, localSource);
    if (token !== currentToken) return;
    commit(token, localSource, content ? { content } : null);
  } else {
    // 在线失败 + 无本地：清空旧歌词
    commit(token, null, null);
  }
};

/**
 * 初始化：监听偏好变化，触发刷新
 */
export const initLyricLoader = (): void => {
  if (watcherInitialized) return;
  watcherInitialized = true;
  const settings = useSettingsStore();
  watch(
    () => settings.lyric.lyricSourcePreference,
    () => {
      refreshPreference();
    },
  );
};
