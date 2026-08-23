import { BrowserWindow, screen } from "electron";
import { join } from "path";
import { is } from "@electron-toolkit/utils";
import { createWindow } from "./create";
import { store } from "@main/store";
import { broadcast } from "@main/utils/broadcast";
import { isMac } from "@main/utils/config";
import { setTrayDynamicIsland } from "@main/services/tray";
import { isAppQuitting } from "@main/utils/lifecycle";
import { DYNAMIC_ISLAND_BASE_HEIGHT } from "@shared/defaults/settings";
import { systemLog } from "@main/utils/logger";
import { isPlaying, isTrackLoading } from "@main/services/nowPlaying";

let dynamicIslandWindow: BrowserWindow | null = null;

/** 用户实测刘海物理宽度，按显示器 scaleFactor 换算成 Electron DIP */
const NOTCH_PHYSICAL_WIDTH = 358;
/** 用户实测刘海物理高度，按显示器 scaleFactor 换算成 Electron DIP */
const NOTCH_PHYSICAL_HEIGHT = 58;
/** 2x 屏下真实刘海主体逻辑宽度，包含右侧轻微覆盖余量 */
const RETINA_NOTCH_BODY_WIDTH = 181;
/** 两侧仅用于顶部横线圆弧对接的轻微外扩宽度 */
const NOTCH_SIDE_OVERHANG = 5;
/** 2x 屏下灵动岛窗口最小逻辑宽度 */
const RETINA_NOTCH_WIDTH = RETINA_NOTCH_BODY_WIDTH + NOTCH_SIDE_OVERHANG * 2;
/** 2x 屏下 PixPin 给出的真实刘海逻辑高度 */
const RETINA_NOTCH_HEIGHT = 29;
/** 软件黑色区域贴住屏幕顶边，避免和物理刘海之间出现缝隙 */
const NOTCH_TOP_OFFSET = 0;
/** 高度安全边界：渲染端上报值受这里 clamp，避免极端值导致窗口异常 */
const MIN_HEIGHT = 14;
/** 高度上限：覆盖 200% 缩放主行（80px）+ 后续双行副行余量，留足安全空间 */
const MAX_HEIGHT = 200;
/** 吸附判定阈值：拖拽释放时距顶部小于此值则重新吸附 */
const SNAP_THRESHOLD = 8;
/** 吸附判定用 Y 偏移：窗口贴合顶边后距屏幕顶边的真实间隙 */
const SNAP_Y_OFFSET = 22;
/** 灵动岛固定 Y 偏移（用户已调好，配合 BoringNotch 贴刘海；相对 wa.y+SNAP_Y_OFFSET 基准） */
const ISLAND_FIXED_OFFSET_Y = -61;
/** 初始宽度（渲染端上报实际宽度前的占位） */
const INITIAL_WIDTH = 191;
/** 光标位置轮询间隔（ms） */
const CURSOR_POLL_MS = 150;
/** 光标「悬停」判定外扩缓冲（px）：鼠标尚未进入窗口、仅在周边该距离内即预判为悬停，
 *  提前触发隐藏，避免鼠标真正移到岛上方才突然变透明，产生「预判」的顺滑感 */
const CURSOR_INSIDE_PAD = 70;

/**
 * 权威尺寸缓存
 * 所有 setBounds 写宽高都用它，绝不从 getBounds 读尺寸回写
 * 避免 Windows 高 DPI 下 DIP↔物理像素有损回环造成尺寸漂移
 */
const cachedSize = { width: INITIAL_WIDTH, height: 40 };
/** 权威尺寸缓存（供 IPC 处理器直接读写宽高，避免 getBounds 回写漂移） */
export { cachedSize };

/** 当前是否启用刘海融合，仅 macOS 生效 */
const isNotchFusionEnabled = (): boolean => isMac && store.get("dynamicIsland").notchFusion;

/**
 * 灵动岛窗口置顶级别：
 * macOS 用 screen-saver（屏保级，高于普通应用窗口、在菜单栏之下，配合
 * setIgnoreMouseEvents 直通不影响菜单栏点击）；其他平台回退 floating。
 */
