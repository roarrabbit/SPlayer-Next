/** 播放器背景类型 */
export type PlayerBgType = "blur" | "solid";

/** 歌词渲染模式 */
export type LyricMode = "effects" | "simple";

/** 布局模式 */
export type LayoutMode = "default" | "sidebar-full" | "floating";

/** 播放器设置 */
export interface PlayerSettings {
  /** 播放器背景类型 */
  playerBgType: PlayerBgType;
  /** 无歌词时自动居中封面并隐藏歌词区域 */
  autoCenterCover: boolean;
  /** 歌词渲染模式：effects（特效）| simple（简约） */
  lyricMode: LyricMode;
  /** 布局模式：default（默认）| sidebar-full（侧边栏全高）| floating（悬浮播放栏） */
  layoutMode: LayoutMode;
}
