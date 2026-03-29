import type { SettingCategory } from "@/types/settings-schema";
import IconLucidePlay from "~icons/lucide/play";
import IconLucidePalette from "~icons/lucide/palette";
import IconLucideSettings from "~icons/lucide/settings";

export const settingsSchema: SettingCategory[] = [
  {
    id: "player",
    icon: IconLucidePlay,
    sections: [
      {
        id: "playback",
        items: [
          {
            key: "playerBgType",
            type: "select",
            binding: { store: "settings", path: "player.playerBgType" },
            options: [
              { value: "blur", labelKey: "settings.playerBgType.blur" },
              { value: "solid", labelKey: "settings.playerBgType.solid" },
            ],
            defaultValue: "blur",
          },
        ],
      },
      {
        id: "lyrics",
        items: [
          {
            key: "lyricMode",
            type: "select",
            binding: { store: "settings", path: "player.lyricMode" },
            options: [
              { value: "effects", labelKey: "settings.lyricMode.effects" },
              { value: "simple", labelKey: "settings.lyricMode.simple" },
            ],
            defaultValue: "effects",
          },
          {
            key: "autoCenterCover",
            type: "switch",
            binding: { store: "settings", path: "player.autoCenterCover" },
            defaultValue: true,
          },
        ],
      },
    ],
  },
  {
    id: "appearance",
    icon: IconLucidePalette,
    sections: [
      {
        id: "theme",
        items: [
          {
            key: "themeMode",
            type: "select",
            binding: { store: "theme", path: "mode" },
            options: [
              { value: "light", labelKey: "settings.themeMode.light" },
              { value: "dark", labelKey: "settings.themeMode.dark" },
              { value: "system", labelKey: "settings.themeMode.system" },
            ],
            defaultValue: "system",
          },
          {
            key: "globalTint",
            type: "switch",
            binding: { store: "theme", path: "globalTint" },
            defaultValue: false,
          },
        ],
      },
      {
        id: "layout",
        items: [
          {
            key: "layoutMode",
            type: "select",
            binding: { store: "settings", path: "player.layoutMode" },
            options: [
              { value: "default", labelKey: "settings.layoutMode.default" },
              { value: "sidebar-full", labelKey: "settings.layoutMode.sidebarFull" },
              { value: "floating", labelKey: "settings.layoutMode.floating" },
            ],
            defaultValue: "default",
          },
        ],
      },
    ],
  },
  {
    id: "system",
    icon: IconLucideSettings,
    sections: [
      {
        id: "media",
        items: [
          {
            key: "systemMediaControls",
            type: "switch",
            binding: { store: "settings", path: "system.media.systemMediaControls" },
            defaultValue: true,
          },
        ],
      },
      {
        id: "discord",
        items: [
          {
            key: "discordEnabled",
            type: "switch",
            binding: { store: "settings", path: "system.media.discord.enabled" },
            defaultValue: false,
            children: [
              {
                key: "discordShowWhenPaused",
                type: "switch",
                binding: { store: "settings", path: "system.media.discord.showWhenPaused" },
                defaultValue: false,
              },
            ],
          },
        ],
      },
    ],
  },
];
