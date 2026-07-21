import { defineConfig, presetWind3, presetIcons } from "unocss";

export default defineConfig({
  presets: [presetWind3(), presetIcons()],
  shortcuts: {
    // 玻璃感面板
    "glass-panel": "bg-surface-panel/80 backdrop-blur-2xl backdrop-saturate-150",
    // 表单控件底色
    "bg-field": "bg-surface-bright/40",
  },
  theme: {
    fontFamily: {
      logo: "logo",
      sans: "var(--user-font, var(--app-font))",
    },
    animation: {
      keyframes: {
        // 浮层：从触发方向轻微上移 + 缩放，避免凭空出现
        "popover-in":
          "{ from { opacity: 0; transform: translateY(4px) scale(0.96) } to { opacity: 1; transform: translateY(0) scale(1) } }",
        "popover-out":
          "{ from { opacity: 1; transform: translateY(0) scale(1) } to { opacity: 0; transform: translateY(4px) scale(0.96) } }",
        "overlay-in": "{ from { opacity: 0 } to { opacity: 1 } }",
        "overlay-out": "{ from { opacity: 1 } to { opacity: 0 } }",
        "dialog-in":
          "{ from { opacity: 0; transform: translate(-50%, -48%) scale(0.96) } to { opacity: 1; transform: translate(-50%, -50%) scale(1) } }",
        "dialog-out":
          "{ from { opacity: 1; transform: translate(-50%, -50%) scale(1) } to { opacity: 0; transform: translate(-50%, -48%) scale(0.97) } }",
        "dialog-in-top":
          "{ from { opacity: 0; transform: translateX(-50%) translateY(-6px) scale(0.97) } to { opacity: 1; transform: translateX(-50%) translateY(0) scale(1) } }",
        "dialog-out-top":
          "{ from { opacity: 1; transform: translateX(-50%) translateY(0) scale(1) } to { opacity: 0; transform: translateX(-50%) translateY(-4px) scale(0.97) } }",
        "panel-in":
          "{ from { opacity: 0; transform: scale(0.97) } to { opacity: 1; transform: scale(1) } }",
        "panel-out":
          "{ from { opacity: 1; transform: scale(1) } to { opacity: 0; transform: scale(0.97) } }",
        "select-in":
          "{ from { opacity: 0; transform: translateY(-3px) scale(0.98) } to { opacity: 1; transform: translateY(0) scale(1) } }",
        "select-out":
          "{ from { opacity: 1; transform: translateY(0) scale(1) } to { opacity: 0; transform: translateY(-3px) scale(0.98) } }",
        "slide-in-item":
          "{ from { opacity: 0; transform: translateY(6px) } to { opacity: 1; transform: translateY(0) } }",
        "fade-in": "{ from { opacity: 0 } to { opacity: 1 } }",
        "highlight-pulse":
          "{ 0%, 100% { box-shadow: 0 0 0 0 transparent } 25%, 75% { box-shadow: 0 0 0 3px rgb(var(--s-primary) / 0.3) } 50% { box-shadow: 0 0 0 3px rgb(var(--s-primary) / 0.15) } }",
        // 抽屉：iOS sheet 感（连续、可感动量，无 ease-in 拖沓）
        "drawer-in-right":
          "{ from { transform: translateX(100%) } to { transform: translateX(0) } }",
        "drawer-out-right":
          "{ from { transform: translateX(0) } to { transform: translateX(100%) } }",
        "drawer-in-left":
          "{ from { transform: translateX(-100%) } to { transform: translateX(0) } }",
        "drawer-out-left":
          "{ from { transform: translateX(0) } to { transform: translateX(-100%) } }",
      },
      durations: {
        "popover-in": "180ms",
        "popover-out": "120ms",
        "overlay-in": "180ms",
        "overlay-out": "120ms",
        "dialog-in": "220ms",
        "dialog-out": "160ms",
        "dialog-in-top": "220ms",
        "dialog-out-top": "160ms",
        "panel-in": "220ms",
        "panel-out": "140ms",
        "select-in": "150ms",
        "select-out": "100ms",
        "fade-in": "140ms",
        "slide-in-item": "200ms",
        "highlight-pulse": "2s",
        "drawer-in-right": "320ms",
        "drawer-out-right": "240ms",
        "drawer-in-left": "320ms",
        "drawer-out-left": "240ms",
      },
      timingFns: {
        // ease-out / iOS 近似曲线；exit 同样用 ease-out，避免 ease-in 发闷
        "popover-in": "cubic-bezier(0.16, 1, 0.3, 1)",
        "popover-out": "cubic-bezier(0.16, 1, 0.3, 1)",
        "overlay-in": "cubic-bezier(0.16, 1, 0.3, 1)",
        "overlay-out": "cubic-bezier(0.16, 1, 0.3, 1)",
        "dialog-in": "cubic-bezier(0.16, 1, 0.3, 1)",
        "dialog-out": "cubic-bezier(0.16, 1, 0.3, 1)",
        "dialog-in-top": "cubic-bezier(0.16, 1, 0.3, 1)",
        "dialog-out-top": "cubic-bezier(0.16, 1, 0.3, 1)",
        "panel-in": "cubic-bezier(0.16, 1, 0.3, 1)",
        "panel-out": "cubic-bezier(0.16, 1, 0.3, 1)",
        "select-in": "cubic-bezier(0.16, 1, 0.3, 1)",
        "select-out": "cubic-bezier(0.16, 1, 0.3, 1)",
        "fade-in": "cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-in-item": "cubic-bezier(0.16, 1, 0.3, 1)",
        "highlight-pulse": "ease-in-out",
        "drawer-in-right": "cubic-bezier(0.32, 0.72, 0, 1)",
        "drawer-out-right": "cubic-bezier(0.32, 0.72, 0, 1)",
        "drawer-in-left": "cubic-bezier(0.32, 0.72, 0, 1)",
        "drawer-out-left": "cubic-bezier(0.32, 0.72, 0, 1)",
      },
    },
    colors: {
      primary: "rgb(var(--s-primary) / <alpha-value>)",
      "primary-container": "rgb(var(--s-primary-container) / <alpha-value>)",
      "on-primary": "rgb(var(--s-on-primary) / <alpha-value>)",
      "on-primary-container": "rgb(var(--s-on-primary-container) / <alpha-value>)",
      secondary: "rgb(var(--s-secondary) / <alpha-value>)",
      "secondary-container": "rgb(var(--s-secondary-container) / <alpha-value>)",
      surface: "rgb(var(--s-surface) / <alpha-value>)",
      "surface-alt": "rgb(var(--s-surface-alt) / <alpha-value>)",
      "surface-panel": "rgb(var(--s-surface-panel) / <alpha-value>)",
      "surface-bright": "rgb(var(--s-surface-bright) / <alpha-value>)",
      "on-surface": "rgb(var(--s-on-surface) / <alpha-value>)",
      "on-surface-variant": "rgb(var(--s-on-surface-variant) / <alpha-value>)",
      outline: "rgb(var(--s-outline) / <alpha-value>)",
      "outline-variant": "rgb(var(--s-outline-variant) / <alpha-value>)",
      cover: "rgb(var(--s-cover) / <alpha-value>)",
      "cover-base": "rgb(var(--s-cover-base) / <alpha-value>)",
    },
  },
});
