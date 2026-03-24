import { ElectronAPI } from "@electron-toolkit/preload";
import { PlayerApi } from "@shared/types/player";

declare global {
  interface Window {
    electron: ElectronAPI;
    api: {
      player: PlayerApi;
    };
  }
}
