import { ElectronAPI } from "@electron-toolkit/preload";
import { PlayerApi } from "@shared/types/player";
import { ConfigApi } from "@shared/types/settings";
import { LibraryApi } from "@shared/types/library";

declare global {
  interface Window {
    electron: ElectronAPI;
    api: {
      config: ConfigApi;
      player: PlayerApi;
      system: {
        toggleDevTools: () => Promise<void>;
        showInExplorer: (filePath: string) => Promise<void>;
      };
      library: LibraryApi;
    };
  }
}
