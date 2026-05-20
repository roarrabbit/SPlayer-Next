const MAX_SEARCH_HISTORY = 20;

/**
 * 通用本地数据 store
 * 用于沉淀那些跨页面、需持久化、但不归属任何业务模块的小块数据
 */
export const useDataStore = defineStore(
  "data",
  () => {
    /** 搜索历史（最新在前，去重，最多 20 条） */
    const searchHistory = ref<string[]>([]);

    /** 写入搜索历史 */
    const addSearchHistory = (keyword: string): void => {
      const word = keyword.trim();
      if (!word) return;
      const next = [word, ...searchHistory.value.filter((existing) => existing !== word)];
      if (next.length > MAX_SEARCH_HISTORY) next.length = MAX_SEARCH_HISTORY;
      searchHistory.value = next;
    };

    /** 移除某条搜索历史 */
    const removeSearchHistory = (keyword: string): void => {
      searchHistory.value = searchHistory.value.filter((existing) => existing !== keyword);
    };

    /** 清空搜索历史 */
    const clearSearchHistory = (): void => {
      searchHistory.value = [];
    };

    return {
      searchHistory,
      addSearchHistory,
      removeSearchHistory,
      clearSearchHistory,
    };
  },
  {
    persist: {
      storage: localStorage,
      pick: ["searchHistory"],
    },
  },
);
