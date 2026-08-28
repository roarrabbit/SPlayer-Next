import fs from "node:fs";
import path from "node:path";
import { safeStorage } from "electron";
import { writeFileSync as atomicWriteSync } from "atomically";
import { lastfmLog } from "@main/utils/logger";
import { configDir } from "@main/utils/paths";

/**
 * Last.fm 应用级凭据（API key / secret）
 *
 * 不硬编码在源码中。来源优先级：
 *   1. electron-vite 构建期 define 注入（值来自根目录 .env.local / 环境变量，不入库）
 *   2. 运行时 process.env.LASTFM_API_KEY / LASTFM_API_SECRET
 * 两者都未提供时为空字符串 → Last.fm 功能自动禁用（见 client.ts 的凭据守护）。
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

/** 会话凭证（内存/磁盘态） */
export interface LastfmCredentials {
  username: string;
  sessionKey: string;
}

/** 持久化形态 */
interface PersistedCredentials {
  username: string;
  encryptedSessionKey: string;
}

/** 凭证文件 */
const STORAGE_FILE = path.join(configDir, "lastfm.json");

/** 加密会话密钥 */
const encrypt = (plain: string): string => {
  if (!plain) return "";
  if (!safeStorage.isEncryptionAvailable()) {
    lastfmLog.warn("safeStorage 不可用，sessionKey 将以 base64 明文落盘");
    return Buffer.from(plain, "utf-8").toString("base64");
  }
  return safeStorage.encryptString(plain).toString("base64");
};

/** 解密会话密钥 */
const decrypt = (encrypted: string): string => {
  if (!encrypted) return "";
  try {
    const buf = Buffer.from(encrypted, "base64");
    if (!safeStorage.isEncryptionAvailable()) {
      return buf.toString("utf-8");
    }
    return safeStorage.decryptString(buf);
  } catch {
    return "";
  }
};

/**
 * 读取本地凭证
 * @returns 凭证；不存在或损坏时返回 null
 */
export const load = (): LastfmCredentials | null => {
  try {
    const raw = JSON.parse(fs.readFileSync(STORAGE_FILE, "utf-8")) as PersistedCredentials;
    const sessionKey = decrypt(raw.encryptedSessionKey);
    if (!raw.username || !sessionKey) return null;
    return { username: raw.username, sessionKey };
  } catch {
    return null;
  }
};

/**
 * 保存凭证
 * @param username - 用户名
 * @param sessionKey - 会话密钥
 */
export const save = (username: string, sessionKey: string): void => {
  try {
    const dir = path.dirname(STORAGE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const data: PersistedCredentials = {
      username,
      encryptedSessionKey: encrypt(sessionKey),
    };
    atomicWriteSync(STORAGE_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    lastfmLog.error("写入 lastfm.json 失败:", err);
  }
};

/** 清除凭证 */
export const clear = (): void => {
  try {
    if (fs.existsSync(STORAGE_FILE)) fs.rmSync(STORAGE_FILE);
  } catch (err) {
    lastfmLog.error("删除 lastfm.json 失败:", err);
  }
};