const ISLAND_AOT_LEVEL: "screen-saver" | "floating" = isMac ? "screen-saver" : "floating";

/** 将任意数字 clamp 到合法高度区间 */
const clampHeight = (h: number): number =>
  Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, Math.round(h)));

/**
 * 计算当前显示器上的刘海逻辑尺寸
 * @param display - 当前窗口所在显示器
 * @returns 刘海宽高与顶部偏移
 */
const getNotchMetrics = (
  display: Electron.Display,
): { width: number; height: number; topOffset: number } => {
  // BoringNotch 方式：用系统辅助区域 API 计算真实刘海宽度/高度
  // 这些字段属于较新 Electron 的 Display 扩展，这里做类型收窄
  const d = display as Electron.Display & {
    auxiliaryTopLeftArea?: { width: number };
    auxiliaryTopRightArea?: { width: number };
    safeAreaInsets?: { top: number };
  };
  const tl = d.auxiliaryTopLeftArea;
  const tr = d.auxiliaryTopRightArea;
  if (tl && tr) {
    const width = Math.round(display.size.width - tl.width - tr.width + 4);
    const height = Math.round(d.safeAreaInsets?.top || RETINA_NOTCH_HEIGHT);
    systemLog.info(`[dynamic-island] real notch metrics: ${width}x${height}`);
    return { width, height, topOffset: NOTCH_TOP_OFFSET };
  }
  const scaleFactor = Math.max(1, display.scaleFactor || 1);
  if (Math.abs(scaleFactor - 2) < 0.25) {
    return {
      width: RETINA_NOTCH_WIDTH,
      height: RETINA_NOTCH_HEIGHT,
      topOffset: NOTCH_TOP_OFFSET,
    };
  }
  return {
    width: Math.round(NOTCH_PHYSICAL_WIDTH / scaleFactor) + NOTCH_SIDE_OVERHANG * 2,
    height: Math.round(NOTCH_PHYSICAL_HEIGHT / scaleFactor),
    topOffset: NOTCH_TOP_OFFSET,
  };
};

/**
 * 计算宽度安全边界，按当前屏宽限制最大展开尺寸
 * @param display - 当前窗口所在显示器
 * @returns 合法宽度区间
 */
const getWidthLimits = (display: Electron.Display): { min: number; max: number } => {
  return { min: 40, max: display.workArea.width };
};

/** 将任意数字 clamp 到合法宽度区间 */
const clampWidth = (width: number, display: Electron.Display): number => {
  const limits = getWidthLimits(display);
  return Math.min(limits.max, Math.max(limits.min, Math.round(width)));
};

/**
 * 计算当前窗口所在屏幕
 * 当前屏：优先取窗口实例所在屏；未创建时退回 saved 锚点所在屏；都没有则主显示器
 * @returns 当前显示器
 */
const getCurrentDisplay = (): Electron.Display => {
  const saved = store.get("windowStates.dynamicIsland");
  if (dynamicIslandWindow && !dynamicIslandWindow.isDestroyed()) {
    const bounds = dynamicIslandWindow.getBounds();
    return screen.getDisplayNearestPoint({
      x: bounds.x + Math.round(bounds.width / 2),
      y: bounds.y + Math.round(bounds.height / 2),
    });
  }
  if (saved.x !== null && saved.y !== null) {
    return screen.getDisplayNearestPoint({
      x: saved.x,
      y: saved.y + Math.round(cachedSize.height / 2),
    });
  }
  return screen.getPrimaryDisplay();
};

/**
 * 计算吸附位置：默认贴工作区顶部；刘海融合时贴屏幕顶边并强制居中
 * @param display - 当前窗口所在显示器
 * @returns 吸附后的左上角坐标
 */
