<script setup lang="ts">
import type { DynamicIslandSettings } from "@shared/types/settings";
import type { LyricLine } from "@shared/types/lyrics";
import type { DynamicIslandDebugGeom } from "@shared/types/window";
import { isMac } from "@/utils/config";
import { pickPrimaryIndex } from "@shared/utils/lyricSync";
import {
  useNowPlayingSync,
  getNowPlayingCurrentMs,
} from "@windows/shared/composables/useNowPlayingSync";
import { NotchAnimationCoordinator, PHASE } from "./notchAnimationCoordinator";
import IslandCover from "./components/IslandCover.vue";
import IslandSpectrum from "./components/IslandSpectrum.vue";
import {
  extractColorPalette,
  mixWithWhite,
  hexToRgba,
  DEFAULT_PALETTE,
  type CoverPalette,
} from "./composables/useCoverColor";

// 窗口宽度模式: default=324 / wide=242(仅歌词模式) / custom=自定义 customWidth（岛宽固定，歌词过长时滚动而非扩宽）
const DEFAULT_WIDTH = 324;
const WIDE_WIDTH = 242;
const DEFAULT_CUSTOM_WIDTH = 240;
const BAR_HEIGHT = 28; // 歌词行高度（不变）
// 顶部封面/频谱区高度：≈刘海高度，封面频谱贴屏幕最顶、左右分列、垂直居中
const TOP_HEIGHT = 37;
// 封面尺寸 / 频谱尺寸与柱数（与组件默认值一致，可被调试参数覆盖）
const COVER_SIZE = 26;
const SPEC_W = 25;
const SPEC_H = 18;
const SPEC_BARS = 5;

// 几何调试参数：已按调试控制台最终参数固定（控制台入口已移除，以下为常量）。
const geom = reactive<DynamicIslandDebugGeom>({
  islandW: DEFAULT_WIDTH,
  topH: TOP_HEIGHT,
  lyricH: BAR_HEIGHT,
  /** 无歌词时岛高度（关闭歌词后收回） */
  noLyricH: 39,
  coverSize: COVER_SIZE,
  specW: SPEC_W,
  specH: SPEC_H,
  barCount: SPEC_BARS,
  barGap: 2.5,
  /** 岛位置 0 表示用主进程默认居中（贴刘海） */
  islandX: 0,
  islandY: -61,
  /** 三个控件在各自容器内的 margin 偏移（已按用户参数固定） */
  coverMarginLeft: 0,
  coverMarginTop: 0,
  spectrumMarginRight: 0,
  spectrumMarginTop: 0,
  lyricMarginLeft: -6,
  lyricMarginRight: 20,
  /** 歌词字号（几何调试可调，调好后落地为常量） */
  lyricFontSize: 13,
  /** 封面/频谱/歌词 独立 xy 偏移与宽高（调试台最终参数，固定为常量） */
  coverX: 13,
  coverY: 0,
  coverW: COVER_SIZE,
  coverH: COVER_SIZE,
  specX: -13,
  specY: 0,
  lyricX: 12,
  lyricY: -1,
  lyricW: 242,
});

// 一次性 Marquee 参数：静止 → 滚动 → 末尾停留 → 平滑回程 → 停止（不循环）
const MARQUEE_SPEED_PPS = 25; // 滚动速度 20~30px/s
const MARQUEE_REST_START_S = 1.5; // 起始静止 1.2~1.8s
const MARQUEE_REST_END_S = 1; // 末尾停留 0.8~1.2s
const MARQUEE_BACK_S = 0.8; // 平滑回程时长
const MARQUEE_MIN_SCROLL_S = 2.5; // duration=distance/speed，下限
const MARQUEE_MAX_SCROLL_S = 8; // 上限
// 滚动终点安全余量：避免测量误差导致滚过头、最后一个字右侧出现黑色空白
const MARQUEE_OVERSCROLL_PAD = 2;

// 歌词切换动画：旧歌词向上淡出，新歌词向下淡入（250~350ms）
const MORPH_MS = 300;
const MORPH_OUT_Y = -8; // 旧歌词 offsetY → -6~10px
const MORPH_IN_Y = 8; // 新歌词 offsetY +6~10px → 0

// 纯音乐启发式关键词（歌词为空时按曲目标题/艺术家判断）
const INST_KEYWORDS = ["纯音乐", "钢琴曲", "bgm", "伴奏", "演奏", "instrumental"];

const config = reactive<DynamicIslandSettings>({
  scale: 1,
  fontWeight: 500,
  fontFamily: "",
  wordByWord: true,
  playedColor: "rgba(255, 255, 255, 1)",
  unplayedColor: "rgba(255, 255, 255, 0.5)",
  backgroundColor: "rgba(0, 0, 0, 1)",
  alwaysOnTop: true,
  snapCentered: true,
  notchFusion: false,
  nonOcclusive: false,
  doubleLine: false,
  showTranslation: true,
  showLyric: true,
  useCSSDrag: false,
  widthMode: "default",
  customWidth: DEFAULT_CUSTOM_WIDTH,
  lyricFontSize: 13,
});

// 根据宽度模式计算窗口宽度（默认 220 / 宽屏 302 / 自定义 customWidth）
const computeWidth = (): number => {
  if (config.widthMode === "wide") return WIDE_WIDTH;
  if (config.widthMode === "custom") return config.customWidth || DEFAULT_CUSTOM_WIDTH;
  return DEFAULT_WIDTH;
};

const { track, lyric, playing, primaryIndex, lyricLoading } = useNowPlayingSync({
  // 与桌面歌词 / 任务栏歌词 / 迷你播放器统一用 pickPrimaryIndex，
  // 保证「哪句是当前句」的判定一致，切换时机不再比其它视图快/提前。
  pickIndex: pickPrimaryIndex,
  logTag: "dynamic-island",
});

// 注：灵动岛已禁用拖拽 —— 拖动超出一定距离会把窗口移出屏幕导致"消失"。
// 位置由主进程 computeSnappedPos 吸附（贴刘海/居中），如需移动请通过设置或托盘。

const mode = ref<"snapped" | "floating">("snapped");
const hovering = ref(false);
// 窗口可见态（主进程播放/暂停驱动）：控制 Gooey 液体弹出/收回与整体淡入淡出，
// 与协调器内容 reveal（慢 fade）解耦 —— 弹性是"灵动岛出现/退出"本身的效果
const islandShown = ref(false);
const notchFusionEnabled = computed(() => isMac && config.notchFusion && mode.value === "snapped");

// ---- Gooey 液体层动画器（JS rAF 驱动）----
// 不用 CSS transition：隐藏窗口被节流/同 tick 改类会让 transition 直接跳到终态（闪现/黑屏）。
// 展开 = 两段式（解决"延时回弹"：阶跃弹簧的过冲发生在展开中后期，感知像"慢半拍"）：
//   ① 0.75s easeOutCubic 平滑展开到位（无过冲）
//   ② 到位后立即 0.7s 衰减正弦 jelly 回弹（幅度 ~4.5%，2~3 次衰减振荡 → 果冻感）
// 收起 = 0.7s easeOutCubic 平滑收回（干净，无回弹）。
// 几何（metaball 关键：blob 尺寸有差异，融合处才出现弧线轮廓）：
//   - notch（刘海源）：scaleX 0.42→1，小药丸向两侧撑开成全宽
//   - body（展开主体）：scale(sx 0.42→1, sy 0.15→1)，先垂直滴落再水平展开
//   - guard（顶部锐边盖板）：盖住 goo 模糊顶部，宽度/圆角随 prog
//   - face（前景内容层）：clip-path 从底部"吃掉"，随液体一起收缩（吸进/流出）
const gooBodyRef = ref<HTMLElement | null>(null);
const notchRef = ref<HTMLElement | null>(null);
const neckRef = ref<HTMLElement | null>(null);
const gooGuardRef = ref<HTMLElement | null>(null);
/** 外层：clip 钉在液面（屏幕坐标固定）；内层：负责下沉位移。
 *  二者必须分层 —— 同元素上 clip 先于 transform 应用，裁剪带会被一起平移，
 *  导致内容带漂到液体外（悬浮独立）+ 收起态封面边缘残留在窗口底部。 */
const faceRef = ref<HTMLElement | null>(null);
const faceMoveRef = ref<HTMLElement | null>(null);
/** 前景内容下沉比例：收起时内容随液体收缩整体下移（相对自身高=窗口高），
 *  88% 时封面/歌词在 prog=0 已完全沉出 clip 区，视觉即"被拖入刘海" */
