import { registerSystemIpc } from "./system";
import { registerPlayerIpc } from "./player";
import { mediaService } from "../services/media";

/**
 * 注册所有 IPC 事件处理
 * @description 在此处集中引入各模块的 IPC 注册函数
 */
export const registerIpcHandlers = (): void => {
  registerSystemIpc();
  registerPlayerIpc();
  mediaService.init();
};