const computeSnappedPos = (
  display: Electron.Display = getCurrentDisplay(),
): { x: number; y: number } => {
  if (!isNotchFusionEnabled()) {
    const config = store.get("dynamicIsland");
    const saved = store.get("windowStates.dynamicIsland");
    const wa = display.workArea;
    if (config.snapCentered || saved.x === null) {
      return {
        x: wa.x + Math.round((wa.width - cachedSize.width) / 2),
        y: wa.y,
      };
    }
    const savedX = saved.x;
    const leftFromCenter = savedX - Math.round(cachedSize.width / 2);
    return {
      x: Math.max(wa.x, Math.min(wa.x + wa.width - cachedSize.width, leftFromCenter)),
      y: wa.y,
    };
  }

  const bounds = display.bounds;
  const wa = display.workArea;
  const centerX = bounds.x + Math.round(bounds.width / 2);
  const leftFromCenter = centerX - Math.round(cachedSize.width / 2);
  const x = Math.max(
    bounds.x,
    Math.min(bounds.x + bounds.width - cachedSize.width, leftFromCenter),
  );
  // Y 用与调试台 setDebugGeom 完全一致的公式：wa.y + SNAP_Y_OFFSET + ISLAND_FIXED_OFFSET_Y，
  // 使切歌/初始化/重定位都落在用户固定的 islandY 位置，避免切歌时跳回默认吸附位。
  return { x, y: wa.y + SNAP_Y_OFFSET + ISLAND_FIXED_OFFSET_Y };
};

/**
 * 应用窗口置顶
 * macOS 使用屏保级 screen-saver（高于普通窗口、菜单栏仍可点），Windows 回退 floating
 * @param alwaysOnTop 是否置顶
 */
export const applyDynamicIslandAlwaysOnTop = (alwaysOnTop: boolean): void => {
  const win = getDynamicIslandWindow();
  if (!win) return;
  win.setAlwaysOnTop(alwaysOnTop, ISLAND_AOT_LEVEL);
};

/**
 * 光标位置轮询：用 OS 级 screen.getCursorScreenPoint() 判断鼠标是否在窗口内
 * 不依赖 DOM 鼠标事件，避免 setIgnoreMouseEvents 穿透时事件漏发、opacity=0 不触发 leave 等坑
 */
let cursorPollTimer: NodeJS.Timeout | null = null;
let lastCursorInside = false;

const isCursorInsideBounds = (): boolean => {
  if (!dynamicIslandWindow || dynamicIslandWindow.isDestroyed()) return false;
  const cursor = screen.getCursorScreenPoint();
  const b = dynamicIslandWindow.getBounds();
  return (
    cursor.x >= b.x - CURSOR_INSIDE_PAD &&
    cursor.x < b.x + b.width + CURSOR_INSIDE_PAD &&
    cursor.y >= b.y - CURSOR_INSIDE_PAD &&
    cursor.y < b.y + b.height + CURSOR_INSIDE_PAD
  );
};

const startCursorPolling = (): void => {
  if (cursorPollTimer) return;
  lastCursorInside = isCursorInsideBounds();
  dynamicIslandWindow?.webContents.send("dynamicIsland:cursorInside", lastCursorInside);
  cursorPollTimer = setInterval(() => {
    if (!dynamicIslandWindow || dynamicIslandWindow.isDestroyed()) {
      stopCursorPolling();
      return;
    }
    const inside = isCursorInsideBounds();
    if (inside !== lastCursorInside) {
      lastCursorInside = inside;
      dynamicIslandWindow.webContents.send("dynamicIsland:cursorInside", inside);
    }
  }, CURSOR_POLL_MS);
};

const stopCursorPolling = (): void => {
  if (cursorPollTimer) {
    clearInterval(cursorPollTimer);
    cursorPollTimer = null;
  }
  // 离开时推一次 false，避免渲染端卡在 inside=true 状态
  if (lastCursorInside) {
    lastCursorInside = false;
    dynamicIslandWindow?.webContents.send("dynamicIsland:cursorInside", false);
  }
};

/**
 * 应用非遮挡模式：开启后鼠标点击穿透窗口，并启动光标位置轮询
 * 渲染端据此在悬停时把内容渐隐为透明
 */
export const applyDynamicIslandNonOcclusive = (enabled: boolean): void => {
  const win = getDynamicIslandWindow();
  if (!win) return;
  win.setIgnoreMouseEvents(enabled, { forward: true });
  if (enabled) {
    startCursorPolling();
  } else {
    stopCursorPolling();
  }
};

/**
 * 切换"吸附是否居中"配置后，立即重新对齐窗口
 * - 切到居中：清掉 saved.x，重新居中到当前屏
 * - 切到非居中：把当前位置写入 saved，方便下次启动恢复
 */