const FACE_SINK_RATIO = 88;
/** 弹出段时长：结束后立即进入 jelly 回弹（750→500，回弹提早 250ms 出现） */
const GOO_EXPAND_MS = 500;
const GOO_JELLY_MS = 700;
/** 收回段时长：与展开主段一致，随后接同款 jelly 回弹（总节奏与展开对等） */
const GOO_COLLAPSE_MS = 500;
/** 收起 jelly 幅度：缩入后液体微微再探出又收回（取绝对值保证不过零翻转） */
const GOO_COLLAPSE_JELLY_AMP = 0.35;
const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);
/** jelly 回弹：1 + A·e^(−k·t)·sin(ω·t)，从 1 开始衰减振荡（A=过冲幅度） */
const jelly = (t: number): number => 1 + 0.022 * Math.exp(-6 * t) * Math.sin(14 * t);
let gooRaf = 0;
/** 当前展开进度：0=收起小药丸，1=完全展开（jelly 阶段允许轻微 >1） */
let gooProgress = 0;
/** 由进度 prog 推导所有几何（prog 0~1，jelly 过冲轻微 >1） */
const setGoo = (prog: number): void => {
  const body = gooBodyRef.value;
  if (body) {
    const sy = 0.15 + 0.85 * prog;
    const sx = 0.42 + 0.58 * prog;
    body.style.transform = `scale(${sx.toFixed(4)}, ${sy.toFixed(4)})`;
  }
  const n = notchRef.value;
  if (n) n.style.transform = `scaleX(${(0.42 + 0.58 * prog).toFixed(4)})`;
  const neck = neckRef.value;
  if (neck) {
    // 拉丝颈已禁用：独立竖条的节奏与液体主体难以协调（见历史记录）。
    // 保留 DOM/CSS 结构便于后续恢复；当前恒隐藏。
    neck.style.transform = "translateX(-50%) scaleY(0)";
  }
  const guard = gooGuardRef.value;
  if (guard) {
    // 顶部锐边盖板：宽度随 notch 同步撑开；顶角圆角在「收起药丸 pillR」与
    // 「展开贴刘海 expandTopR」间随进度插值（展开态可拟合物理刘海的圆弧）
    const gx = 0.42 + 0.58 * prog;
    const cProg = Math.min(1, Math.max(0, prog));
    const topR = (1 - cProg) * RADIUS_CFG.pillR + cProg * RADIUS_CFG.expandTopR;
    guard.style.transform = `scaleX(${gx.toFixed(4)})`;
    guard.style.borderRadius = `${topR.toFixed(1)}px ${topR.toFixed(1)}px ${RADIUS_CFG.pillR}px ${RADIUS_CFG.pillR}px`;
  }
  // 前景内容：贴液面运动（随灵动岛整体进退，而非原地被裁/独立淡出）——
  //   内层 translateY = 液体收缩量 × FACE_SINK_RATIO（内容像放在液面上被拖入刘海）；
  //   外层 clip 四边贴齐液体横截面：左右贴 blob 的 scaleX 收缩（居中对称），
  //   底边贴 body 底边（65×sy）→ 可见区始终与液体黑区重合，
  //   内容沉入液面/缩出侧边都被裁掉，绝不悬浮在透明区上。
  // jelly 过冲（prog>1）不截断：内容随回弹轻微上浮外扩，与液体浑然一体。
  const faceClip = faceRef.value;
  if (faceClip) {
    const cProg = Math.min(1.05, Math.max(-0.05, prog));
    const sx = 0.42 + 0.58 * cProg;
    const sy = 0.15 + 0.85 * cProg;
    const sideInset = Math.max(-5, (1 - sx) / 2 * 100);
    const insetBottom = Math.min(105, Math.max(-5, (1 - sy) * 100));
    faceClip.style.clipPath = `inset(0 ${sideInset.toFixed(2)}% ${insetBottom.toFixed(2)}% ${sideInset.toFixed(2)}%)`;
  }
  const faceMove = faceMoveRef.value;
  if (faceMove) {
    const cProg = Math.min(1.05, Math.max(-0.05, prog));
    faceMove.style.transform = `translateY(${((1 - cProg) * FACE_SINK_RATIO).toFixed(2)}%)`;
  }
};

/* ===== 圆角 / 刘海拟合参数（托盘「灵动岛几何调试台」实时下发）=====
   吸附态轮廓由像素语义参数生成单条归一化 path，参考高取「当前实际窗口高度」——
   开/关歌词只是底边向上收缩、高度变化时形状语义（顶角/底角弧度）保持一致；
   液体层与兜底圆角经 CSS 变量下发。调好后从控制台「复制参数」，把数值写回
   本对象作为新默认值。 */
const BOT_CTRL_RATIO = 0.6429;
const RADIUS_CFG = reactive({
  /** 归一化参考宽度（换算基准，一般不动） */
  refW: 380,
  /** 顶角水平外扩 */
  topX: 16.6,
  /** 顶角下垂深度 */
  topY: 8.5,
  /** 底角总水平延伸 */
  botRx: 18,
  /** 底角垂直半径 */
  botRy: 17,
  /** 刘海 blob 底角 */
  notchR: 10,
  /** 主体 blob 底角 */
  gooBodyR: 18.5,
  /** 收起态药丸圆角（guard 盖板） */
  pillR: 18,
  /** 展开态顶角圆角（guard 盖板贴刘海的两角；拟合物理刘海圆弧） */
  expandTopR: 7,
});
const f5 = (n: number): string => n.toFixed(5);
const genSnappedD = (hRef: number): string => {
  const { refW, topX, topY, botRx, botRy } = RADIUS_CFG;
  const nx = topX / refW;
  const ny = topY / hRef;
  const by = 1 - botRy / hRef;
  const ex = nx + botRx / refW;
  const cx = nx + BOT_CTRL_RATIO * (ex - nx);
  return [
    "M0 0",
    `C0 0 ${f5(nx)} 0 ${f5(nx)} ${f5(ny)}`,
    `L${f5(nx)} ${f5(by)}`,
    `C${f5(nx)} 1 ${f5(cx)} 1 ${f5(ex)} 1`,
    `L${f5(1 - ex)} 1`,
    `C${f5(1 - cx)} 1 ${f5(1 - nx)} 1 ${f5(1 - nx)} ${f5(by)}`,
    `L${f5(1 - nx)} ${f5(ny)}`,
    `C${f5(1 - nx)} 0 1 0 1 0 Z`,
  ].join(" ");
};
const snappedD = computed(() => genSnappedD(computeIslandHeight()));

/** 刘海底缘参考框：先拖到与真机刘海重合，再照着调岛的上圆角 */
const notchGuide = reactive({ show: false, w: 226, h: 32, r: 10, x: 0 });

watchEffect(() => {
  const s = document.documentElement.style;
  s.setProperty("--di-r-notch", `${RADIUS_CFG.notchR}px`);
  s.setProperty("--di-r-goo-body", `${RADIUS_CFG.gooBodyR}px`);
  s.setProperty("--di-r-snap-b", `${RADIUS_CFG.botRy}px`);
});

