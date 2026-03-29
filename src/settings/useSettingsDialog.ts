import { ref } from "vue";

const open = ref(false);
const initialCategory = ref("player");
const initialHighlight = ref<string>();

/**
 * 设置弹窗控制
 * 全局单例，任何组件都可调用 show() 打开设置
 */
export const useSettingsDialog = () => ({
  open,
  initialCategory,
  initialHighlight,

  /** 打开设置弹窗，可指定初始分类和高亮项 */
  show: (category?: string, highlight?: string) => {
    if (category) initialCategory.value = category;
    initialHighlight.value = highlight;
    open.value = true;
  },

  /** 关闭设置弹窗 */
  hide: () => {
    open.value = false;
  },
});
