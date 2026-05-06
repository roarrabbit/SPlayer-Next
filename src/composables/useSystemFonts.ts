/**
 * 读取系统已安装字体
 */

/** 系统字体列表 */
const families = ref<string[]>([]);
/** 是否正在加载字体列表 */
const loading = ref(false);

/** 获取系统字体列表 */
const fetchFamilies = async (): Promise<string[]> => {
  const list = await window.api.system.listFonts();
  const unique = Array.from(new Set(list.filter((f) => f.trim().length > 0)));
  unique.sort((a, b) => a.localeCompare(b, "zh-CN"));
  return unique;
};

/** 使用系统字体 */
export const useSystemFonts = () => {
  /** 触发拉取（每次都重新拉，仅以 loading 为并发锁） */
  const ensureLoaded = async (): Promise<void> => {
    if (loading.value) return;
    loading.value = true;
    families.value = [];
    try {
      families.value = await fetchFamilies();
    } catch (err) {
      console.error("[fonts] listFonts failed", err);
    } finally {
      loading.value = false;
    }
  };

  return { families, loading, ensureLoaded };
};