onMounted(() => {
  window.api.dynamicIsland.onDebugGeom((p) => {
    // 布局几何全量应用（封面/频谱/歌词 xy、宽高、margin 等）
    const geomKeys = [
      "topH",
      "lyricH",
      "noLyricH",
      "coverSize",
      "specW",
      "specH",
      "barCount",
      "barGap",
      "coverMarginLeft",
      "coverMarginTop",
      "spectrumMarginRight",
      "spectrumMarginTop",
      "lyricMarginLeft",
      "lyricMarginRight",
      "coverX",
      "coverY",
      "coverW",
      "coverH",
      "specX",
      "specY",
      "lyricX",
      "lyricY",
      "lyricW",
    ] as const;
    let geomDirty = false;
    for (const k of geomKeys) {
      if (p[k] != null) {
        geom[k] = p[k];
        geomDirty = true;
      }
    }
    // 歌词字号：调试台覆写为运行时改 config（设置项才是持久化来源）
    if (p.lyricFontSize != null) config.lyricFontSize = p.lyricFontSize;
    // 圆角 / 刘海拟合参数
    if (p.clipTopX != null) RADIUS_CFG.topX = p.clipTopX;
    if (p.clipTopY != null) RADIUS_CFG.topY = p.clipTopY;
    if (p.clipBotRx != null) RADIUS_CFG.botRx = p.clipBotRx;
    if (p.clipBotRy != null) RADIUS_CFG.botRy = p.clipBotRy;
    if (p.gooNotchR != null) RADIUS_CFG.notchR = p.gooNotchR;
    if (p.gooBodyR != null) RADIUS_CFG.gooBodyR = p.gooBodyR;
    if (p.pillR != null) RADIUS_CFG.pillR = p.pillR;
    if (p.expandTopR != null) RADIUS_CFG.expandTopR = p.expandTopR;
    if (p.guideW != null) {
      notchGuide.w = p.guideW;
      notchGuide.show = p.guideW > 0;
    }
    if (p.guideH != null) notchGuide.h = p.guideH;
    if (p.guideR != null) notchGuide.r = p.guideR;
    if (p.guideX != null) notchGuide.x = p.guideX;
    // 高度相关字段变化时重新上报窗口总高（topH/lyricH/noLyricH 即总高来源）
    if (p.heightOverride != null) heightOverride.value = p.heightOverride;
    if (geomDirty || p.heightOverride != null) {
      window.api.dynamicIsland.setHeight(computeIslandHeight());
    }
  });
});
const animateGoo = (to: number): void => {
  if (gooRaf) cancelAnimationFrame(gooRaf);
  const from = gooProgress;
  if (from === to) return;
  const start = performance.now();
  const tick = (now: number): void => {
    const elapsed = now - start;
    let prog: number;
    let done = false;
    if (to === 1) {
      // 展开：平滑到位（无过冲）→ 到位后立即 jelly 回弹
      if (elapsed < GOO_EXPAND_MS) {
        prog = easeOutCubic(elapsed / GOO_EXPAND_MS);
      } else {
        const t = (elapsed - GOO_EXPAND_MS) / 1000;
        prog = jelly(t);
        if (elapsed >= GOO_EXPAND_MS + GOO_JELLY_MS) {
          prog = 1;
          done = true;
        }
      }
    } else {
      // 收起：与展开对等的两段节奏——主体平滑收回 → 同款 jelly 微微探出再缩回。
      // prog 是插值比例（0→1），v = from + (to-from)*prog 从当前值降到 0；
      // 尾段取 |sin| 保证 prog ≤ 1（v ≥ 0，避免负 scale 镜像翻转）。
      // （此前误写 1-easeOutCubic：t=0 时 prog=1 → v 瞬间归零，随后又随 prog 递减涨回展开态，
      //   导致"暂停与播放一样 + 停在全展开黑条"。）
      if (elapsed < GOO_COLLAPSE_MS) {
        prog = easeOutCubic(elapsed / GOO_COLLAPSE_MS);
      } else {
        const t = (elapsed - GOO_COLLAPSE_MS) / 1000;
        prog = 1 - GOO_COLLAPSE_JELLY_AMP * Math.exp(-6 * t) * Math.abs(Math.sin(14 * t));
        if (elapsed >= GOO_COLLAPSE_MS + GOO_JELLY_MS) {
          prog = 1;
          done = true;
        }
      }
    }
    const v = from + (to - from) * prog;
    gooProgress = v;
    setGoo(v);
    if (done) {
      gooRaf = 0;
      return;
    }
    gooRaf = requestAnimationFrame(tick);
  };
  gooRaf = requestAnimationFrame(tick);
};
// 展开动画启动器：先同步置为收起态（render 一帧），再延迟两帧开始弹簧动画。
// 目的：filter 容器 + 透明窗口合成器在动画首帧偶发不应用 transform → 闪"未缩放黑条"；
// 先让合成器稳定渲染一帧收起态，再进入动画，可规避首帧合成异常。
let gooExpandToken = 0;
const startGooExpand = (): void => {
  const token = ++gooExpandToken;
  gooProgress = 0;
  setGoo(0);
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      // 期间若收到收起/新的展开（token 已变），放弃本次启动，避免动画错乱
      if (token !== gooExpandToken) return;
      animateGoo(1);
    });
  });
};
// 浮动态：胶囊保持满高（取消动画）
watch(mode, (m) => {
  if (m === "floating") {
    if (gooRaf) cancelAnimationFrame(gooRaf);
    gooProgress = 1;
    setGoo(1);
  }
});

const currentLine = computed<LyricLine | null>(() => {
  const idx = primaryIndex.value;
  const lines = lyric.value;
  if (!lines || idx < 0 || idx >= lines.length) return null;
  return lines[idx];
});

const lineText = (line: LyricLine): string => line.words.map((w) => w.word).join("");

// 封面 URL：track.cover 优先，回退 album.cover / coverOriginal
const coverSrc = computed(() => {
  const t = track.value;
  if (!t) return "";
  return t.cover || t.album?.cover || t.coverOriginal || "";
});

/* 封面加载态：切歌后到新歌开播前，封面保留上一张并模糊化；
 * 新歌就绪（playing 恢复）解除模糊并翻转到新封面。 */
const coverLoading = ref(false);
/** 兜底：加载失败且无后续曲目时自动解除，避免封面永久模糊 */
const COVER_LOADING_TIMEOUT_MS = 15000;
let coverLoadingTimer: ReturnType<typeof setTimeout> | null = null;

const clearCoverLoadingTimer = (): void => {
  if (coverLoadingTimer) {
    clearTimeout(coverLoadingTimer);
    coverLoadingTimer = null;
  }
};

watch(
  () => track.value?.id,
  (id, old) => {
    if (!id || !old || id === old) return;
    // 秒切（本地/缓存命中，playing 未跌落）直接翻转；否则进入加载模糊态
    if (playing.value) return;
    clearCoverLoadingTimer();
    coverLoading.value = true;
    coverLoadingTimer = setTimeout(() => {
      coverLoading.value = false;
      coverLoadingTimer = null;
    }, COVER_LOADING_TIMEOUT_MS);
  },
);

watch(playing, (p) => {
  if (p && coverLoading.value) {
    clearCoverLoadingTimer();
    coverLoading.value = false;
  }
});

onBeforeUnmount(clearCoverLoadingTimer);

// 封面双色调色板：切封面时异步提取，primary 喂歌词文字色 / accent，
// secondary 与 primary 一起喂给频谱柱做垂直渐变（跟随封面）
const coverPalette = ref<CoverPalette>(DEFAULT_PALETTE);
watch(
  coverSrc,
  async (src) => {
    if (!src) {
      coverPalette.value = DEFAULT_PALETTE;
      return;
    }
    coverPalette.value = await extractColorPalette(src);
  },
  { immediate: true },
);

// 歌词文字色：主色与白混合（保留色相、提亮保可读性）
// 歌词 / 间奏点 与 频谱 统一为封面主色，保证三处同色：
//   已播 = 主色（= 频谱顶色）；未播 = 同色系偏暗；间奏点 = 主色。
const accentColor = computed(() => coverPalette.value.primary);
const lyricPlayedColor = computed(() => coverPalette.value.primary); // 已播：与频谱顶色一致
const lyricUnplayedColor = computed(() => mixWithWhite(coverPalette.value.primary, 0.55)); // 未播：同色系偏暗

// 频谱双色：直接来自封面调色板（extractColorPalette 内部已 ensureSpectrumVisible）
const spectrumColors = computed(() => ({
  primary: coverPalette.value.primary,
  secondary: coverPalette.value.secondary,
}));

// 切歌时立即显示「歌名 - 歌手」，固定 hold 满时长：
// 歌词提前到达也不切换（标题优先）；hold 结束时歌词仍在加载则继续持有，
// 避免「标题→前奏点→歌词」的破碎观感。
// 只依赖 track.id 单一信号——开播快照/元数据推送走不同 IPC 链路，
// 到达顺序不保证，任何多信号配对都存在竞态（此前四轮修复的教训）。
const TITLE_HOLD_MS = 2000;
const showingTitle = ref(false);
let titleTimer: ReturnType<typeof setTimeout> | null = null;
let titleStartAt = 0;

/** 尝试结束标题：hold 时长足够且歌词不再处于加载态 */
const tryEndTitle = (): void => {
  if (!showingTitle.value) return;
  if (performance.now() - titleStartAt < TITLE_HOLD_MS) return;
  if (lyricState.value === "loading") return;
  if (titleTimer) {
    clearTimeout(titleTimer);
    titleTimer = null;
  }
  showingTitle.value = false;
};

watch(
  () => track.value?.id,
  (id) => {
    if (!id) {
      showingTitle.value = false;
      return;
    }
    // 快速连切：重置 hold 计时，始终显示当前曲目的标题
    showingTitle.value = true;
    titleStartAt = performance.now();
    if (titleTimer) clearTimeout(titleTimer);
    titleTimer = setTimeout(tryEndTitle, TITLE_HOLD_MS);
  },
  { immediate: true },
);

