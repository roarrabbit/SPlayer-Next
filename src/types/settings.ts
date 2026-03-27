/** 播放器背景类型 */
export type PlayerBgType = "blur" | "solid";

/** 播放器设置 */
export interface PlayerSettings {
  /** 播放器背景类型 */
  playerBgType: PlayerBgType;
  /** 无歌词时自动居中封面并隐藏歌词区域 */
  autoCenterCover: boolean;
}
