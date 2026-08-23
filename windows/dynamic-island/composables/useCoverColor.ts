// 封面主色提取 + 歌词/频谱配色工具
// ---------------------------------------------------------------------------
// 把封面画到 16x16 小 canvas 采样像素，按「饱和度/亮度加权」分桶：
//   - top1 桶 → 亮主色 primary（柱子顶部 / 歌词文字色）
//   - 在剩余桶里挑一个与主色「色相或亮度差异足够」的桶 → 深辅色 secondary（柱子底部）
//   - 找不到差异桶时，用主色降低亮度 + 微移色相生成和谐辅色
// 结果按 src 缓存，避免切回同一封面重复计算。
// 同时提供 mixWithWhite / hexToRgba / ensureSpectrumVisible 等配色工具。
//
// 注意：cache:// / data: / file:// 等本地或同源封面可直接读像素；
//       跨域 http 封面无 CORS 时会污染 canvas → getImageData 抛错 → 兜底色。
// ---------------------------------------------------------------------------

/** 兜底主色（亮红，柱顶发光端） */
const DEFAULT_COLOR = "#ff4d6d";
/** 兜底辅色（深红，柱底根部） */
const DEFAULT_SECONDARY = "#a30f2e";
/** 远程封面取不到色时的兜底调色板（红+白基调） */
export const DEFAULT_PALETTE: CoverPalette = {
  primary: DEFAULT_COLOR,
  secondary: DEFAULT_SECONDARY,
};

/** 双色封面调色板 */
export interface CoverPalette {
  /** 亮主色（柱子顶部 / 歌词文字色） */
  primary: string;
  /** 深辅色 / 次主色（柱子底部） */
  secondary: string;
}

const paletteCache = new Map<string, CoverPalette>();

const toHex2 = (v: number): string =>
  Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");

const rgbToHex = (r: number, g: number, b: number): string =>
  `#${toHex2(r)}${toHex2(g)}${toHex2(b)}`;

type Bucket = { r: number; g: number; b: number; weight: number };

/** RGB(0-255) → HSL（h/s/l 均为 0~1） */
const rgbToHsl = (r: number, g: number, b: number): [number, number, number] => {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  let h = 0;
  let s = 0;
  if (d !== 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
    }
    h /= 6;
  }
  return [h, s, l];
};

/** HSL（h/s/l 0~1）→ #RRGGBB */
const hslToHex = (h: number, s: number, l: number): string => {
  let r: number;
  let g: number;
  let b: number;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number): number => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return rgbToHex(r * 255, g * 255, b * 255);
};

/** 两个 HSL 的色相环距离（0~0.5） */
const hueDistance = (
  a: [number, number, number],
  b: [number, number, number],
): number => {
  const d = Math.abs(a[0] - b[0]);
  return Math.min(d, 1 - d);
};

/**
 * 由主色生成辅色：降低亮度 + 微移色相，得到和谐但区分的深色。
 * @param hex 主色 #RRGGBB
 * @param lightnessDelta 亮度增量（-0.3 ≈ 明显变暗）
 */
export const adjustHueOrLightness = (hex: string, lightnessDelta: number): string => {
  const [h, s, l] = rgbToHsl(...hexToRgb(hex));
  const nl = Math.max(0, Math.min(1, l + lightnessDelta));
  const nh = (h + 0.02) % 1;
  return hslToHex(nh, s, nl);
};

/** 桶加权平均 → #RRGGBB */
const bucketToHex = (b: Bucket): string =>
  rgbToHex(b.r / b.weight, b.g / b.weight, b.b / b.weight);

/**
 * 在排序后的桶中找与主色「色相/亮度差异足够」的桶作为辅色。
 * 差异阈值：色相环距离 > 0.08（≈29°）或亮度差 > 0.18；权重过低（<top 的 15%）不考虑。
 */
const findSecondary = (sorted: Bucket[], primaryHex: string): string | null => {
  const pHsl = rgbToHsl(...hexToRgb(primaryHex));
  const topWeight = sorted[0]?.weight ?? 0;
  for (let i = 1; i < sorted.length; i++) {
    const b = sorted[i];
    if (b.weight < topWeight * 0.15) break;
    const cHsl = rgbToHsl(b.r / b.weight, b.g / b.weight, b.b / b.weight);
    const hd = hueDistance(pHsl, cHsl);
    const ld = Math.abs(pHsl[2] - cHsl[2]);
    if (hd > 0.08 || ld > 0.18) return bucketToHex(b);
  }
  return null;
};

/**
 * 采样封面并提取双色调色板（primary 亮主色 + secondary 深辅色）。
 * 分桶加权 → top1 主色 → 挑差异桶辅色（找不到则主色加深）。
 * 跨域无 CORS / 加载失败 / 空 src → 兜底 DEFAULT_PALETTE。
 */
