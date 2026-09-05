import electronUpdater, { type UpdateInfo } from "electron-updater";
import { shell } from "electron";
import { sendToMain } from "@main/utils/broadcast";
import { store } from "@main/store";
import { isDev, isMac, isPortable, isAppX } from "@main/utils/config";
import { updaterLog } from "@main/utils/logger";
import type { UpdateEvent, UpdateMeta } from "@shared/types/update";
import type { UpdateChannel } from "@shared/types/settings";

const { autoUpdater } = electronUpdater;

/** 是否支持内置下载安装 */
const canSelfInstall = !isMac && !isPortable;

/** Releases 页 */
const RELEASES_URL = "https://github.com/roarrabbit/SPlayer-Next/releases";
/** Windows 商店更新页 */
const STORE_UPDATES_URL = "ms-windows-store://updates";
/** 定时检查间隔（6 小时） */
const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;

/** 本次检查是否由用户手动触发 */
let manualCheck = false;

/** 进行中的检查 Promise */
let currentCheck: Promise<unknown> | null = null;

/** 当前检查结束后需要执行的检查 */
let pendingCheck: { manual: boolean; allowDowngrade: boolean } | null = null;

/** 最近一次检测到的可用版本 */
let availableVersion: string | null = null;

let intervalTimer: ReturnType<typeof setInterval> | null = null;


const emit = (event: UpdateEvent): void => sendToMain("update:event", event);

/**
 * 读取当前更新通道
 * @returns 更新通道
 */
const getChannel = (): UpdateChannel => {
  const channel = store.get("update.channel");
  return channel === "beta" || channel === "alpha" ? channel : "stable";
};

/**
 * 将当前通道应用到 electron-updater
 * @param allowDowngrade - 是否允许本次检查安装更低版本
 */
const applyChannel = (allowDowngrade = false): void => {
  const channel = getChannel();
  autoUpdater.channel = channel === "stable" ? "latest" : channel;
  autoUpdater.allowPrerelease = channel !== "stable";
  autoUpdater.allowDowngrade = allowDowngrade;
};

/**
 * 把底层错误文案转成用户友好的提示
 * - 网络超时 / 无法连接 → 提示检查网络后重试，而不是抛出原始 net 错误
 */
const userFriendlyMessage = (message: string): string => {
  if (/ERR_CONNECTION_TIMED_OUT|ETIMEDOUT|getaddrinfo|ENOTFOUND/i.test(message)) {
    return "更新服务器连接超时，请检查网络后重试";
  }
  if (/ECONNREFUSED|ERR_CONNECTION_REFUSED/i.test(message)) {
    return "无法连接更新服务器，请稍后重试";
  }
  return message;
};

/**
 * 判断错误是否为"本地版本高于已发布版本"导致的降级提示
 * electron-updater 在 allowDowngrade=false 且远端版本低于本地时会抛出该错误，
 * 这并非真正的故障，等价于"已是最新版本"
 */
const isDowngradeOrNotAvailable = (message: string): boolean =>
  /downgrade is disallowed|is not available/i.test(message);
/**
 * 规范化更新日志格式
 * @param notes 更新日志，可能是字符串或数组
 * @returns 规范化后的更新日志字符串
 */
const normalizeNotes = (notes: UpdateInfo["releaseNotes"]): string => {
  if (!notes) return "";
  if (typeof notes === "string") return notes;
  return notes
    .map((item) => item.note ?? "")
    .filter(Boolean)
    .join("\n\n");
};

/**
 * 将 electron-updater 的 UpdateInfo 转换为 UpdateMeta
 * @param info 更新信息
 * @returns 更新元数据
 */
const toMeta = (info: UpdateInfo): UpdateMeta => ({
  version: info.version,
  releaseNotes: normalizeNotes(info.releaseNotes),
  releaseDate: info.releaseDate,
  size: Math.max(0, ...(info.files ?? []).map((file) => file.size ?? 0)),
});

