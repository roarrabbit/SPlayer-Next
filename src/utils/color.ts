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

/** 将色板写入 CSS 自定义属性 */
export const applyPalette = (palette: ThemePalette): void => {
  const root = document.documentElement;
  for (const [key, value] of Object.entries(palette)) {
    // camelCase → kebab-case: primaryContainer → primary-container
    const cssVar = `--s-${key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}`;
    root.style.setProperty(cssVar, value);
  }
};