// 歌名 - 歌手 文本
const trackTitleText = computed(() => {
  const t = track.value;
  if (!t) return "";
  const artists = (t.artists || []).map((a) => a.name).filter(Boolean).join(" / ");
  return artists ? `${t.title} - ${artists}` : t.title;
});

// 歌词状态: loading(加载中) / precise(有精准时间轴) / no-timing(无时间轴) / instrumental(纯音乐) / unavailable(暂无歌词) / idle(无曲目)
const lyricState = computed(() => {
  if (lyricLoading.value) return "loading";
  const lines = lyric.value;
  if (lines.length > 0) {
    const hasTiming = lines.some(
      (l) => typeof l.startTime === "number" && Number.isFinite(l.startTime),
    );
    return hasTiming ? "precise" : "no-timing";
  }
  if (!track.value) return "idle";
  const haystack = [track.value.title, ...(track.value.artists || []).map((a) => a.name)]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return INST_KEYWORDS.some((k) => haystack.includes(k)) ? "instrumental" : "unavailable";
});

// 歌词加载完成（或判定无歌词）时补一次标题结束检查
watch(lyricState, tryEndTitle);

// 响应式当前播放时间（叠加 offset 后的歌词时间，ms），用于判定间奏圆点
const currentMs = ref(0);
let msRafId: number | null = null;
const tickCurrentMs = (): void => {
  currentMs.value = getNowPlayingCurrentMs();
  updateInterludeDots();
  msRafId = playing.value ? requestAnimationFrame(tickCurrentMs) : null;
};
const startMsLoop = (): void => {
  if (msRafId !== null) return;
  currentMs.value = getNowPlayingCurrentMs();
  msRafId = requestAnimationFrame(tickCurrentMs);
};
const stopMsLoop = (): void => {
  if (msRafId !== null) {
    cancelAnimationFrame(msRafId);
    msRafId = null;
  }
  currentMs.value = getNowPlayingCurrentMs();
};

// 间奏判定阈值：与 FullPlayer 一致（amll minInterludeGap=4000），
// 歌词之间的间隙只有 ≥ 4s（长伴奏）才算「间奏」，普通句与句之间的短衔接不算。
const MIN_INTERLUDE_GAP = 4000;

// 缓动函数（复制自 FullPlayer 的 Lyrics/utils/math.ts，用于复刻默认间奏圆点动画）
const clamp = (min: number, v: number, max: number): number =>
  v < min ? min : v > max ? max : v;
const easeOutExpo = (p: number): number => (p >= 1 ? 1 : 1 - Math.pow(2, -10 * p));
const easeInOutBack = (p: number): number => {
  const c1 = 1.70158;
  const c2 = c1 * 1.525;
  return p < 0.5
    ? (Math.pow(2 * p, 2) * ((c2 + 1) * 2 * p - c2)) / 2
    : (Math.pow(2 * p - 2, 2) * ((c2 + 1) * (p * 2 - 2) + c2) + 2) / 2;
};

// 间奏信息：{ start, end }（ms），非间奏返回 null。
// 复用大播放器 detectInterlude 的推导：前奏 start=0 / end=首句 startTime-250；
// 中间间奏 start=上一句 endTime / end=下一句 startTime-250；尾奏不算间奏。
interface InterludeInfo {
  start: number;
  end: number;
}

const interludeInfo = computed<InterludeInfo | null>(() => {
  if (lyricState.value !== "precise") return null;
  const lines = lyric.value;
  if (lines.length === 0) return null;
  const time = currentMs.value + 20; // 与大播放器一致的 20ms 预判
  const idx = primaryIndex.value;

  // 前奏：尚无任何行开始，且首句距开头 ≥ 阈值
  if (idx < 0) {
    const end = lines[0].startTime - 250;
    if (end < MIN_INTERLUDE_GAP) return null;
    return time < end ? { start: 0, end } : null;
  }

  const line = lines[idx];
  if (time < line.endTime) return null; // 当前句仍在唱

  const next = lines[idx + 1];
  if (!next) return null; // 尾奏不算间奏（对齐大播放器 detectInterlude）

  const start = line.endTime;
  const end = Math.max(start, next.startTime - 250);
  if (end - start < MIN_INTERLUDE_GAP) return null;
  return time >= start && time < end ? { start, end } : null;
});

const isInterlude = computed(() => interludeInfo.value !== null);

// 间奏圆点容器 ref（JS 驱动动画：整体呼吸 + 依次点亮，跟随间奏进度）
const dotsRef = ref<HTMLElement | null>(null);
let dotsHidden = true; // 缓存圆点隐藏状态，避免每帧重复写 DOM

// 复刻大播放器 renderInterludeDots：整体正弦呼吸(±5%) + 依次点亮 + 入场/退场缓动
function updateInterludeDots(): void {
  const container = dotsRef.value;
  if (!container) return;
  const dots = container.querySelectorAll<HTMLElement>("i");
  if (dots.length !== 3) return;

  const info = interludeInfo.value;
  if (!info) {
    if (!dotsHidden) {
      container.style.opacity = "0";
      dotsHidden = true;
    }
    return;
  }

  const time = currentMs.value;
  const totalDuration = info.end - info.start;
  const elapsed = time - info.start;
  if (elapsed < 0 || elapsed > totalDuration) return;

  // 呼吸缩放（正弦 ±5%）
  const breatheCycleTarget = 1500;
  const breatheCycle =
    totalDuration / Math.max(1, Math.ceil(totalDuration / breatheCycleTarget));
  let scale = Math.sin(1.5 * Math.PI - (elapsed / breatheCycle) * 2) / 20 + 1;

  // 入场缩放（easeOutExpo 前 2s）
  if (elapsed < 2000) scale *= easeOutExpo(elapsed / 2000);

  // 退场缩放（easeInOutBack 最后 0.75s）
  const remaining = totalDuration - elapsed;
  if (remaining < 750) scale *= 1 - easeInOutBack((750 - remaining) / 750 / 2);

  scale = Math.max(0, scale);
  container.style.transform = `scale(${scale.toFixed(4)})`;

  // 整体 opacity：入场淡入 + 退场淡出
  let opacity = 1;
  if (elapsed < 500) opacity = 0;
  else if (elapsed < 1000) opacity = (elapsed - 500) / 500;
  if (remaining < 375) opacity *= clamp(0, remaining / 375, 1);
  container.style.opacity = String(opacity);
  dotsHidden = false;

  // 依次点亮（三个点 opacity 依次变化，最低 0.25）
  const activeDuration = Math.max(0, totalDuration - 750);
  for (let i = 0; i < 3; i++) {
    const raw = ((elapsed - (i * activeDuration) / 3) * 3) / activeDuration;
    const progress = clamp(0.25, raw * 0.75, 1);
    dots[i].style.opacity = String(clamp(0, opacity * progress, 1));
  }
}

// 歌词显示文本（原句 + 开启翻译时右侧「（翻译）」）。
// 沿用「单一文本节点 + textContent morph」方案，避免多 computed / 双节点 morph 在切换后把当前句弄丢。
const displayLyric = computed(() => {
  // 切歌先占位显示「歌名 - 歌手」，hold 结束后切回歌词
  if (showingTitle.value && trackTitleText.value) return trackTitleText.value;
  const st = lyricState.value;
  if (st === "loading") return "· · ·";
  if (st === "instrumental") return "纯音乐，请欣赏";
  if (st === "unavailable") return "暂无歌词";
  if (isInterlude.value) return ""; // 间奏：文本留空，由模板渲染圆点
  const line = st === "no-timing" ? lyric.value[0] : currentLine.value;
  if (!line) return "";
  let text = lineText(line);
  // 灵动岛翻译：直接跟随歌词数据，不再依赖 config.showTranslation（该开关会被 app 重启写回 false 而失效）。
  // 译文字段以 translatedLyric 为准（所有歌词解析器都填充它）；translation 为可选兜底字段。
  const translation = line.translatedLyric || line.translation;
  if (translation) text += `（${translation}）`;
  return text;
});

/* Marquee refs */
const lyricWrapRef = ref<HTMLElement | null>(null); // 可视容器（clientWidth）
const lyricTrackRef = ref<HTMLElement | null>(null); // 文本轨道（scrollWidth + 滚动动画目标）
const lyricEnterRef = ref<HTMLElement | null>(null); // 当前文本（切换动画进入层）
const lyricLeaveRef = ref<HTMLElement | null>(null); // 旧文本（切换动画退出层）
const lyricWidth = ref(0);
const lyricContainerWidth = ref(0);
let marqueeAnim: Animation | null = null;
let morphAnim: Animation | null = null;

