import { contextBridge, ipcRenderer } from "electron";
import { electronAPI } from "@electron-toolkit/preload";

// 暴露给渲染进程的自定义 API
const api = {
  // 通知主进程渲染器已就绪
  ready: () => ipcRenderer.send("app:ready"),
  player: {
    // 加载音频（本地路径或网络地址）
    load: (source: string) => ipcRenderer.invoke("player:load", source),
    // 恢复播放
    play: () => ipcRenderer.invoke("player:play"),
    // 暂停播放
    pause: () => ipcRenderer.invoke("player:pause"),
    // 停止播放
    stop: () => ipcRenderer.invoke("player:stop"),
    // 跳转到指定位置（毫秒）
    seek: (position: number) => ipcRenderer.invoke("player:seek", position),
    // 设置音量（0.0 ~ 1.0）
    setVolume: (volume: number) => ipcRenderer.invoke("player:setVolume", volume),
    // 获取当前音量
    getVolume: () => ipcRenderer.invoke("player:getVolume"),
    // 设置暂停/恢复时的渐变时长（毫秒），0 表示禁用
    setFadeDuration: (ms: number) => ipcRenderer.invoke("player:setFadeDuration", ms),
    // 获取当前渐变时长（毫秒）
    getFadeDuration: () => ipcRenderer.invoke("player:getFadeDuration"),
    // 获取播放状态快照
    getStatus: () => ipcRenderer.invoke("player:getStatus"),
    // 获取 FFT 频谱数据
    getFftData: () => ipcRenderer.invoke("player:getFftData"),
    // 启用/禁用 FFT 频谱推送
    setFftEnabled: (enabled: boolean) => ipcRenderer.invoke("player:setFftEnabled", enabled),
    // 重建音频输出设备
    reinit: () => ipcRenderer.invoke("player:reinit"),
    // 获取所有音频输出设备
    getOutputDevices: () => ipcRenderer.invoke("player:getOutputDevices"),
    // 获取系统默认输出设备名称
    getDefaultDeviceName: () => ipcRenderer.invoke("player:getDefaultDeviceName"),
    // 切换输出设备（传 null 使用系统默认）
    setOutputDevice: (deviceName: string | null) => ipcRenderer.invoke("player:setOutputDevice", deviceName),
    // 获取当前选择的输出设备名称
    getSelectedDeviceName: () => ipcRenderer.invoke("player:getSelectedDeviceName"),
    // 按需读取外部歌词文件内容
    readLyricFile: (filePath: string) => ipcRenderer.invoke("player:readLyricFile", filePath),
    // 打开文件选择对话框
    openFile: () => ipcRenderer.invoke("player:openFile"),
    // 订阅主进程推送的播放事件，返回取消订阅函数
    // 清除全部旧监听
    onEvent: (callback: (event: unknown) => void) => {
      ipcRenderer.removeAllListeners("player:event");
      const handler = (_event: Electron.IpcRendererEvent, data: unknown): void => {
        callback(data);
      };
      ipcRenderer.on("player:event", handler);
      return () => {
        ipcRenderer.removeListener("player:event", handler);
      };
    },
  },
  playback: {
    // 设置队列并从指定位置播放
    playFrom: (items: unknown[], startIndex?: number) =>
      ipcRenderer.invoke("playback:playFrom", items, startIndex),
    // 下一首
    next: () => ipcRenderer.invoke("playback:next"),
    // 上一首
    prev: () => ipcRenderer.invoke("playback:prev"),
    // 设置循环模式
    setRepeatMode: (mode: string) => ipcRenderer.invoke("playback:setRepeatMode", mode),
    // 设置随机模式
    setShuffleMode: (mode: string) => ipcRenderer.invoke("playback:setShuffleMode", mode),
    // 分页获取队列
    getQueuePage: (offset: number, limit: number) =>
      ipcRenderer.invoke("playback:getQueuePage", offset, limit),
    // 获取队列长度
    getQueueLength: () => ipcRenderer.invoke("playback:getQueueLength"),
    // 插入到队列
    insert: (item: unknown, afterIndex?: number) =>
      ipcRenderer.invoke("playback:insert", item, afterIndex),
    // 从队列移除
    remove: (index: number) => ipcRenderer.invoke("playback:remove", index),
    // 移动队列项
    move: (fromIndex: number, toIndex: number) =>
      ipcRenderer.invoke("playback:move", fromIndex, toIndex),
    // 清空队列
    clear: () => ipcRenderer.invoke("playback:clear"),
    // 订阅播放控制事件，返回取消订阅函数
    onEvent: (callback: (event: unknown) => void) => {
      ipcRenderer.removeAllListeners("playback:event");
      const handler = (_event: Electron.IpcRendererEvent, data: unknown): void => {
        callback(data);
      };
      ipcRenderer.on("playback:event", handler);
      return () => {
        ipcRenderer.removeListener("playback:event", handler);
      };
    },
  },
};

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld("electron", electronAPI);
    contextBridge.exposeInMainWorld("api", api);
  } catch (error) {
    console.error(error);
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI;
  // @ts-ignore (define in dts)
  window.api = api;
}
