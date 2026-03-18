import type { ThemeMode, ThemeSource } from "@/types/theme";
import {
  generatePalette,
  applyPalette,
  DEFAULT_PRIMARY,
  SOLID_PALETTE_LIGHT,
  SOLID_PALETTE_DARK,
} from "@/utils/color";

/** 主题模式循环顺序 */
const MODE_CYCLE: ThemeMode[] = ["light", "dark", "system"];

export const useThemeStore = defineStore(
  "theme",
  () => {
    /** 主题模式 */
    const mode = ref<ThemeMode>("system");
    /** 颜色来源 */
    const source = ref<ThemeSource>("default");
    /** 自定义主色 HEX */
    const customColor = ref(DEFAULT_PRIMARY);
    /** 封面取色缓存 HEX */
    const coverColor = ref<string | null>(null);

    /** 系统暗色偏好（响应式） */
    const systemDark = usePreferredDark();

    /** 当前是否为暗色 */
    const isDark = computed(() => {
      if (mode.value === "dark") return true;
      if (mode.value === "light") return false;
      return systemDark.value;
    });

    /** 当前使用的主色 HEX */
    const activeColor = computed(() => {
      if (source.value === "cover" && coverColor.value) return coverColor.value;
      if (source.value === "custom") return customColor.value;
      return DEFAULT_PRIMARY;
    });

    /** 应用主题到 DOM */
    const apply = (withTransition = true): void => {
      const root = document.documentElement;
      if (withTransition) root.classList.add("theme-transition");
      const palette =
        source.value === "solid"
          ? isDark.value
            ? SOLID_PALETTE_DARK
            : SOLID_PALETTE_LIGHT
          : generatePalette(activeColor.value, isDark.value);
      applyPalette(palette);
      root.classList.toggle("dark", isDark.value);
      if (withTransition) setTimeout(() => root.classList.remove("theme-transition"), 300);
    };

    /** 设置主题模式 */
    const setMode = (newMode: ThemeMode): void => {
      mode.value = newMode;
      apply();
    };

    /** 循环切换主题模式：light → dark → system → light */
    const cycleMode = (): void => {
      const idx = MODE_CYCLE.indexOf(mode.value);
      setMode(MODE_CYCLE[(idx + 1) % MODE_CYCLE.length]);
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

    /** 初始化 */
    const init = (): void => {
      // 修正持久化恢复的脏数据
      if (typeof customColor.value !== "string" || !customColor.value.startsWith("#")) {
        customColor.value = DEFAULT_PRIMARY;
      }
      apply(false);
      // 变化时重新应用
      watch([isDark, activeColor, source], () => apply());
    };

    return {
      mode,
      source,
      customColor,
      coverColor,
      isDark,
      activeColor,
      setMode,
      cycleMode,
      setCustomColor,
      setCoverColor,
      setSource,
      init,
    };
  },
  {
    persist: {
      storage: localStorage,
      pick: ["mode", "source", "customColor"],
    },
  },
);