const measure = (): void => {
  // 用当前文本 span 的精确渲染宽度（最后一个字右边缘），
  // 而非 .lyric-morph 的 scrollWidth（后者含 inline 尾部空隙，会滚过头产生右侧空白）。
  // 间奏态渲染的是圆点 span（enter span 已被 v-else 卸载），须测量圆点自身宽度——
  // 轨道里还叠着退场旧句（absolute leave 层），回退到 track.scrollWidth 会把圆点误判为超宽而滚动
  const target = lyricEnterRef.value ?? dotsRef.value;
  if (target) {
    lyricWidth.value =
      target.getBoundingClientRect().width || target.offsetWidth || target.scrollWidth || 0;
  } else if (lyricTrackRef.value) {
    lyricWidth.value = lyricTrackRef.value.scrollWidth || 0;
  }
  if (lyricWrapRef.value) lyricContainerWidth.value = lyricWrapRef.value.clientWidth || 0;
};

// 一次性 Marquee：静止 → 滚动到末尾 → 停留 → 平滑回程 → 停止（Web Animations API，无高频定时器）
const runMarquee = (): void => {
  if (marqueeAnim) {
    marqueeAnim.cancel();
    marqueeAnim = null;
  }
  const el = lyricTrackRef.value;
  if (!el) return;
  const distance = Math.max(
    0,
    lyricWidth.value - lyricContainerWidth.value - MARQUEE_OVERSCROLL_PAD,
  );
  if (distance <= 0) return;
  const scrollDurS = Math.max(
    MARQUEE_MIN_SCROLL_S,
    Math.min(MARQUEE_MAX_SCROLL_S, distance / MARQUEE_SPEED_PPS),
  );
  const totalS = MARQUEE_REST_START_S + scrollDurS + MARQUEE_REST_END_S + MARQUEE_BACK_S;
  const t1 = MARQUEE_REST_START_S / totalS;
  const t2 = (MARQUEE_REST_START_S + scrollDurS) / totalS;
  const t3 = (MARQUEE_REST_START_S + scrollDurS + MARQUEE_REST_END_S) / totalS;
  marqueeAnim = el.animate(
    [
      { transform: "translateX(0)", offset: 0 },
      { transform: "translateX(0)", offset: t1 },
      { transform: `translateX(${-distance}px)`, offset: t2 },
      { transform: `translateX(${-distance}px)`, offset: t3, easing: "ease-in-out" },
      { transform: "translateX(0)", offset: 1 },
    ],
    { duration: totalS * 1000, easing: "linear", fill: "forwards" },
  );
  marqueeAnim.onfinish = () => {
    marqueeAnim = null;
  };
};

// 歌词切换动画：旧歌词向上淡出，新歌词向下淡入（沿用已验证可用的 textContent 方案）
const runMorph = (prevText: string): void => {
  if (morphAnim) {
    morphAnim.cancel();
    morphAnim = null;
  }
  const leave = lyricLeaveRef.value;
  const enter = lyricEnterRef.value;
  if (leave) {
    leave.textContent = prevText || "";
    leave.style.opacity = "1";
    leave.style.transform = "translateY(0)";
    leave.animate(
      [
        { opacity: 1, transform: "translateY(0)" },
        { opacity: 0, transform: `translateY(${MORPH_OUT_Y}px)` },
      ],
      { duration: MORPH_MS, easing: "ease-in", fill: "forwards" },
    );
  }
  if (enter) {
    morphAnim = enter.animate(
      [
        { opacity: 0, transform: `translateY(${MORPH_IN_Y}px)` },
        { opacity: 1, transform: "translateY(0)" },
      ],
      { duration: MORPH_MS, easing: "ease-out", fill: "forwards" },
    );
    morphAnim.onfinish = () => {
      morphAnim = null;
    };
  }
};

// 歌词（含翻译）变化 → 切换动画 + 重测宽度 + 决定是否滚动
watch(displayLyric, (_next, prev) => {
  nextTick(() => {
    runMorph(prev);
    measure();
    runMarquee();
  });
});

// 字体/scale 变化 → 只重测与滚动判定（字号不变，仅宽度可能变化）
watch([() => config.fontFamily, () => config.fontWeight, () => config.scale], () => {
  nextTick(() => {
    measure();
    runMarquee();
  });
});

// ---------------------------------------------------------------------------
// 与 BoringNotch 展开协调的集中式动画协调器（时序唯一真相来源，见 notchAnimationCoordinator.ts）
// ---------------------------------------------------------------------------
const revealPhase = ref<string>(PHASE.COLLAPSED);
const pausedState = ref(false);
// revealed: revealing / revealed 两种相位都表示"内容已展开"（CSS 过渡目标一致）
const revealed = computed(
  () => revealPhase.value === PHASE.REVEALING || revealPhase.value === PHASE.REVEALED,
);
const coordinator = new NotchAnimationCoordinator();
coordinator.onPhase((phase, c) => {
  revealPhase.value = phase;
  pausedState.value = c.paused;
  document.title = "DI[" + phase + "]t" + (track.value ? 1 : 0) + "p" + (playing.value ? 1 : 0);
});

// 曲目出现 / 消失 → 协调 reveal / 收起
watch(
  track,
  (t) => {
    if (t) coordinator.open();
    else coordinator.close();
  },
  { immediate: true },
);

const isPlaying = computed(() => playing.value);

// 播放 / 暂停 → 生命周期：reveal 协调 + 频谱/滚动暂停
watch(
  playing,
  (p) => {
    if (p) {
      coordinator.setPaused(false);
      coordinator.open();
      if (marqueeAnim) marqueeAnim.play();
      startMsLoop();
    } else {
      // 切歌加载中的瞬态非播放态不算暂停：协调器保持现状（岛不收、歌词不变暗）
      if (coverLoading.value) return;
      coordinator.setPaused(true);
      coordinator.close();
      if (marqueeAnim) marqueeAnim.pause();
      stopMsLoop();
    }
  },
  { immediate: true },
);

const rootStyle = computed(() => ({
  // 歌词已播/未播双色：跟随封面主色（与频谱统一），不再用固定白色
  "--di-played": lyricPlayedColor.value,
  "--di-unplayed": lyricUnplayedColor.value,
  "--di-bg": config.backgroundColor,
  "--di-font-weight": config.fontWeight,
  // 封面主色：驱动频谱柱、封面光晕、间奏点、歌词渐变（与频谱同色）
  "--di-accent": accentColor.value,
  // 封面辅色：与 primary 组成频谱同款垂直渐变，供歌词/间奏点复用
  "--di-accent-2": coverPalette.value.secondary,
  "--di-accent-soft": hexToRgba(coverPalette.value.primary, 0.35),
  // 几何调试驱动的歌词行高（line-height 跟随）
  "--di-lyric-h": geom.lyricH + "px",
  // 歌词字号：设置项驱动（调试台提供运行时覆写）
  "--di-lyric-font-size": config.lyricFontSize + "px",
  // Gooey 层顶部刘海 blob 高度（= 顶部区高度）
  "--di-goo-notch-h": geom.topH + "px",
  fontFamily: config.fontFamily || undefined,
  "-webkit-app-region": config.useCSSDrag ? "drag" : "no-drag",
}));

// 窗口高度：开启歌词 = 歌词行 + 顶部区；关闭歌词 = 收回歌词区（noLyricH）。
// 注意：融合模式也保持固定高度（不随收起/展开缩放窗口）——
// macOS 会把位于菜单栏区域的窗口吸附到 availTop(39)，窗口每次 resize 都会
// 触发一次吸附，导致贴刘海的位置被顶下来。固定窗口高度后仅 goo 层在窗口内
// 缩成顶部小药丸，尺寸不变 → 位置稳定贴顶。
/** 几何调试台的岛总高覆盖（px；0=按开/关歌词两态自动） */
const heightOverride = ref(0);
const computeIslandHeight = (): number => {
  // 调试台高度覆盖：非 0 时锁定总高，忽略开/关歌词两态公式
  if (heightOverride.value > 0) return heightOverride.value;
  if (!config.showLyric) return geom.noLyricH ?? 0;
  return geom.lyricH + geom.topH;
};
watch(
  () => config.showLyric,
  () => {
    // 开/关歌词：窗口高度弹性动画与歌词行上滑/下滑（CSS 300ms）同时进行，
    // 收缩不再等待歌词淡出
    window.api.dynamicIsland.setHeightAnimated(computeIslandHeight());
  },
  { flush: "post" },
);