const bindEvents = (): void => {
  autoUpdater.on("checking-for-update", () => emit({ type: "checking" }));
  autoUpdater.on("update-available", (info) => {
    availableVersion = info.version;
    emit({
      type: "available",
      meta: toMeta(info),
      manual: manualCheck,
      canInstall: canSelfInstall,
    });
  });
  autoUpdater.on("update-not-available", () => {
    availableVersion = null;
    emit({ type: "notAvailable", manual: manualCheck });
  });
  autoUpdater.on("download-progress", (progress) =>
    emit({ type: "progress", percent: Math.round(progress.percent) }),
  );
  autoUpdater.on("update-downloaded", (info) => emit({ type: "downloaded", meta: toMeta(info) }));
  autoUpdater.on("error", (error) => {
    const message = error?.message ?? String(error);
    // 本地版本高于已发布版本时，electron-updater 会抛 "downgrade is disallowed"，
    // 这并非真正的错误，等价于已是最新，避免向用户展示为"更新出错"
    if (isDowngradeOrNotAvailable(message)) {
      updaterLog.info("当前已是最新（本地版本高于已发布版本）", message);
      emit({ type: "notAvailable", manual: manualCheck });
      return;
    }
    updaterLog.error("更新出错", error);
    emit({ type: "error", message: userFriendlyMessage(message), manual: manualCheck });
  });
};

/**
 * 执行更新检查
 * @param manual - 是否由用户手动触发
 * @param allowDowngrade - 是否明确允许本次检查安装更低版本
 */
const runCheck = (manual: boolean, allowDowngrade?: boolean): void => {
  if (currentCheck) {
    pendingCheck = {
      manual: manual || pendingCheck?.manual === true,
      allowDowngrade: allowDowngrade ?? pendingCheck?.allowDowngrade ?? false,
    };
    return;
  }
  applyChannel(allowDowngrade ?? false);
  manualCheck = manual;
  currentCheck = autoUpdater
    .checkForUpdates()
    .catch(() => {})
    .finally(() => {
      currentCheck = null;
      const pending = pendingCheck;
      pendingCheck = null;
      if (pending) runCheck(pending.manual, pending.allowDowngrade);
    });
};

/**
 * 检查更新：自动检查受设置开关约束，手动检查始终执行
 * @param manual 是否由用户手动触发
 */
export const checkForUpdates = (manual: boolean): void => {
  if (!manual && !store.get("update.autoCheck")) return;
  runCheck(manual);
};

/** 下载更新 */
export const downloadUpdate = (): void => {
  if (!canSelfInstall) return;
  autoUpdater.downloadUpdate().catch((error) => {
    updaterLog.error("下载更新失败", error);
    emit({ type: "error", message: error?.message ?? String(error), manual: true });
  });
};

/**
 * 应用更新通道变更并立即重新检查
 * @param previous - 原通道
 * @param channel - 新通道
 */
export const applyChannelChange = (previous: UpdateChannel, channel: UpdateChannel): void => {
  if (previous === channel) return;
  updaterLog.info(`切换更新通道: ${previous} -> ${channel}`);
  const channelPriority: Record<UpdateChannel, number> = { stable: 0, beta: 1, alpha: 2 };
  runCheck(true, channelPriority[channel] < channelPriority[previous]);
};

/** 退出并安装 */
export const quitAndInstall = (): void => {
  if (!canSelfInstall) return;
  autoUpdater.quitAndInstall();
};

/** 打开 Releases 下载页 */
export const openDownloadPage = (): void => {
  const releaseUrl = availableVersion
    ? `${RELEASES_URL}/tag/v${encodeURIComponent(availableVersion)}`
    : RELEASES_URL;
  void shell.openExternal(isAppX ? STORE_UPDATES_URL : releaseUrl);};

/** 初始化更新器 */
export const initUpdater = (): void => {
  autoUpdater.logger = updaterLog;
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;
  applyChannel();
  bindEvents();
  if (isDev) {
    autoUpdater.forceDevUpdateConfig = true;
    updaterLog.info("开发模式，仅支持手动检查更新");
    return;
  }
  // 定时检查
  intervalTimer = setInterval(() => checkForUpdates(false), CHECK_INTERVAL_MS);
};

/** 清理定时器 */
export const disposeUpdater = (): void => {
  if (intervalTimer) clearInterval(intervalTimer);
  intervalTimer = null;
};