const samplePalette = async (src?: string | null): Promise<CoverPalette> => {
  if (!src) return DEFAULT_PALETTE;
  const cached = paletteCache.get(src);
  if (cached) return cached;

  try {
    const img = new Image();
    // 仅对 http(s) 设 crossOrigin，避免本地协议被拒；跨域无 CORS 会触发 onerror
    if (/^https?:\/\//i.test(src)) img.crossOrigin = "anonymous";

    await new Promise<void>((resolve, reject) => {
      img.onload = (): void => resolve();
      img.onerror = (): void => reject(new Error("cover load failed"));
      img.src = src;
    });

    const size = 16;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return DEFAULT_PALETTE;
    ctx.drawImage(img, 0, 0, size, size);

    // 跨域无 CORS → getImageData 抛 SecurityError，走兜底
    const { data } = ctx.getImageData(0, 0, size, size);

    // 分桶（每通道 >>5 → 8 级），按饱和度/亮度加权
    const buckets = new Map<string, Bucket>();
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];
      if (a < 128) continue;
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const sat = max === 0 ? 0 : (max - min) / max;
      const lum = (max + min) / 2;

      let weight = 1;
      if (sat < 0.15) weight *= 0.2; // 近灰降权
      if (lum < 30 || lum > 230) weight *= 0.3; // 过暗/过亮降权

      const key = `${r >> 5}-${g >> 5}-${b >> 5}`;
      const cur = buckets.get(key) ?? { r: 0, g: 0, b: 0, weight: 0 };
      cur.r += r * weight;
      cur.g += g * weight;
      cur.b += b * weight;
      cur.weight += weight;
      buckets.set(key, cur);
    }

    const sorted = [...buckets.values()].sort((a, b) => b.weight - a.weight);
    if (sorted.length === 0 || sorted[0].weight === 0) return DEFAULT_PALETTE;

    const primary = bucketToHex(sorted[0]);
    const secondaryHex =
      findSecondary(sorted, primary) ?? adjustHueOrLightness(primary, -0.3);

    const result: CoverPalette = {
      primary: ensureSpectrumVisible(primary),
      secondary: ensureSpectrumVisible(secondaryHex),
    };
    paletteCache.set(src, result);
    return result;
  } catch {
    return DEFAULT_PALETTE;
  }
};

/** 提取双色调色板（亮主色 + 深辅色），供频谱渐变 / 歌词色使用 */
export const extractColorPalette = (src?: string | null): Promise<CoverPalette> =>
  samplePalette(src);

/**
 * 兼容旧调用：返回封面主色（调色板 primary）。
 * @deprecated 新版请使用 extractColorPalette 获取双色。
 */
export const extractDominantColor = async (src?: string | null): Promise<string> =>
  (await samplePalette(src)).primary;

/** 把 #RRGGBB 解析为 [r,g,b] */
const hexToRgb = (hex: string): [number, number, number] => {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
};

/**
 * 主色与白色混合，得到可读的歌词文字色
 * @param hex 主色 #RRGGBB
 * @param whiteRatio 白色占比 0..1（越大越亮、越偏白）
 */
export const mixWithWhite = (hex: string, whiteRatio = 0.4): string => {
  const [r, g, b] = hexToRgb(hex);
  const w = Math.max(0, Math.min(1, whiteRatio));
  return rgbToHex(r + (255 - r) * w, g + (255 - g) * w, b + (255 - b) * w);
};

/**
 * 把 #RRGGBB 转为带透明度的 rgba 字符串
 * @param hex 主色
 * @param alpha 透明度 0..1
 */
export const hexToRgba = (hex: string, alpha = 1): string => {
  const [r, g, b] = hexToRgb(hex);
  const a = Math.max(0, Math.min(1, alpha));
  return `rgba(${r}, ${g}, ${b}, ${a})`;
};

/**
 * 频谱专用颜色提亮：在黑色灵动岛背景上，若提取出的主题色过暗（接近黑）频谱会不可见。
 * 亮度足够时原样返回；极暗/纯黑则转柔和灰白；其余按色相等比放大，
 * 目标让最亮通道达到 ~150（清晰可见又不会过曝成白）。不影响其他 UI 取用的 dominantColor。
 */
export const ensureSpectrumVisible = (hex: string): string => {
  const [r, g, b] = hexToRgb(hex);
  const max = Math.max(r, g, b);
  if (max < 16) return "#c8c8cf";
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  if (lum >= 60) return hex;
  const k = 150 / max;
  return rgbToHex(r * k, g * k, b * k);
};
