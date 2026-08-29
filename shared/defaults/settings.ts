import type { SystemConfig } from "../types/settings";
import { defaultPluginsConfig } from "./plugin-api";
import { defaultHotkeyConfig } from "./hotkeys";

/**
 * 灵动岛基准高度（缩放比例 = 1 时的物理像素，等于"主行高度")
 * 主行高度 = DYNAMIC_ISLAND_BASE_HEIGHT * scale
 * 双行模式下窗口最终高度 = 主行高度 + 副行高度
 * 主进程按渲染端上报的最终高度 setBounds
 */
export const DYNAMIC_ISLAND_BASE_HEIGHT = 40;

/** 默认配置 */
export const defaultSystemConfig: SystemConfig = {
  player: {
    autoPlay: false,
    rememberLastTrack: true,
    fadeEnabled: true,
    fadeDuration: 200,
    outputDevice: null,
    volume: 1,
    loudnessNormalization: false,
    equalizer: {
      enabled: false,
      preset: "flat",
      bands: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      preamp: 0,
    },
    lyricOffsets: {},
  },
  media: {
    systemMediaControls: true,
    discord: {
      enabled: false,
      showWhenPaused: false,
      displayMode: "name",
    },
  },
  library: {
    scanDirs: [],
  },
  desktopLyric: {
    fontSize: 25,
    fontWeight: 700,
    fontFamily: "",
    showTranslation: true,
    doubleLine: true,
    align: "left",
    wordByWord: true,
    autoGenerateWordByWord: true,
    playedColor: "rgb(255, 120, 112)",
    unplayedColor: "rgb(255, 255, 255)",
    strokeColor: "rgba(0, 0, 0, 0.5)",
    backgroundMask: false,
    backgroundMaskColor: "rgba(0, 0, 0, 0.3)",
    alwaysShowSongInfo: false,
    limitBounds: false,
    animation: true,
    alwaysOnTop: true,
    locked: false,
    useCSSDrag: false,
  },
  dynamicIsland: {
    scale: 1,
    fontWeight: 500,
    fontFamily: "",
    wordByWord: true,
    playedColor: "rgba(255, 255, 255, 1)",
    unplayedColor: "rgba(255, 255, 255, 0.5)",
    backgroundColor: "rgba(0, 0, 0, 1)",
    alwaysOnTop: true,
    snapCentered: true,
    // 刘海融合与非遮挡为 mac 体验基线（非 mac 平台由 isMac 守卫自动降级）
    notchFusion: true,
    nonOcclusive: true,
    doubleLine: false,
    showTranslation: false,
    // 灵动岛歌词默认关闭（隐藏歌词行并收回灵动岛下方区域，露出频谱/封面）
    showLyric: false,
    useCSSDrag: false,
    // 宽度模式: "default"=324 / "wide"=242(仅歌词模式) / "custom"=自定义
    widthMode: "default",
    customWidth: 242,
    // 歌词字号（px）
    lyricFontSize: 13,
  },
  taskbarLyric: {
    position: "auto",
    autoMaxWidth: true,
    maxWidth: 400,
    leftMargin: 0,
    rightMargin: 0,
    colorMode: "taskbar",
    doubleLine: true,
    showTranslation: true,
    showCover: true,
    wordByWord: true,
    fontSize: 14,
    fontFamily: "",
  },
  lyric: {
    enableOnlineTTMLLyric: true,
    amllDbServer: "https://amlldb.bikonoo.com/%p/%s.ttml",
  },
  localLyric: {
    enableLocalTTMLOverride: false,
    repoDir: "",
  },
  cache: {
    dir: null,
    songCache: {
      enabled: true,
      sizeLimitGb: 10,
    },
  },
  download: {
    enabled: false,
    dir: null,
    quality: "lossless",
    usePlaybackForDownload: true,
    fileTemplate: "{artist} - {title}",
    folderScheme: "none",
    overwritePolicy: "rename",
    embedCover: true,
    embedMeta: true,
    embedLyric: true,
    writeLrc: true,
    saveTtml: false,
    lyricFileFormat: "enhanced-lrc",
  },
  streaming: {
    enabled: true,
  },
  lastfm: {
    enabled: false,
    scrobble: true,
    nowPlaying: true,
    loveSync: true,
  },
  externalApi: {
    enabled: false,
    wsEnabled: false,
    allowLan: false,
    port: 14558,
  },
  update: {
    autoCheck: true,
  },
  system: {
    rememberWindowState: true,
    borderlessWindow: true,
    taskbarProgress: true,
    taskbarThumbnailCover: true,
    uiZoom: 100,
    onboardingCompleted: false,
    agreedAgreementVersion: 1,
    neteaseRealIp: false,
    networkProxy: {
      protocol: "off",
      host: "127.0.0.1",
      port: 7890,
    },
    neteaseScrobbleEnabled: false,
    neteaseScrobbleMode: "ncbl",
    registerOrpheusProtocol: false,
  },
  windowStates: {
    main: {
      width: 1280,
      height: 800,
      x: null,
      y: null,
      maximized: false,
    },
    desktopLyric: {
      width: 800,
      height: 200,
      x: null,
      y: null,
      visible: false,
    },
    dynamicIsland: {
      mode: "snapped",
      x: null,
      y: null,
      // 灵动岛默认打开：启动即创建并显示（贴刘海小药丸），播放时弹性弹出
      visible: true,
    },
    taskbarLyric: {
      visible: false,
    },
  },
  plugins: defaultPluginsConfig,
  hotkeys: defaultHotkeyConfig,
};
