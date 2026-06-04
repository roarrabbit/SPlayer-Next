/** scrobbler 对外通知的曲目数据 */
export interface ScrobbleTrack {
  /** 歌曲名 */
  title: string;
  /** 主艺人名 */
  artist: string;
  /** 专辑名（可能为空） */
  album: string;
  /** 时长（秒） */
  durationSec: number;
  /** 开始播放的 Unix 时间戳（秒），scrobble 用 */
  timestamp: number;
}

/** index.ts 注入的回调：内部做配置/会话判定 */
export interface ScrobblerHandlers {
  /** 应上报「正在播放」时调用 */
  onNowPlaying: (track: ScrobbleTrack) => void;
  /** 达到 scrobble 阈值时调用 */
  onScrobble: (track: ScrobbleTrack) => void;
}

/** 时长低于该值（秒）不 scrobble */
const SCROBBLE_MIN_DURATION_SEC = 30;
/** scrobble 最长等待（秒）：min(时长/2, 240) */
const SCROBBLE_MAX_WAIT_SEC = 240;

let handlers: ScrobblerHandlers | null = null;
let current: ScrobbleTrack | null = null;
/** 暂停前已累计的播放毫秒 */
let playedMs = 0;
/** 本段播放开始的墙钟时间戳（ms）；未在播放时为 null */
let playSince: number | null = null;
/** 当前曲目是否已 scrobble */
let scrobbled = false;
/** 当前曲目是否已发过 now playing */
let nowPlayingSent = false;

/** 注入回调 */
export const setHandlers = (next: ScrobblerHandlers): void => {
  handlers = next;
};

/** 当前累计实际播放毫秒 */
const elapsedMs = (): number => playedMs + (playSince != null ? Date.now() - playSince : 0);

/** 达标则 scrobble 一次 */
const maybeScrobble = (): void => {
  if (!current || scrobbled) return;
  if (current.durationSec <= SCROBBLE_MIN_DURATION_SEC) return;
  const thresholdMs = Math.min(current.durationSec / 2, SCROBBLE_MAX_WAIT_SEC) * 1000;
  if (elapsedMs() >= thresholdMs) {
    scrobbled = true;
    handlers?.onScrobble(current);
  }
};

/** 首次实际播放时上报 now playing */
const sendNowPlaying = (): void => {
  if (!current || nowPlayingSent) return;
  nowPlayingSent = true;
  handlers?.onNowPlaying(current);
};

/** 结算当前曲目（切歌/结束前调用），达标则补 scrobble，并清空状态 */
const flush = (): void => {
  if (playSince != null) {
    playedMs += Date.now() - playSince;
    playSince = null;
  }
  maybeScrobble();
  current = null;
  playedMs = 0;
  scrobbled = false;
  nowPlayingSent = false;
};

/**
 * 新曲目加载
 * @param meta - 曲目元数据 + 是否自动播放
 */
export const onTrackLoaded = (meta: {
  title: string;
  artist: string;
  album: string;
  durationMs: number;
  autoPlay: boolean;
}): void => {
  flush();
  if (meta.durationMs <= 0 || !meta.title) {
    current = null;
    return;
  }
  current = {
    title: meta.title,
    artist: meta.artist,
    album: meta.album,
    durationSec: Math.round(meta.durationMs / 1000),
    timestamp: Math.floor(Date.now() / 1000),
  };
  playedMs = 0;
  scrobbled = false;
  nowPlayingSent = false;
  if (meta.autoPlay) {
    playSince = Date.now();
    sendNowPlaying();
  } else {
    playSince = null;
  }
};

/**
 * 播放/暂停状态变化
 * @param playing - 是否正在播放
 */
export const onState = (playing: boolean): void => {
  if (!current) return;
  if (playing) {
    if (playSince == null) playSince = Date.now();
    sendNowPlaying();
  } else if (playSince != null) {
    playedMs += Date.now() - playSince;
    playSince = null;
  }
};

/** 播放进度推进（驱动阈值检查） */
export const onPosition = (): void => {
  maybeScrobble();
};

/** 自然播放结束 */
export const onEnded = (): void => {
  flush();
};

/** 复位（断开连接 / 关闭总开关时） */
export const reset = (): void => {
  current = null;
  playedMs = 0;
  playSince = null;
  scrobbled = false;
  nowPlayingSent = false;
};