export const applyDynamicIslandSnapCentered = (snapCentered: boolean): void => {
  const win = getDynamicIslandWindow();
  if (!win) return;
  const saved = store.get("windowStates.dynamicIsland");
  if (saved.mode !== "snapped") return;

  if (isNotchFusionEnabled()) {
    store.set("windowStates.dynamicIsland", {
      ...saved,
      mode: "snapped",
      x: null,
      y: null,
    });
    const pos = computeSnappedPos();
    win.setBounds({ x: pos.x, y: pos.y, width: cachedSize.width, height: cachedSize.height });
    return;
  }

  if (snapCentered) {
    store.set("windowStates.dynamicIsland", {
      ...saved,
      mode: "snapped",
      x: null,
      y: null,
    });
  } else if (saved.x === null) {
    const bounds = win.getBounds();
    const display = screen.getDisplayNearestPoint({
      x: bounds.x + Math.round(bounds.width / 2),
      y: bounds.y + Math.round(bounds.height / 2),
    });
    // 存中心点 x，与拖拽吸附保持同一语义
    store.set("windowStates.dynamicIsland", {
      ...saved,
      mode: "snapped",
      x: bounds.x + Math.round(bounds.width / 2),
      y: display.workArea.y,
    });
  }
  const pos = computeSnappedPos();
  win.setBounds({ x: pos.x, y: pos.y, width: cachedSize.width, height: cachedSize.height });
};

/**
 * 切换刘海融合后立即重算吸附位置
 * @param enabled - 是否启用刘海融合
 */
export const applyDynamicIslandNotchFusion = (enabled: boolean): void => {
  const win = getDynamicIslandWindow();
  if (!win) return;
  const saved = store.get("windowStates.dynamicIsland");
  if (enabled) {
    store.set("windowStates.dynamicIsland", {
      ...saved,
      mode: "snapped",
      x: null,
      y: null,
    });
  } else if (saved.mode !== "snapped") {
    return;
  }
  const pos = computeSnappedPos();
  win.setBounds({ x: pos.x, y: pos.y, width: cachedSize.width, height: cachedSize.height });
};

/**
 * 应用窗口高度：渲染端上报"基准高度 × 缩放（× 行数）"算出的最终高度
 * 主进程仅做安全 clamp，不再硬编码具体值
 * 吸附态走 computeSnappedPos 贴合真实刘海；浮动态保持当前 x/y
 */
export const applyDynamicIslandHeight = (height: number): void => {
  const win = getDynamicIslandWindow();
  if (!win) return;
  const h = clampHeight(height);
  cachedSize.height = h;
  const saved = store.get("windowStates.dynamicIsland");
  if (saved.mode === "snapped" || isNotchFusionEnabled()) {
    const pos = computeSnappedPos();
    win.setBounds({ x: pos.x, y: pos.y, width: cachedSize.width, height: h });
  } else {
    const bounds = win.getBounds();
    win.setBounds({ x: bounds.x, y: bounds.y, width: cachedSize.width, height: h });
  }
};

/**
 * 弹簧动画版高度：灵动岛展开/收起时的窗口高度动画（渲染端液体层已改"展开到位 + jelly
 * 回弹"两段式；此处弹簧仅用于 showLyric 开关时的窗口高度弹性过渡，与液体 blob 节奏解耦）。
 * 吸附态走 computeSnappedPos 贴合刘海；浮动态保持中心点。
 */
const HEIGHT_SPRING_OPEN = { omega: 7.0, zeta: 0.45 };
const HEIGHT_SPRING_CLOSE = { omega: 9, zeta: 0.6 };
const springStep = (t: number, omega: number, zeta: number): number => {
  const s = Math.sqrt(Math.max(0.0001, 1 - zeta * zeta));
  const wd = omega * s;
  const exp = Math.exp(-zeta * omega * t);
  return 1 - exp * (Math.cos(wd * t) + (zeta / s) * Math.sin(wd * t));
};
const springSettle = (omega: number, zeta: number): number => {
  for (let t = 0.02; t < 6; t += 0.02) {
    if (Math.abs(springStep(t, omega, zeta) - 1) < 0.001) return t;
  }
  return 2;
};
let heightAnimTimer: ReturnType<typeof setInterval> | null = null;

