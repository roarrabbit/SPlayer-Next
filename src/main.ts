import "./assets/main.css";

import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import { useStatusStore } from "./stores/status";

const app = createApp(App);
app.use(createPinia());

// pinia 就绪后初始化播放器事件监听，全生命周期只跑一次
useStatusStore().init();

app.mount("#app");
