import "virtual:uno.css";
import "@/styles/global.css"

import { createApp } from "vue";
import { createPinia } from "pinia";
import piniaPersistedstate from "pinia-plugin-persistedstate";
import App from "./App.vue";
import { useStatusStore } from "./stores/status";
import { useThemeStore } from "./stores/theme";

const pinia = createPinia();
pinia.use(piniaPersistedstate);

const app = createApp(App);
app.use(pinia);

// 初始化主题（必须在挂载前，避免闪烁）
useThemeStore().init();

// 初始化播放器事件监听
useStatusStore().init();

app.mount("#app");