export const applyDynamicIslandHeightAnimated = (targetHeight: number): void => {
  const win = getDynamicIslandWindow();
  if (!win) return;
  const target = clampHeight(targetHeight);
  if (heightAnimTimer) {
    clearInterval(heightAnimTimer);
    heightAnimTimer = null;
  }
  const start = cachedSize.height;
  if (start === target) return;
  const { omega, zeta } = target > start ? HEIGHT_SPRING_OPEN : HEIGHT_SPRING_CLOSE;
  const settle = springSettle(omega, zeta);
  const startTime = Date.now();
  heightAnimTimer = setInterval(() => {
    const elapsed = (Date.now() - startTime) / 1000;
    if (elapsed >= settle) {
      cachedSize.height = target;
      const saved = store.get("windowStates.dynamicIsland");
      if (saved.mode === "snapped" || isNotchFusionEnabled()) {
        const pos = computeSnappedPos();
        win.setBounds({ x: pos.x, y: pos.y, width: cachedSize.width, height: target });
      } else {
        const b = win.getBounds();
        win.setBounds({ x: b.x, y: b.y, width: cachedSize.width, height: target });
      }
      if (heightAnimTimer) clearInterval(heightAnimTimer);
      heightAnimTimer = null;
      return;
    }
    const p = springStep(elapsed, omega, zeta);
    const h = Math.round(start + (target - start) * p);
    cachedSize.height = h;
    const saved = store.get("windowStates.dynamicIsland");
    if (saved.mode === "snapped" || isNotchFusionEnabled()) {
      const pos = computeSnappedPos();
      win.setBounds({ x: pos.x, y: pos.y, width: cachedSize.width, height: h });
    } else {
      const b = win.getBounds();
      win.setBounds({ x: b.x, y: b.y, width: cachedSize.width, height: h });
    }
  }, 16);
};

/**
 * 从配置计算窗口宽度: default=324 / wide=236(仅歌词) / custom=customWidth
 */
export const getDynamicIslandWidthFromConfig = (): number => {
  const cfg = store.get("dynamicIsland") || {};
  if (cfg.widthMode === "wide") return 236;
  if (cfg.widthMode === "custom") return cfg.customWidth || 240;
  return 324;
};

/**
 * 应用窗口宽度：渲染端上报目标宽度后立即 resize
 * snapped 模式重算 x 居中；floating 模式保持中心点不变
 * 上限按当前屏 bounds 裁剪，避免长歌词撑出屏幕
 */
export const applyDynamicIslandWidth = (width: number): void => {
  const win = getDynamicIslandWindow();
  if (!win) return;
  const bounds = win.getBounds();
  const display = screen.getDisplayNearestPoint({
    x: bounds.x + Math.round(bounds.width / 2),
    y: bounds.y + Math.round(bounds.height / 2),
  });
  const newWidth = clampWidth(width, display);
  const oldWidth = cachedSize.width;
  cachedSize.width = newWidth;
  const saved = store.get("windowStates.dynamicIsland");
  if (saved.mode === "snapped") {
    const pos = computeSnappedPos(display);
    win.setBounds({ x: pos.x, y: pos.y, width: newWidth, height: cachedSize.height });
  } else {
    // 保持中心点不变
    const centerX = bounds.x + Math.round(oldWidth / 2);
    const newX = centerX - Math.round(newWidth / 2);
    win.setBounds({ x: newX, y: bounds.y, width: newWidth, height: cachedSize.height });
  }
};

/**
 * 移动窗口到指定位置
 * 尺寸始终用权威 cachedSize 写回；拖拽过程保持自由移动
 * 仅约束 y 不上下越界，x 允许超出屏幕（迁移到副屏或半隐都可）
 * 过程中根据距顶部距离实时广播视觉 mode，让圆角随拖拽平滑切换
 */
