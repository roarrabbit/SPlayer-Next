import type { ThemeMode, ThemeSource } from "@/types/theme";
import { generatePalette, applyPalette, DEFAULT_PRIMARY } from "@/utils/color";

export const useThemeStore = defineStore("theme", () => {
  /** 主题模式 */
  const mode = ref<ThemeMode>("system");
  /** 颜色来源 */
  const source = ref<ThemeSource>("default");
  /** 自定义主色 HEX */
  const customColor = ref(DEFAULT_PRIMARY);
  /** 封面取色缓存 HEX */
  const coverColor = ref<string | null>(null);

  /** 当前是否为暗色 */
  const isDark = computed(() => {
    if (mode.value === "dark") return true;
    if (mode.value === "light") return false;
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  /** 当前使用的主色 HEX */
  const activeColor = computed(() => {
    if (source.value === "cover" && coverColor.value) return coverColor.value;
    if (source.value === "custom") return customColor.value;
    return DEFAULT_PRIMARY;
  });

  /** 应用主题到 DOM */
  const apply = (): void => {
    const root = document.documentElement;
    root.classList.add("theme-transition");
    const palette = generatePalette(activeColor.value, isDark.value);
    applyPalette(palette);
    root.classList.toggle("dark", isDark.value);
    setTimeout(() => root.classList.remove("theme-transition"), 300);
  };

  /** 设置主题模式 */
  const setMode = (newMode: ThemeMode): void => {
    mode.value = newMode;
    apply();
  };

  /** 设置自定义主色 HEX */
  const setCustomColor = (hex: string): void => {
    customColor.value = hex;
    source.value = "custom";
    apply();
  };

  /** 设置封面取色 */
  const setCoverColor = (hex: string | null): void => {
    coverColor.value = hex;
    if (hex && source.value === "cover") apply();
  };

  /** 设置颜色来源 */
  const setSource = (newSource: ThemeSource): void => {
    source.value = newSource;
    apply();
  };

  /** 初始化：应用主题 + 监听系统暗色变化 */
  const init = (): void => {
    // 修正持久化恢复的脏数据
    if (typeof customColor.value !== "string" || !customColor.value.startsWith("#")) {
      customColor.value = DEFAULT_PRIMARY;
    }
    apply();
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
      if (mode.value === "system") apply();
    });
  };

  return {
    mode,
    source,
    customColor,
    coverColor,
    isDark,
    activeColor,
    setMode,
    setCustomColor,
    setCoverColor,
    setSource,
    init,
  };
}, {
  persist: {
    storage: localStorage,
    pick: ["mode", "source", "customColor"],
  },
});