// 宽度模式或自定义宽度变化时实时调整窗口宽度（岛宽固定，仅窗口 resize）
watch(
  [() => config.widthMode, () => config.customWidth],
  () => {
    window.api.dynamicIsland.resize(computeWidth());
    nextTick(() => {
      measure();
      runMarquee();
    });
  },
  { flush: "post" },
);

let unsubConfig: (() => void) | null = null;
let unsubMode: (() => void) | null = null;
let unsubCursor: (() => void) | null = null;
let unsubVisibility: (() => void) | null = null;

onMounted(async () => {
  try {
    const [saved, currentMode] = await Promise.all([
      window.api.config.get("dynamicIsland") as Promise<DynamicIslandSettings>,
      window.api.dynamicIsland.getMode(),
    ]);
    Object.assign(config, saved);
    mode.value = currentMode;
  } catch (error) {
    console.error("[dynamic-island] load state failed", error);
  }
  window.api.dynamicIsland.resize(computeWidth());
  window.api.dynamicIsland.setHeight(computeIslandHeight());
  await nextTick();
  measure();
  runMarquee();
  unsubConfig = window.api.dynamicIsland.onConfigChange((next) => Object.assign(config, next));
  unsubMode = window.api.dynamicIsland.onModeChange((next) => {
    mode.value = next;
  });
  unsubCursor = window.api.dynamicIsland.onCursorInside((inside) => {
    hovering.value = inside;
  });
  // 窗口显隐：主进程播放/暂停时推送 → JS spring 驱动 Gooey 液体弹出/收回。
  // 初始化时若已在播放（getVisibility=true），也从收起态弹一次，
  // 保证每次"播放→展开"都有液体动画；用 gooProgress 兜底当前进度避免重复推送闪缩。
  // 注意：窗口高度固定（融合模式亦然），收起只缩 goo 层，不 resize 窗口（防 macOS 吸附）。
  islandShown.value = await window.api.dynamicIsland.getVisibility();
  gooProgress = 0;
  setGoo(0);
  if (islandShown.value) startGooExpand();
  unsubVisibility = window.api.dynamicIsland.onVisibility((visible) => {
    islandShown.value = visible;
    if (visible) {
      // 已完全展开则忽略重复的 true（切歌时主进程不会重播，此为兜底），
      // 避免液体动画重放导致岛"闪一下"
      if (gooProgress >= 0.99) return;
      startGooExpand();
    } else {
      // 收回：1→0 弹性缩回刘海（窗口常驻不隐藏，仅缩成顶部小药丸）
      gooExpandToken++;
      animateGoo(0);
    }
  });
});

onBeforeUnmount(() => {
  stopMsLoop();
  if (marqueeAnim) marqueeAnim.cancel();
  if (morphAnim) morphAnim.cancel();
  if (titleTimer) {
    clearTimeout(titleTimer);
    titleTimer = null;
  }
  coordinator.destroy();
  unsubConfig?.();
  unsubConfig = null;
  unsubMode?.();
  unsubMode = null;
  unsubCursor?.();
  unsubCursor = null;
  unsubVisibility?.();
  unsubVisibility = null;
  if (gooRaf) cancelAnimationFrame(gooRaf);
});
</script>

<template>
  <!-- 吸附态形状裁切定义（朋友方案 / boring.notch 风格，见 dynamic-island-final-report.html）
       形状：顶边直边 + 10px 上圆角，底部 28px 大圆角（上小下大苹果味）。
       clipPathUnits=objectBoundingBox 用 0-1 比例坐标，自动随 .root 实际宽高缩放，
       适配吸附态动态高度（main 进程 applyDynamicIslandHeight 按歌词在 14~200px 变化；
       像素 path() 写死会在非 65/39 高度错位，故必须可拉伸）。
       歌词态按 65px 参考归一化（底部 28px），无歌词态按 39px 参考归一化（同比例），
       二者均随实际窗口高度平滑缩放。 -->
  <svg class="island-clip-defs" width="0" height="0" aria-hidden="true">
    <defs>
      <clipPath id="islandSnappedClip" clipPathUnits="objectBoundingBox">
        <path :d="snappedD" />
      </clipPath>
      <!-- Gooey 液体滤镜（Metaball）：feGaussianBlur 柔化 + feColorMatrix 高对比阈值，
           让 notch blob / neck blob / body blob 三者融合成"液体"形变。
           region 给足（y 向下扩），防止液体滴落时的长模糊被裁切 → 黑边/闪烁（历史隐患根因）。
           仅作用于背景层 .di-goo，前景内容（封面/频谱/歌词）在其上层，不受模糊影响。 -->
      <filter id="islandGoo" x="-35%" y="-50%" width="170%" height="200%" color-interpolation-filters="sRGB">
        <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur" />
        <feColorMatrix
          in="blur"
          mode="matrix"
          values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -11"
          result="goo"
        />
      </filter>
    </defs>
  </svg>
  <!-- 刘海底缘参考框（调试台控制显隐）：对准真机刘海后作为上圆角拟合基准 -->
  <div
    v-if="notchGuide.show"
    class="notch-guide"
    :style="{
      width: notchGuide.w + 'px',
      height: notchGuide.h + 'px',
      borderRadius: `0 0 ${notchGuide.r}px ${notchGuide.r}px`,
      transform: `translateX(calc(-50% + ${notchGuide.x}px))`,
    }"
  ></div>
  <div
    class="root"
    :class="[
      mode === 'snapped' ? 'is-snapped' : 'is-floating',
      config.widthMode ? 'is-width-' + config.widthMode : '',
      !config.showLyric ? 'is-nolyric' : '',
      {
        'is-hidden': config.nonOcclusive && hovering,
        // 悬停隐形仅在非遮挡模式下生效；普通模式鼠标靠近不应把岛变透明
        'is-hovering': config.nonOcclusive && hovering,
        'is-notch-fusion': notchFusionEnabled,
        'is-playing': isPlaying,
        'is-revealed': revealed,
        'is-island-shown': islandShown,
        'is-collapsing': revealPhase === PHASE.COLLAPSING,
      },
    ]"
    :style="rootStyle"
  >
    <!-- Gooey 液体背景层：三个黑 blob（顶部刘海源 + 拉丝颈 + 展开主体）叠加 SVG goo 滤镜，
         展开时主体从刘海 scaleY 弹簧拉伸，neck 被同步"拽出"再融合收回，
         三者经 feGaussianBlur+feColorMatrix 融合成液体滴落/拉丝效果。
         背景与前景分层：内容（.di-top/.di-content）在 z-index:1 之上，不被滤镜模糊。 -->
    <div class="di-goo" aria-hidden="true">
      <div ref="notchRef" class="di-goo-notch"></div>
      <div ref="neckRef" class="di-goo-neck"></div>
      <div ref="gooBodyRef" class="di-goo-body"></div>
    </div>
    <!-- 顶部锐边盖板（无滤镜）：goo 层的 feGaussianBlur 会把顶部直边磨圆/发虚，
         此盖板盖住顶部模糊带恢复锐利边缘；顶部形状随进度变化：
         收起 = 胶囊圆角（小药丸）、展开 = 贴刘海直边。 -->
    <div ref="gooGuardRef" class="di-goo-guard" aria-hidden="true"></div>
    <!-- 前景内容层（.di-face）：外层 clip 由 JS 钉在液面（随液体进度收缩），
         内层 .di-face-move 负责随液面下沉/浮出 —— 分层保证裁剪线不随位移漂移，
         内容始终被包含在液体黑区内（吸进/流出），不独立淡出、不溢出到液体外。
         内部：顶部区(封面左/频谱右) + 歌词行。 -->
    <div ref="faceRef" class="di-face">
      <div ref="faceMoveRef" class="di-face-move">
      <!-- 顶部区：封面(左) + 频谱(右)，贴屏幕最顶、≈刘海高度，两者垂直居中。
           可见性由 .di-face 的 clip-path 随液体进度统一控制，自身不做独立淡入淡出。 -->
      <div class="di-top" :style="{ height: geom.topH + 'px' }">
        <IslandCover
          v-if="track"
          :src="coverSrc"
          :loading="coverLoading"
          :w="geom.coverW"
          :h="geom.coverH"
          class="di-cover"
          :style="{
            marginLeft: geom.coverMarginLeft + 'px',
            marginTop: geom.coverMarginTop + 'px',
            transform: `translate(${geom.coverX}px, ${geom.coverY}px)`,
          }"
        />
        <IslandSpectrum
          v-if="track"
          :colors="spectrumColors"
          :active="isPlaying"
          :w="geom.specW"
          :h="geom.specH"
          :bar-count="geom.barCount"
          :bar-gap="geom.barGap"
          class="di-spectrum"
          :style="{
            marginRight: geom.spectrumMarginRight + 'px',
            marginTop: geom.spectrumMarginTop + 'px',
            transform: `translate(${geom.specX}px, ${geom.specY}px)`,
          }"
        />
      </div>
      <!-- 歌词行：底部居中；可见性同样由 .di-face clip 统一控制（is-paused 仅做变暗） -->
      <div
        class="di-content"
        :class="{
          'is-paused': pausedState,
          'is-lyric-hidden': !config.showLyric,
        }"
        :style="{ height: geom.lyricH + 'px' }"
      >
        <!-- 歌词静态 + 一次性 marquee + morph 切换 -->
        <div
          ref="lyricWrapRef"
          class="marquee-wrap lyric-wrap"
          :class="{ 'is-empty': !displayLyric && !isInterlude }"
          :style="{
            marginLeft: geom.lyricMarginLeft + 'px',
            marginRight: geom.lyricMarginRight + 'px',
            transform: `translate(${geom.lyricX}px, ${geom.lyricY}px)`,
            width: geom.lyricW ? geom.lyricW + 'px' : undefined,
          }"
        >
          <div ref="lyricTrackRef" class="lyric-morph">
            <span v-if="isInterlude && !showingTitle" ref="dotsRef" class="interlude-dots" aria-label="间奏">
              <i></i><i></i><i></i>
            </span>
            <span v-else ref="lyricEnterRef" class="lyric-text lyric-enter">{{ displayLyric }}</span>
            <span ref="lyricLeaveRef" class="lyric-text lyric-leave"></span>
          </div>
        </div>
      </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.root {
  position: relative;
  /* 宽度必须显式 100%：root 内所有子元素（.di-goo / .di-goo-guard / .di-face）都是
     position:absolute，绝对定位元素不参与父级内在尺寸计算。若用 fit-content，root 会
     塌缩成 0 宽 → 整岛（含 goo 黑底与内容）完全不可见。
     该路径正是「非刘海融合」态：Windows/Linux 全平台默认如此（isMac 守卫关掉融合），
     macOS 关闭刘海融合或拖成浮动态时也走这里。 */
  width: 100%;
  height: 100%;
  overflow: hidden;
  box-sizing: border-box;
  cursor: move;
  color: #fff;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif;
  /* 整体不透明：显隐由 Gooey 液体层的弹簧进度统一承担
     （黑 blob 缩放 = 出现/退出；.di-face 的 clip 随同一进度收放，
     封面/频谱/歌词作为岛的一部分随液体一起吸进/流出）。 */
  opacity: 1;
  will-change: opacity, transform;
}
/* 已 reveal：防御 FOUC 清除 clip-path/transform（仅形状处理；透明度不参与显隐） */
.root.is-revealed {
  clip-path: none;
  transform: none;
}
/* 前景内容层（外层）：clip 四边由 JS 贴齐液体横截面（左右随 blob scaleX 居中收缩、
   底边贴 body 底边），屏幕坐标固定不随位移漂移。
   初始值 = 收起态（prog=0：左右各 29%、底部露 15%，与 42% 宽小药丸对齐）。 */