export const moveDynamicIslandWindow = (x: number, y: number): void => {
  const win = getDynamicIslandWindow();
  if (!win) return;
  const tx = Math.round(x);
  let ty = Math.round(y);
  // 用窗口中心点找最近显示器，避免越界后 getDisplayMatching 选错屏
  const display = screen.getDisplayNearestPoint({
    x: tx + Math.round(cachedSize.width / 2),
    y: ty + Math.round(cachedSize.height / 2),
  });
  const wa = display.workArea;
  const maxTy = wa.y + (wa.height || display.bounds.height) - cachedSize.height;
  ty = Math.min(maxTy, ty);
  win.setBounds({ x: tx, y: ty, width: cachedSize.width, height: cachedSize.height });
  broadcastMode(ty <= display.bounds.y + NOTCH_TOP_OFFSET ? "snapped" : "floating");
};

/** 当前广播过的吸附模式，用于跨阈值时去抖 */
let lastBroadcastMode: "snapped" | "floating" | null = null;

/** 广播当前吸附模式；重复状态不重发 */
const broadcastMode = (mode: "snapped" | "floating"): void => {
  if (mode === lastBroadcastMode) return;
  lastBroadcastMode = mode;
  const win = getDynamicIslandWindow();
  win?.webContents.send("dynamicIsland:modeChange", mode);
};

/**
 * 拖拽结束时判定吸附
 * 落点 y 距离顶部 < SNAP_THRESHOLD 则吸附
 * 否则记录 floating + 当前坐标
 */
export const saveDynamicIslandState = (): void => {
  const win = getDynamicIslandWindow();
  if (!win) return;
  const b = win.getBounds();
  // 用窗口中心点找最近显示器，避免 x 超出屏幕时 getDisplayMatching 选错屏
  const display = screen.getDisplayNearestPoint({
    x: b.x + Math.round(b.width / 2),
    y: b.y + Math.round(b.height / 2),
  });
  const wa = display.workArea;
  const snapY = isNotchFusionEnabled() ? display.bounds.y + NOTCH_TOP_OFFSET : wa.y;
  if (b.y - snapY <= SNAP_THRESHOLD) {
    const config = store.get("dynamicIsland");
    if (isNotchFusionEnabled() || config.snapCentered) {
      const pos = computeSnappedPos(display);
      win.setBounds({ x: pos.x, y: pos.y, width: cachedSize.width, height: cachedSize.height });
      store.set("windowStates.dynamicIsland", {
        ...store.get("windowStates.dynamicIsland"),
        mode: "snapped",
        x: null,
        y: null,
      });
    } else {
      // 保留拖到的水平位置；存中心点而非左上角，让后续宽度变化围绕中心点对称伸缩
      const clampedLeftX = Math.max(wa.x, Math.min(wa.x + wa.width - cachedSize.width, b.x));
      const centerX = clampedLeftX + Math.round(cachedSize.width / 2);
      win.setBounds({
        x: clampedLeftX,
        y: wa.y,
        width: cachedSize.width,
        height: cachedSize.height,
      });
      store.set("windowStates.dynamicIsland", {
        ...store.get("windowStates.dynamicIsland"),
        mode: "snapped",
        x: centerX,
        y: wa.y,
      });
    }
    broadcastMode("snapped");
  } else {
    store.set("windowStates.dynamicIsland", {
      ...store.get("windowStates.dynamicIsland"),
      mode: "floating",
      x: b.x,
      y: b.y,
    });
    broadcastMode("floating");
  }
};

