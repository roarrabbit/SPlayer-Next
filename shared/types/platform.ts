/** 平台类型 */
export type Platform = "netease" | "qqmusic" | "kugou";

/** 平台简写 */
export const PLATFORM_SHORT_NAME: Record<Platform, string> = {
  netease: "NCM",
  qqmusic: "QM",
  kugou: "KG",
};

/** 全部平台 */
export const ALL_PLATFORMS: Platform[] = ["netease", "qqmusic", "kugou"];
