import { registerSystemIpc } from "./system";
import { registerPlayerIpc } from "./player";
import { registerConfigIpc } from "./config";
import { registerLibraryIpc } from "./library";

/** 注册所有 IPC 处理 */
export const registerIpcHandlers = (): void => {
  registerSystemIpc();
  registerPlayerIpc();
  registerConfigIpc();
  registerLibraryIpc();
};