/** 创建灵动岛窗口，如果窗口已存在则显示并聚焦 */
export const createDynamicIslandWindow = (): BrowserWindow => {
  if (dynamicIslandWindow && !dynamicIslandWindow.isDestroyed()) {
    syncDynamicIslandVisibility();
    return dynamicIslandWindow;
  }
  const config = store.get("dynamicIsland");
  const saved = store.get("windowStates.dynamicIsland");
  const fusionEnabled = isNotchFusionEnabled();

  const initialDisplay = fusionEnabled ? screen.getPrimaryDisplay() : getCurrentDisplay();
  const floatingPos =
    !fusionEnabled && saved.mode === "floating" && saved.x !== null && saved.y !== null
      ? { x: saved.x, y: saved.y }
      : null;
  // 真实刘海尺寸仅用于日志/后续定位，当前高度以基准高度为准（与打包产物一致）
  void getNotchMetrics(initialDisplay);
  cachedSize.width = clampWidth(getDynamicIslandWidthFromConfig(), initialDisplay);
  cachedSize.height = clampHeight(DYNAMIC_ISLAND_BASE_HEIGHT * config.scale);

  let initialPos: { x: number; y: number };
  if (floatingPos) {
    // 保存的 floating 位置可能已不在任何屏幕内（拔副屏、改分辨率等），按所在屏 workArea 纠正
    const display = screen.getDisplayNearestPoint({
      x: floatingPos.x + Math.round(cachedSize.width / 2),
      y: floatingPos.y + Math.round(cachedSize.height / 2),
    });
    const wa = display.workArea;
    initialPos = {
      x: Math.max(wa.x, Math.min(wa.x + wa.width - cachedSize.width, floatingPos.x)),
      y: Math.max(wa.y, Math.min(wa.y + wa.height - cachedSize.height, floatingPos.y)),
    };
  } else {
    if (fusionEnabled) {
      store.set("windowStates.dynamicIsland", {
        ...saved,
        mode: "snapped",
        x: null,
        y: null,
      });
    } else if (config.snapCentered && saved.mode !== "snapped") {
      store.set("windowStates.dynamicIsland", {
        ...saved,
        mode: "snapped",
        x: null,
        y: null,
      });
    }
    initialPos = computeSnappedPos(initialDisplay);
  }

  dynamicIslandWindow = createWindow({
    width: cachedSize.width,
    height: cachedSize.height,
    show: false,
    minWidth: 1,
    minHeight: 1,
    x: initialPos.x,
    y: initialPos.y,
    title: "Dynamic Island",
    frame: false,
    transparent: true,
    hasShadow: false,
    resizable: false,
    movable: true,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    roundedCorners: false,
    alwaysOnTop: config.alwaysOnTop,
    skipTaskbar: true,
    backgroundColor: "#00000000",
    webPreferences: {
      disableDialogs: true,
      zoomFactor: 1.0,
      // 关闭后台节流：窗口隐藏时渲染端必须继续运行，
      // 否则 Gooey scaleY 动画/transition 在显示瞬间被判已完成 → 闪现/黑屏。
      backgroundThrottling: false,
    },
  });

  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    dynamicIslandWindow.loadURL(
      `${process.env["ELECTRON_RENDERER_URL"]}/windows/dynamic-island/index.html`,
    );
  } else {
    dynamicIslandWindow.loadFile(join(__dirname, "../renderer/windows/dynamic-island/index.html"));
  }

  dynamicIslandWindow.webContents.on("did-finish-load", () => {
    if (!dynamicIslandWindow) return;
    dynamicIslandWindow.webContents.setZoomFactor(1.0);
    // 重播 mode，修复 HMR 刷新后 mode 丢失
    const currentSaved = store.get("windowStates.dynamicIsland");
    lastBroadcastMode = null;
    broadcastMode(currentSaved.mode === "floating" ? "floating" : "snapped");
    // 同步播放态基线：窗口加载完成即视为已同步过 visibility，
    // 避免加载期间（渲染端 onMounted 已自行弹出一次）首次 sync 再推一次
    // visibility:true，导致"先展开 → 闪缩 → 再弹出"的重复动画。
    lastIslandPlaying = isPlaying();
  });

  dynamicIslandWindow.once("ready-to-show", () => {
    if (!dynamicIslandWindow) return;
    // 仅非遮挡模式才忽略鼠标事件并轮询光标；无条件开启会导致普通模式
    // 点击穿透、光标靠近即被判为悬停而整体透明（表现为无法点击/关闭）
    applyDynamicIslandNonOcclusive(store.get("dynamicIsland").nonOcclusive === true);
    syncDynamicIslandVisibility();
  });

  setTrayDynamicIsland(true);
  broadcast("dynamicIsland:visibilityChange", true);
  store.set("windowStates.dynamicIsland.visible", true);

  dynamicIslandWindow.on("closed", () => {
    stopCursorPolling();
    dynamicIslandWindow = null;
    lastBroadcastMode = null;
    setTrayDynamicIsland(false);
    broadcast("dynamicIsland:visibilityChange", false);
    if (!isAppQuitting()) {
      store.set("windowStates.dynamicIsland.visible", false);
    }
  });

  return dynamicIslandWindow;
};