.di-face {
  position: absolute;
  inset: 0;
  z-index: 1;
  clip-path: inset(0 29% 85% 29%);
  pointer-events: none;
  will-change: clip-path;
}
/* 前景内容层（内层）：随液面下沉/浮出的位移由 JS 驱动。
   初始值 = 收起态（prog=0：下沉 88%）。 */
.di-face-move {
  width: 100%;
  height: 100%;
  transform: translateY(88%);
  will-change: transform;
}
/* 顶部区：封面(左) + 频谱(右)，贴窗口最顶，≈刘海高度，两者垂直居中、左右分列。
   可见性完全由 .di-face 的 clip-path 随液体进度控制（随灵动岛整体吸进/流出），
   自身不做 opacity/transform 显隐，保证与液体出现/消失时机严格一致。 */
.di-top {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  height: 32px;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 8px;
  gap: 6px;
}
/* Content row: 歌词行，钉在窗口底部 BAR_HEIGHT(28px)。
   可见性由 .di-face 的 clip-path 随液体进度统一控制；
   自身仅保留歌词开关的上滑/下滑 transform 与暂停变暗。 */
.di-content {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 28px;
  z-index: 1;
  display: flex;
  align-items: center;
  padding: 0 14px;
  gap: 6px;
  transform: translateY(0);
  transition: transform 300ms cubic-bezier(0.32, 0.72, 0, 1);
}
/* 歌词开关动画：关闭歌词时下滑隐藏，展示时上滑进入 */
.di-content.is-lyric-hidden {
  transform: translateY(100%);
}
.root.is-hidden {
  opacity: 0.12;
  pointer-events: none;
  transition: opacity 500ms ease;
}
/* 悬停完全透明：鼠标在歌词岛附近时透明度降至 0%，离开恢复（0.5s 淡入淡出） */
.root.is-hovering {
  opacity: 0;
  transition: opacity 500ms ease;
}
.root.is-notch-fusion {
  width: 100%;
  /* 黑色由 goo 液体层提供（root 透明），收起缩成刘海小药丸、播放液体滴落展开；
     若 root 自带黑底会盖住液体 blob 的形变。 */
  background: transparent;
  transition: opacity 240ms ease-out;
}
/* snapped 态的黑色由 Gooey 背景层 .di-goo 提供（root 透明 + blob 黑色），
   这样液体形变才可见；浮动态/刘海融合仍由 root 自身背景兜底
   注意：这里不能再写 width: fit-content（root 子元素全为绝对定位 → 塌缩 0 宽，
   非融合平台整岛不可见），宽度统一由 .root 的 width:100% 提供。 */
.root:not(.is-notch-fusion) {
  background: transparent;
}
/* 灵动岛吸附态形状（boring.notch 风格：顶部外凸 ∩ 弧 + 底部大圆角）
   - 引用内嵌 SVG <clipPath id="islandSnappedClip" clipPathUnits="objectBoundingBox">（坐标 0-1 比例，
     自动随窗口宽高缩放），彻底避开 data-URI mask 解析失败 与 写死像素 clip-path 在动态高度下错位。
   - 形状：顶部整条 C 贝塞尔外凸弧（∩ 形，中间贴顶、两边略低），底部 Q 大圆角。
   - 定义见 <template> 顶部 <svg id="islandSnappedClip">；此处仅引用。
   - transform: translateZ(0) 强制独立合成层（GPU 加速）；切换动画仅对 opacity/transform。
   - 融合模式(.is-notch-fusion)全宽黑条不套用 clip-path，保持直角贴刘海。 */
/* 灵动岛吸附态形状（朋友方案 / boring.notch 风格，见 dynamic-island-final-report.html）
   - 顶边直边 + 10px 小圆角，底部 28px 大圆角（上小下大苹果味 squircle）
   - 引用内嵌 SVG <clipPath clipPathUnits="objectBoundingBox">（0-1 比例，随窗口宽高自动缩放），
     彻底避开 像素 path() 在动态高度窗口（14~200px）错位 与 data-URI mask 解析失败。
   - 歌词态用 islandSnappedClipLyric（65px 参考，底 28px），无歌词态用 islandSnappedClipNolyric（39px 参考，同比例）。
   - 融合模式(.is-notch-fusion)全宽黑条同样套用（顶直底圆），不 excluded（否则融合开启时整条不生效→纯直）。
   - transform: translateZ(0) 强制独立合成层（GPU 加速）；border-radius 兜底，切片失效也至少底部圆角，绝不纯直。 */
