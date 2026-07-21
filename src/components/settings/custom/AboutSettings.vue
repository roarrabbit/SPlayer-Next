<script setup lang="ts">
import { getContributors, type Contributor } from "@/apis/github";
import { useUpdateStore } from "@/stores/update";
import { openExternal } from "@/utils/url";
import { APP_VERSION, HOMEPAGE_URL, COPYRIGHT_HOLDER } from "@/utils/config";
import IconLucideRefreshCw from "~icons/lucide/refresh-cw";
import IconLucideGithub from "~icons/lucide/github";
import IconLucideRss from "~icons/lucide/rss";
import IconLucideArrowUpRight from "~icons/lucide/arrow-up-right";
import IconLucideChevronDown from "~icons/lucide/chevron-down";

const { t } = useI18n();
const update = useUpdateStore();

/** 检查更新中 */
const checking = computed(() => update.phase === "checking");

/** 触发更新检查 */
const handleCheckUpdate = (): void => {
  if (update.hasUpdate) {
    update.openDialog();
    return;
  }
  update.checkManually();
};

/** 打开日志目录 */
const handleOpenLogs = (): void => void window.api.system.openLogsDir();

interface Dependency {
  name: string;
  description: string;
  url: string;
}

/** 依赖的开源项目 */
const dependencies: Dependency[] = [
  {
    name: "applemusic-like-lyrics",
    description: "类 Apple Music 歌词显示组件库",
    url: "https://github.com/Steve-xmh/applemusic-like-lyrics",
  },
  {
    name: "NeteaseCloudMusicApiEnhanced",
    description: "网易云音乐 API 备份 + 增强",
    url: "https://github.com/neteasecloudmusicapienhanced/api-enhanced",
  },
];

/** Fork 仓库（社区入口指向本分支） */
const FORK_REPO_URL = "https://github.com/roarrabbit/SPlayer-Next";

/** 社区与资讯入口 */
const community = computed(() => [
  { name: "SPlayer-Next Fork", url: FORK_REPO_URL, icon: IconLucideGithub },
  { name: t("settings.about.officialSite"), url: HOMEPAGE_URL, icon: IconLucideRss },
]);

/** 展示名称（Fork 标识） */
const displayName = "SPlayer-Next Fork";

/** 二作（固定展示在 Author 右侧） */
const FORK_DEVELOPER: Contributor & { role: string } = {
  login: "roarrabbit",
  htmlUrl: "https://github.com/roarrabbit",
  avatar: "https://avatars.githubusercontent.com/u/52274334",
  role: "Secondary Author",
};

/** 开发者角色文案 */
const developerRole = (login: string): string => {
  if (login === COPYRIGHT_HOLDER) return "Author";
  if (login === FORK_DEVELOPER.login) return FORK_DEVELOPER.role;
  return "Contributor";
};

const developers = ref<Contributor[]>([]);
const showAllDevelopers = ref(false);

/** 默认仅展示前 6 位，其余折叠 */
const visibleDevelopers = computed(() =>
  showAllDevelopers.value ? developers.value : developers.value.slice(0, 6),
);
const hasMoreDevelopers = computed(() => developers.value.length > 6);

onMounted(async () => {
  try {
    const list = await getContributors();
    // Author 第一、Secondary Author 第二，其余去重后接上
    const pinnedLogins = new Set([COPYRIGHT_HOLDER, FORK_DEVELOPER.login]);
    const author =
      list.find((d) => d.login === COPYRIGHT_HOLDER) ??
      ({
        login: COPYRIGHT_HOLDER,
        htmlUrl: `https://github.com/${COPYRIGHT_HOLDER}`,
        avatar: "",
      } satisfies Contributor);
    const rest = list.filter((d) => !pinnedLogins.has(d.login));
    developers.value = [author, FORK_DEVELOPER, ...rest];
  } catch (error) {
    console.error("获取贡献者失败:", error);
    developers.value = [
      {
        login: COPYRIGHT_HOLDER,
        htmlUrl: `https://github.com/${COPYRIGHT_HOLDER}`,
        avatar: "",
      },
      FORK_DEVELOPER,
    ];
  }
});
</script>