/** 关闭灵动岛窗口 */
export const closeDynamicIslandWindow = (): void => {
  cancelIslandHide();
  if (dynamicIslandWindow && !dynamicIslandWindow.isDestroyed()) {
    dynamicIslandWindow.close();
  }
};

/** 切换灵动岛窗口 */
export const toggleDynamicIslandWindow = (): boolean => {
  if (dynamicIslandWindow && !dynamicIslandWindow.isDestroyed()) {
    closeDynamicIslandWindow();
    return false;
  }
  createDynamicIslandWindow();
  return true;
};

/** 获取灵动岛窗口实例 */
export const getDynamicIslandWindow = (): BrowserWindow | null => {
  if (dynamicIslandWindow && !dynamicIslandWindow.isDestroyed()) return dynamicIslandWindow;
  return null;
};

// 灵动岛默认常驻：暂停不再自动隐藏窗口（由渲染端弹性缩回刘海小药丸）。
// 保留 cancelIslandHide 兼容旧调用（空操作）。
const cancelIslandHide = (): void => {
  /* 常驻模式无延迟隐藏任务，保留函数以兼容旧调用点 */
};
/** 上一次同步时的播放态，用于让 visibility 同步幂等（避免 5Hz 进度同步重复吸附覆盖调试位置） */
let lastIslandPlaying = false;

export const syncDynamicIslandVisibility = (): void => {
  const win = getDynamicIslandWindow();
  if (!win || win.isDestroyed()) return;
  const playing = isPlaying();
  // 切歌 / 加载中的瞬态非播放态（loading 等）不算暂停：岛保持现状不切换，
  // 基线 lastIslandPlaying 也不更新，加载完成后恢复 playing 时不会误判为「恢复播放」
  if (!playing && isTrackLoading()) return;
  if (playing) {
    // 恢复播放：取消任何待隐藏，立即显示（内容由协调器在 openLead 后平滑 reveal）
    cancelIslandHide();
    win.showInactive();
    win.setAlwaysOnTop(true, ISLAND_AOT_LEVEL);
    // 仅在「非播放 → 播放」切换时吸附一次（对齐刘海）。播放中的 5Hz 进度同步会反复
    // 调用本函数，若每次都 setBounds 会把几何调试台设置的 islandY 负偏移拉回默认值。
    if (!lastIslandPlaying) {
      // 通知渲染端：灵动岛出现 → Gooey 液体弹性弹出（scaleY 起跳）
      try {
        win.webContents.send("dynamicIsland:visibility", true);
      } catch {
        /* webContents 未就绪则忽略；渲染端 onMounted 会用 getVisibility 兜底 */
      }
      // macOS 会把位于菜单栏区域(availTop=39)内的窗口吸附到 availTop，
      // 导致贴合的 Y 值(如36)在显示后被覆盖。显示后强制 setBounds 拉回目标位置。
      const applySnapPos = (): void => {
        if (!win || win.isDestroyed()) return;
        const pos = computeSnappedPos();
        win.setBounds({ x: pos.x, y: pos.y, width: cachedSize.width, height: cachedSize.height });
      };
      applySnapPos();
      setTimeout(applySnapPos, 150);
    }
  } else {
    // 暂停：灵动岛默认常驻 —— 只通知渲染端液体缩回刘海小药丸，**不隐藏窗口**。
    // （原自动 hide 是"黑屏几秒后闪现消失"的根源；现在岛保持打开，播放再弹出。）
    if (win.isVisible() && lastIslandPlaying) {
      try {
        win.webContents.send("dynamicIsland:visibility", false);
      } catch {
        /* ignore */
      }
    }
  }
  lastIslandPlaying = playing;
};

/** 查询灵动岛窗口当前是否可见（渲染端 onMounted 兜底初始态） */
export const getDynamicIslandVisible = (): boolean => {
  const win = getDynamicIslandWindow();
  return !!win && !win.isDestroyed() && win.isVisible();
};
