import type { SystemConfig } from "@shared/types/settings";

export interface Migration {
  /** 版本号，递增整数 */
  version: number;
  /** 迁移函数，直接修改 data 对象 */
  migrate: (data: SystemConfig) => void;
}

/**
 * 迁移列表，按 version 递增排列
 * 新增字段已由 deepMerge 自动补全，此处仅用于字段重命名、数据转换等
 */
export const migrations: Migration[] = [
  {
    version: 1,
    migrate: (data) => {
      // 清空出厂默认的全局快捷键，用户自行绑定的其它全局键保留
      const hotkeys = data.hotkeys as
        | {
            bindings?: Record<string, { inApp?: string | null; global?: string | null }>;
          }
        | undefined;
      if (!hotkeys?.bindings) return;
      const oldDefaultGlobals: Record<string, string> = {
        "player.togglePlay": "CommandOrControl+Shift+Space",
        "player.prev": "CommandOrControl+Shift+Left",
        "player.next": "CommandOrControl+Shift+Right",
        "player.volumeUp": "CommandOrControl+Shift+Up",
        "player.volumeDown": "CommandOrControl+Shift+Down",
      };
      for (const [id, oldGlobal] of Object.entries(oldDefaultGlobals)) {
        const binding = hotkeys.bindings[id];
        if (!binding || typeof binding !== "object") continue;
        if (binding.global === oldGlobal) binding.global = null;
      }
    },
  },
];
