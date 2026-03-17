import path from "node:path";

/**
 * 将封面缩略图磁盘路径转为 cover:// 协议 URL
 * @param coverPath 磁盘路径（如 C:/.../cover_xxx_thumb.jpg）
 * @returns cover://cover_xxx_thumb.jpg 或 undefined
 */
export const toCoverUrl = (coverPath: string | undefined | null): string | undefined => {
  if (!coverPath) return undefined;
  return `cover://${path.basename(coverPath)}`;
};
