import {
  argbFromHex,
  themeFromSourceColor,
  type Theme,
} from "@material/material-color-utilities";
import type { ThemePalette } from "@/types/theme";

/** 默认主色 */
export const DEFAULT_PRIMARY = "#6750a4";

/** ARGB int → "R G B" 字符串（供 CSS 变量使用） */
const argbToRgb = (argb: number): string => {
  const r = (argb >> 16) & 0xff;
  const g = (argb >> 8) & 0xff;
  const b = argb & 0xff;
  return `${r} ${g} ${b}`;
};

/** 从主色 HEX 生成完整色板 */
export const generatePalette = (hex: string, isDark: boolean): ThemePalette => {
  // 防护：持久化恢复时可能拿到非字符串
  const safeHex = typeof hex === "string" && hex.startsWith("#") ? hex : DEFAULT_PRIMARY;
  const theme: Theme = themeFromSourceColor(argbFromHex(safeHex));
  const scheme = isDark ? theme.schemes.dark : theme.schemes.light;

  return {
    primary: argbToRgb(scheme.primary),
    primaryContainer: argbToRgb(scheme.primaryContainer),
    onPrimary: argbToRgb(scheme.onPrimary),
    onPrimaryContainer: argbToRgb(scheme.onPrimaryContainer),
    secondary: argbToRgb(scheme.secondary),
    secondaryContainer: argbToRgb(scheme.secondaryContainer),
    surface: argbToRgb(scheme.surface),
    surfaceAlt: argbToRgb(scheme.surfaceVariant),
    onSurface: argbToRgb(scheme.onSurface),
    onSurfaceVariant: argbToRgb(scheme.onSurfaceVariant),
    outline: argbToRgb(scheme.outline),
    outlineVariant: argbToRgb(scheme.outlineVariant),
    error: argbToRgb(scheme.error),
  };
};

/** 纯色色板 — 浅色 */
export const SOLID_PALETTE_LIGHT: ThemePalette = {
  primary: "38 38 38",
  primaryContainer: "230 230 230",
  onPrimary: "255 255 255",
  onPrimaryContainer: "30 30 30",
  secondary: "82 82 82",
  secondaryContainer: "240 240 240",
  surface: "255 255 255",
  surfaceAlt: "245 245 245",
  onSurface: "23 23 23",
  onSurfaceVariant: "100 100 100",
  outline: "200 200 200",
  outlineVariant: "230 230 230",
  error: "200 50 50",
};

/** 纯色色板 — 深色 */
export const SOLID_PALETTE_DARK: ThemePalette = {
  primary: "230 230 230",
  primaryContainer: "50 50 50",
  onPrimary: "20 20 20",
  onPrimaryContainer: "230 230 230",
  secondary: "160 160 160",
  secondaryContainer: "45 45 45",
  surface: "18 18 18",
  surfaceAlt: "28 28 28",
  onSurface: "230 230 230",
  onSurfaceVariant: "160 160 160",
  outline: "60 60 60",
  outlineVariant: "40 40 40",
  error: "240 80 80",
};

/** 将色板写入 CSS 自定义属性 */
export const applyPalette = (palette: ThemePalette): void => {
  const root = document.documentElement;
  for (const [key, value] of Object.entries(palette)) {
    // camelCase → kebab-case: primaryContainer → primary-container
    const cssVar = `--s-${key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}`;
    root.style.setProperty(cssVar, value);
  }
};