<template>
  <div class="flex flex-col gap-8">
    <!-- 关于软件 -->
    <section>
      <h3 class="flex items-center gap-2 text-lg font-semibold text-on-surface mb-3 px-1">
        <span class="w-0.75 h-4 rounded-full bg-primary" />
        {{ t("settings.section.aboutApp") }}
      </h3>
      <div
        class="rounded-xl bg-surface-panel border border-solid border-outline-variant/15 p-4 flex flex-wrap items-center gap-4"
      >
        <SLogo :size="34" />
        <div class="flex items-center gap-2 mr-auto">
          <span class="text-lg font-logo text-on-surface">{{ displayName }}</span>
          <STag type="primary" size="small" round>v{{ APP_VERSION }}</STag>
        </div>
        <div class="flex items-center gap-2">
          <SButton variant="secondary" :loading="checking" @click="handleCheckUpdate">
            <template #icon><IconLucideRefreshCw /></template>
            {{
              update.hasUpdate
                ? t("settings.about.newVersion")
                : checking
                  ? t("settings.about.checking")
                  : t("settings.about.checkUpdate")
            }}
          </SButton>
          <SButton variant="secondary" @click="handleOpenLogs">
            {{ t("settings.about.openLogs") }}
          </SButton>
        </div>
      </div>
    </section>

    <!-- 特别致谢 -->
    <section>
      <h3 class="flex items-center gap-2 text-lg font-semibold text-on-surface mb-3 px-1">
        <span class="w-0.75 h-4 rounded-full bg-primary" />
        {{ t("settings.section.specialThanks") }}
      </h3>
      <div class="grid grid-cols-3 gap-2.5">
        <button
          v-for="dep in dependencies"
          :key="dep.name"
          class="group text-left rounded-xl bg-surface-panel border border-solid border-outline-variant/15 px-4 py-3 transition-colors hover:border-primary/40 cursor-pointer"
          @click="openExternal(dep.url)"
        >
          <div class="flex items-center gap-1.5">
            <span class="text-sm font-medium text-on-surface truncate">{{ dep.name }}</span>
            <IconLucideArrowUpRight
              class="size-3.5 text-on-surface-variant/40 group-hover:text-primary transition-colors"
            />
          </div>
          <div class="text-xs text-on-surface-variant/70 mt-0.5 line-clamp-1">
            {{ dep.description }}
          </div>
        </button>
      </div>
    </section>

    <!-- 开发人员 -->
    <section v-if="developers.length > 0">
      <h3 class="flex items-center gap-2 text-lg font-semibold text-on-surface mb-3 px-1">
        <span class="w-0.75 h-4 rounded-full bg-primary" />
        {{ t("settings.section.developers") }}
      </h3>
      <div class="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        <button
          v-for="dev in visibleDevelopers"
          :key="dev.login"
          class="text-left rounded-xl bg-surface-panel border border-solid border-outline-variant/15 px-3 py-2.5 flex items-center gap-2.5 transition-colors hover:border-primary/40 cursor-pointer"
          @click="openExternal(dev.htmlUrl)"
        >
          <SImg
            :src="dev.avatar"
            fallback="/images/avatar.jpg"
            class="size-9 rounded-full shrink-0"
          />
          <div class="min-w-0">
            <div class="text-sm font-medium text-on-surface truncate">{{ dev.login }}</div>
            <div class="text-xs text-on-surface-variant/60 truncate">
              {{ developerRole(dev.login) }}
            </div>
          </div>
        </button>
      </div>
      <SButton
        v-if="hasMoreDevelopers"
        variant="text"
        size="small"
        class="mt-3"
        @click="showAllDevelopers = !showAllDevelopers"
      >
        {{ showAllDevelopers ? t("settings.about.collapse") : t("settings.about.showMore") }}
        <template #icon>
          <IconLucideChevronDown
            class="transition-transform"
            :class="showAllDevelopers && 'rotate-180'"
          />
        </template>
      </SButton>
    </section>

    <!-- 社区与资讯 -->
    <section>
      <h3 class="flex items-center gap-2 text-lg font-semibold text-on-surface mb-3 px-1">
        <span class="w-0.75 h-4 rounded-full bg-primary" />
        {{ t("settings.section.community") }}
      </h3>
      <div class="grid grid-cols-3 gap-2.5">
        <button
          v-for="item in community"
          :key="item.name"
          class="rounded-xl bg-surface-panel border border-solid border-outline-variant/15 px-4 py-3 flex items-center gap-2.5 transition-colors hover:border-primary/40 cursor-pointer"
          @click="openExternal(item.url)"
        >
          <component :is="item.icon" class="size-5 text-on-surface-variant shrink-0" />
          <span class="text-sm font-medium text-on-surface truncate">{{ item.name }}</span>
        </button>
      </div>
    </section>
  </div>
</template>