.root.is-snapped {
  -webkit-clip-path: url(#islandSnappedClip);
  clip-path: url(#islandSnappedClip);
  border-top-left-radius: 0;
  border-top-right-radius: 0;
  border-bottom-right-radius: var(--di-r-snap-b, 28px);
  border-bottom-left-radius: var(--di-r-snap-b, 28px);
  transform: translateZ(0);
}
.root.is-floating {
  border-radius: 999px;
  background: var(--di-bg);
  /* 暂停收起时整体淡出（同融合态：root 自带黑底会挡住 Goo 收起动画） */
  transition: opacity 240ms ease-out;
}
/* 暂停/停止收起：浮动态 root 自带不透明黑底，会让「Goo scaleY 缩回」动画失效，
   内容淡出后残留整块黑屏，故浮动态在未显示（is-island-shown=false）时整体淡出隐入物理刘海。
   融合模式已改为 root 透明 + goo 层提供黑色，收起动画（缩成刘海小药丸）可见，不套用此规则。 */
.root.is-floating:not(.is-island-shown) {
  opacity: 0;
}

/* ===== 液体层（Metaball gooey）=====
   背景 blob 与前景内容分层（内容在 z-index:1 之上，不被滤镜波及）。
   .di-goo 容器挂 SVG goo 滤镜（feGaussianBlur + feColorMatrix 阈值化），
   三个 blob（notch 源 / neck 拉丝颈 / body 主体）共享同一滤镜 → 重叠处融合成液体。
   防黑块/闪烁要点：
   - filter region 在 SVG defs 已放大（x -35%~170%、y -80%~260%），长模糊不被裁切；
   - 容器不加 will-change:transform（避免独立合成层与滤镜合成冲突），
     仅 blob 子元素加 will-change:transform，逐帧形状变化由滤镜重算；
   - 展开/收起由 JS 弹簧（解析式欠阻尼 springStep）写内联 transform，
     不用 CSS transition（隐藏窗口节流/同 tick 改类会直接跳到终态 → 闪现/黑屏）。 */
.di-goo {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  filter: url(#islandGoo);
  /* 强制独立合成层：filter 容器内逐帧 transform 动画 + 透明窗口，
     合成器状态切换时偶发不应用子元素 transform → 闪未缩放黑条。
     translateZ(0) 让整个滤镜输出稳定在一个合成层上，减少边界帧抖动。 */
  transform: translateZ(0);
  will-change: filter;
}
.di-goo-notch,
.di-goo-body,
.di-goo-neck {
  position: absolute;
  background: var(--di-bg);
  backface-visibility: hidden;
}
/* 顶部刘海 blob：液体"源头"。收起态是居中小药丸（scaleX 0.42），
   展开时随弹簧向两侧撑开成全宽，与 body/neck 经 goo 滤镜融合。 */
.di-goo-notch {
  top: 0;
  left: 0;
  width: 100%;
  height: var(--di-goo-notch-h, 37px);
  border-radius: 0 0 var(--di-r-notch, 18px) var(--di-r-notch, 18px);
  transform: scaleX(0.42);
  transform-origin: top center;
  will-change: transform;
}
/* 展开主体：双轴 scale(sx, sy) 由 JS 弹簧动画器（animateGoo，rAF 逐帧 springStep）
   直接写内联样式 —— 从刘海中央先垂直滴落（sy 0.15→1）、再水平展开（sx 0.42→1），
   与 notch 宽度差在 goo 滤镜下形成液体弧线轮廓；过冲时 sx/sy 可 >1（鼓胀感）。
   这里只保留初始收起态与 GPU 提示，不再用 CSS transition（隐藏窗口节流/同 tick 改类会跳终态）。 */
.di-goo-body {
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border-radius: 0 0 var(--di-r-goo-body, 32px) var(--di-r-goo-body, 32px);
  transform: scale(0.42, 0.15);
  transform-origin: top center;
  will-change: transform;
}
/* 拉丝颈（已禁用）：曾用钟形驱动"拽出/收回"的独立细竖条，但节奏与液体主体
   难以协调（出现偏快/消失偏慢），动画中易凸出抢戏 → 当前 JS 恒置 scaleY(0)。
   保留结构以便后续用"body 顶部随展开收窄"等方式恢复拉丝感。 */
.di-goo-neck {
  top: 32px;
  left: 50%;
  width: 14px;
  height: 40px;
  border-radius: 8px;
  transform: translateX(-50%) scaleY(0);
  transform-origin: top center;
  will-change: transform, width;
}
/* 顶部锐边盖板（无滤镜）：goo 层 blur 会把顶部直边磨圆/发虚，
   此盖板盖住顶部模糊带恢复锐利边缘。宽度/顶部圆角由 JS setGoo 驱动：
   收起（prog=0）= 胶囊圆角小药丸；展开（prog=1）= 贴刘海直边。
   与 .di-goo 同 z-index、DOM 靠后 → 盖住 goo 层；内容层(z-index:1)仍在其上。 */
.di-goo-guard {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: var(--di-goo-notch-h, 37px);
  background: var(--di-bg);
  border-radius: 18px 18px 18px 18px;
  transform: scaleX(0.42);
  transform-origin: top center;
  z-index: 0;
  pointer-events: none;
  will-change: transform, border-radius;
}
/* 浮动态：胶囊形状（root 自带背景兜底） */
.root.is-floating .di-goo-body {
  border-radius: 999px;
}
/* 刘海融合：root 已透明，黑色由本层 blob 提供 —— 液体动画全程可见，
   不再隐藏（历史隐藏是因为融合模式曾用 root 黑底兜底，与液体层冲突）。 */

/* Lyric wrap: fixed island width, lyric text may overflow -> one-shot marquee */
.marquee-wrap {
  overflow: hidden;
  flex: 1;
  min-width: 0;
  position: relative;
}
.marquee-wrap.lyric-wrap.is-empty {
  opacity: 0.35;
}

/* Morph layer: current text + leaving old text (absolute overlay) */
.lyric-morph {
  position: relative;
  display: inline-block;
  white-space: nowrap;
  will-change: transform;
}
.lyric-enter {
  display: inline-block;
  will-change: transform, opacity;
}
.lyric-leave {
  position: absolute;
  left: 0;
  top: 0;
  white-space: nowrap;
  pointer-events: none;
  will-change: transform, opacity;
}

/* Lyric text */
.lyric-text {
  font-size: var(--di-lyric-font-size, 12px);
  font-weight: 500;
  /* 渐变文字：与频谱柱同款垂直渐变（顶 primary / 底 secondary），跟随封面。
     background-clip:text 需要 -webkit-text-fill-color 透明（该属性可被子元素继承） */
  background: linear-gradient(
    180deg,
    var(--di-accent, rgba(255, 255, 255, 0.78)) 0%,
    var(--di-accent-2, rgba(255, 255, 255, 0.45)) 100%
  );
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  -webkit-text-fill-color: transparent;
  line-height: var(--di-lyric-h, 28px);
  letter-spacing: 0.01em;
  /* text-shadow 会透过裁切文字糊底，改用 drop-shadow 作用于最终渲染像素 */
  filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.5));
}
/* 间奏圆点：复刻大播放器默认效果（整体正弦呼吸 + 依次点亮，由 JS 按间奏进度驱动） */
.interlude-dots {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 28px;
  opacity: 0; /* 初始隐藏，由 JS 按入场进度淡入 */
  /* 改为 left center：缩放只向右扩展，最左点左缘固定不动，
     不会被 .marquee-wrap 的 overflow:hidden 向左裁切（解决「左边缺一块」） */
  transform-origin: left center;
  will-change: transform, opacity;
}
.interlude-dots > i {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  /* 与频谱/歌词同款垂直渐变（顶 primary / 底 secondary），跟随封面 */
  background: linear-gradient(
    180deg,
    var(--di-accent, rgba(255, 255, 255, 0.78)) 0%,
    var(--di-accent-2, rgba(255, 255, 255, 0.45)) 100%
  );
  display: inline-block;
}

/* 翻译：跟在原句右侧的「（翻译）」，变淡 + 稍轻字重，与小播放器一致。
   原句与翻译同处一行，过长时由一次性 marquee 统一滚动。 */
.lyric-orig {
  /* 继承 .lyric-text 的字体/颜色/行高，无需重复声明 */
}
.lyric-trans {
  display: inline;
  margin-left: 6px;
  font-weight: 400;
  opacity: 0.55;
  letter-spacing: 0.005em;
  /* opacity 生成独立合成层，父级的 background-clip 无法覆盖到这里，
     自带同款渐变裁切（同一行高，垂直渐变视觉连续） */
  background: linear-gradient(
    180deg,
    var(--di-accent, rgba(255, 255, 255, 0.78)) 0%,
    var(--di-accent-2, rgba(255, 255, 255, 0.45)) 100%
  );
  -webkit-background-clip: text;
  background-clip: text;
}

/* 暂停态：歌词轻微变暗（生命周期连续，不重建/不收起内容）。
   与 .di-content 的 reveal 过渡相互独立（pause 控 opacity，reveal 控整体出现）。 */
.lyric-morph {
  transition: opacity 300ms ease;
}
.di-content.is-paused .lyric-morph {
  opacity: 0.5;
}

/* 刘海底缘参考框：红色虚线，顶边贴屏幕上缘；对准真机刘海后作为拟合基准 */
.notch-guide {
  position: absolute;
  top: 0;
  left: 50%;
  z-index: 99;
  border: 1px dashed rgba(255, 82, 82, 0.85);
  border-top: none;
  pointer-events: none;
}
</style>
