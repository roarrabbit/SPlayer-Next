/**
 * Last.fm 应用级凭据（API key / secret）
 *
 * 不硬编码在源码中。来源优先级：
 *   1. electron-vite 构建期 define 注入（值来自根目录 .env.local / 环境变量，不入库）
 *   2. 运行时 process.env.LASTFM_API_KEY / LASTFM_API_SECRET
 *   两者都未提供时为空字符串 → Last.fm 功能自动禁用（见 client.ts 的凭据守护）。
 */
declare const __LASTFM_API_KEY__: string | undefined;
declare const __LASTFM_API_SECRET__: string | undefined;

/** Last.fm 应用 API key（空 = 未配置） */
export const LASTFM_API_KEY = __LASTFM_API_KEY__ ?? process.env.LASTFM_API_KEY ?? "";
/** Last.fm 应用 API secret（空 = 未配置） */
export const LASTFM_API_SECRET =
  __LASTFM_API_SECRET__ ?? process.env.LASTFM_API_SECRET ?? "";

/** 是否已配置应用凭据 */
export const hasLastfmCredentials = (): boolean =>
  LASTFM_API_KEY.length > 0 && LASTFM_API_SECRET.length > 0;
