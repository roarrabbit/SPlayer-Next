<script setup lang="ts">
import { useStatusStore } from "@/stores/status";
import { useMediaStore } from "@/stores/media";
import { useSettingsStore } from "@/stores/settings";
import { usePlaybackTime } from "@/composables/usePlaybackTime";
import { getCurrentTime } from "@/services/playback";
import type { QualityLevel } from "@/utils/quality";
import { useFavorite } from "@/composables/useFavorite";
import { useDownload, buildDownloadQualityItems } from "@/composables/useDownload";
import { usePlaylistPicker } from "@/composables/usePlaylistPicker";
import { useImmersiveMode } from "@/composables/useImmersiveMode";
import { useSheetDismiss } from "@/composables/useSheetDismiss";
import { useTimeFormat } from "@/composables/useTimeFormat";
import Lyrics from "@/components/player/Lyrics/index.vue";
import AMLLLyrics from "@/components/player/Lyrics/AMLLLyrics.vue";
import PlaylistPickerDialog from "@/components/modals/PlaylistPickerDialog.vue";
import { useWindowControls } from "@/composables/useWindowControls";
import * as player from "@/core/player";
import { openExternal } from "@/utils/url";
import IconFavorite from "~icons/material-symbols/favorite-rounded";
import IconFavoriteOutline from "~icons/material-symbols/favorite-outline-rounded";
import IconLucideListPlus from "~icons/lucide/list-plus";
import IconLucideDownload from "~icons/lucide/download";

const status = useStatusStore();
const media = useMediaStore();
const settings = useSettingsStore();
const fav = useFavorite();
const { enqueue: enqueueDownload } = useDownload();
const { t } = useI18n();
const {
  isPlaying,
  isLoading,
  position,
  duration,
  isExpanded,
  repeatMode,
  shuffleMode,
  heartMode,
  fmMode,
  showLyric,
} = storeToRefs(status);

const { timeDisplay, toggleTimeFormat } = useTimeFormat();

const lyricRef = ref<InstanceType<typeof Lyrics> | InstanceType<typeof AMLLLyrics>>();
const lyricMounted = ref(false);
const initialLyricTimeMs = ref(0);

const hasLyric = computed(() => media.parsedLyric.length > 0 || media.lyricLoading);
const hasTrack = computed(() => !!media.track);

/** 精确播放时间（毫秒） */
const { start: startTick, stop: stopTick } = usePlaybackTime((currentMs) => {
  if (!status.trackLoading && !media.lyricLoading) {
    lyricRef.value?.setCurrentTime(currentMs + status.lyricOffsetMs, player.isSeeking());
  }
});

/** 展开后 */
const onAfterEnter = () => {
  initialLyricTimeMs.value = getCurrentTime() + status.lyricOffsetMs;
  lyricMounted.value = true;
  nextTick(() => {
    lyricRef.value?.resume();
    startTick();
  });
};

/** 收起前 */
const onBeforeLeave = () => {
  lyricRef.value?.freeze();
  stopTick();
};

/** 收起后 */
const onAfterLeave = () => {
  lyricMounted.value = false;
};

// 重新挂载时，刷新初始时间
watch(hasLyric, (value) => {
  if (value && lyricMounted.value) {
    initialLyricTimeMs.value = getCurrentTime() + status.lyricOffsetMs;
  }
});

// 歌词变化时先推送精确时间
watch(
  () => media.parsedLyric,
  () => lyricRef.value?.setCurrentTime(getCurrentTime() + status.lyricOffsetMs),
);

// 切换歌词引擎时，重新计算初始并推送时间
watch(
  () => settings.lyric.engine,
  () => {
    initialLyricTimeMs.value = getCurrentTime() + status.lyricOffsetMs;
    nextTick(() => {
      lyricRef.value?.setCurrentTime(getCurrentTime() + status.lyricOffsetMs);
      if (isPlaying.value) lyricRef.value?.resume();
    });
  },
);

const fullscreenCover = computed(() => settings.player.coverLayout === "fullscreen");

const coverCentered = computed(() => {
  if (fullscreenCover.value || status.fullQueueOpen) return false;
  return !showLyric.value || (settings.player.autoCenterCover && !hasLyric.value);
});

const handleLyricSeek = async (timeMs: number): Promise<void> => {
  await player.seek(timeMs);
  if (!isPlaying.value) await player.play();
};

const springConfig = computed(() => ({
  mass: settings.lyric.springMass,
  damping: settings.lyric.springDamping,
  stiffness: settings.lyric.springStiffness,
}));

const lyricFontSize = computed(() =>
  settings.lyric.adaptiveFontSize
    ? `calc(${settings.lyric.fontSize} / 1080 * 100vh)`
    : `${settings.lyric.fontSize}px`,
);

const { immersive, onPlayerMouseEnter, onPlayerMouseLeave, onMainMove, onBarEnter, onBarLeave } =
  useImmersiveMode(isExpanded);

const { isFullscreen, toggleFullscreen } = useWindowControls();

const canDownload = computed(
  () => !!media.track && media.track.source !== "local" && settings.system.download.enabled,
);

const downloadQualityItems = computed(() =>
  buildDownloadQualityItems(t("download.qualityDefault")),
);

const onDownloadSelect = (key: string): void => {
  if (!media.track) return;
  void enqueueDownload(media.track, key ? { quality: key as QualityLevel } : {});
};

const playerRootRef = ref<HTMLElement | null>(null);

/**
 * 面板自身可见性：与 isExpanded 解耦
 * - isExpanded 立即 false → 主界面立刻从 opacity-0 恢复（原逻辑）
 * - sheetOpen 等弹簧/CSS leave 结束后再 false → FullPlayer 离场不挡主界面
 */
const sheetOpen = ref(false);
/** 本轮关闭是否由手势/弹簧驱动（避免 isExpanded 回写时立刻卸掉面板） */
let sheetClosing = false;

const {
  dragging: sheetDragging,
  settling: sheetSettling,
  skipLeaveTransition,
  onPointerDown: onSheetPointerDown,
  onPointerMove: onSheetPointerMove,
  onPointerUp: onSheetPointerUp,
  onPointerCancel: onSheetPointerCancel,
  dismissAnimated,
  resetAfterClose,
  resetForOpen,
  bindHost,
} = useSheetDismiss({
  open: sheetOpen,
  onDismissStart: () => {
    // 与原逻辑一致：主界面立刻可见，FullPlayer 继续弹簧离场
    sheetClosing = true;
    isExpanded.value = false;
  },
  onDismissEnd: () => {
    // 仅当关闭过程中面板被重新打开（isExpanded 又为 true）才复位回屏幕内；
    // 正常下滑关闭时 isExpanded 已是 false，应正常卸载面板（sheetOpen=false）。
    if (sheetOpen.value && isExpanded.value) {
      animateReopen();
      sheetClosing = false;
      return;
    }
    sheetOpen.value = false;
    sheetClosing = false;
  },
});

/**
 * 快速重新打开（下滑关闭的弹簧离场中/刚结束就再次上滑）时，带动画回到原位。
 * 此时 sheetOpen 一直是 true，内部 watch 看不到值变化，面板可能仍滞留在屏幕外
 * （translate3d 未清、z-200 全屏拦截点击 → 白屏）。先复位，再手动模拟一次
 * enter：放到底部 → reflow → CSS 过渡滑入，与正常打开的 <Transition> 动画一致。
 */
const animateReopen = (): void => {
  resetForOpen();
  const el = playerRootRef.value;
  if (!el) return;
  el.style.transition = "none";
  el.style.transform = "translate3d(0, 100%, 0)";
  // 强制 reflow，让起始位移先落地
  void el.offsetHeight;
  el.style.transition = "transform 420ms cubic-bezier(0.32, 0.72, 0, 1)";
  el.style.transform = "";
  el.addEventListener(
    "transitionend",
    () => {
      if (playerRootRef.value === el) {
        el.style.transition = "";
        el.style.transform = "";
        el.style.touchAction = "";
      }
    },
    { once: true },
  );
};

// 注意：此 watch 须在 useSheetDismiss 解构之后定义，否则 immediate 回调
// 会访问尚未初始化的 resetForOpen（TDZ 错误）
watch(
  isExpanded,
  (expanded) => {
    if (expanded) {
      sheetClosing = false;
      // 若 sheetOpen 值未变（弹簧离场进行中已被重新打开），面板可能仍滞留在
      // 屏幕外（translate3d 未清、z-200 全屏拦截点击 → 白屏）。此时带滑入动画
      // 复位；正常 false→true 打开则交给 Vue <Transition> enter 动画，不干预。
      if (sheetOpen.value) {
        animateReopen();
      } else {
        sheetOpen.value = true;
      }
      return;
    }
    // 外部直接 isExpanded=false（如封面点艺术家）：走原 CSS leave
    if (!sheetClosing && sheetOpen.value) {
      sheetOpen.value = false;
    }
  },
  { immediate: true },
);

const collapse = (): void => {
  // 按钮 / Esc：立刻恢复主界面 + 弹簧离场 FullPlayer
  if (!sheetOpen.value || sheetClosing) return;
  dismissAnimated();
};

/** 输入框 / 上层弹窗打开时，Esc 不关播放页 */
const shouldIgnoreEscape = (): boolean => {
  const el = document.activeElement as HTMLElement | null;
  if (el) {
    if (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT") return true;
    if (el.isContentEditable) return true;
  }
  // reka Dialog / 其它 modal 打开时优先关弹层
  if (document.querySelector('[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]')) {
    return true;
  }
  return false;
};

/** 快捷键系统 view.closePlayer 派发，走同一套 collapse */
const onCloseFullPlayer = (): void => {
  collapse();
};

/** 内置 Esc：即使用户仍是旧绑定 Ctrl+Esc，播放页也支持单按 Esc */
const onPlayerKeyDown = (e: KeyboardEvent): void => {
  if (e.key !== "Escape" || e.isComposing) return;
  if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
  if (!sheetOpen.value || sheetClosing) return;
  if (shouldIgnoreEscape()) return;
  e.preventDefault();
  collapse();
};

watch(
  sheetOpen,
  (open) => {
    if (open) {
      window.addEventListener("keydown", onPlayerKeyDown, true);
      window.addEventListener("splayer:close-full-player", onCloseFullPlayer);
    } else {
      window.removeEventListener("keydown", onPlayerKeyDown, true);
      window.removeEventListener("splayer:close-full-player", onCloseFullPlayer);
    }
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  window.removeEventListener("keydown", onPlayerKeyDown, true);
  window.removeEventListener("splayer:close-full-player", onCloseFullPlayer);
});

/** 手势/弹簧收起时跳过 CSS leave，避免屏外面板先弹回再滑出 */
const onPlayerBeforeLeave = (el: Element): void => {
  onBeforeLeave();
  if (!skipLeaveTransition.value) return;
  const htmlEl = el as HTMLElement;
  htmlEl.style.transition = "none";
};

const onPlayerAfterLeave = (): void => {
  onAfterLeave();
  resetAfterClose();
};

const onPlayerAfterEnter = (): void => {
  onAfterEnter();
  if (playerRootRef.value) bindHost(playerRootRef.value);
};

const onSeekDragEnd = (value: number): void => {
  player.seek(value);
};

const {
  open: pickerOpen,
  tracks: pickerTracks,
  mode: pickerMode,
  openPicker,
} = usePlaylistPicker();

const lyricToggleDisabled = computed(() => !hasLyric.value || fullscreenCover.value);
const lyricToggleActive = computed(
  () => showLyric.value && hasLyric.value && !status.fullQueueOpen && !fullscreenCover.value,
);

const toggleLyric = (): void => {
  if (status.fullQueueOpen) {
    status.fullQueueOpen = false;
    showLyric.value = true;
  } else {
    showLyric.value = !showLyric.value;
  }
};

const showComments = (): void => {
  if (media.track) status.showComments(media.track);
};
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-transform duration-420 ease-[cubic-bezier(0.32,0.72,0,1)]"
      leave-active-class="transition-transform duration-360 ease-[cubic-bezier(0.32,0.72,0,1)]"
      enter-from-class="translate-y-full"
      leave-to-class="translate-y-full"
      @after-enter="onPlayerAfterEnter"
      @before-leave="onPlayerBeforeLeave"
      @after-leave="onPlayerAfterLeave"
    >
      <div
        ref="playerRootRef"
        v-show="sheetOpen"
        class="full-player-root fixed inset-0 z-200 overflow-hidden text-cover"
        :class="[
          immersive ? 'cursor-none [&_*]:!cursor-none' : '',
          sheetDragging || sheetSettling ? 'select-none' : '',
        ]"
        style="--lp-color: rgb(var(--s-cover))"
        @mouseenter="onPlayerMouseEnter"
        @mouseleave="onPlayerMouseLeave"
        @pointerdown="onSheetPointerDown"
        @pointermove="onSheetPointerMove"
        @pointerup="onSheetPointerUp"
        @pointercancel="onSheetPointerCancel"
      >
        <!-- 背景 -->
        <PlayerBackground />
        <!-- 全屏封面 -->
        <div v-if="fullscreenCover" class="absolute inset-y-0 left-0 w-[60%]">
          <PlayerCover fullscreen />
        </div>
        <!-- 底部频谱 -->
        <BottomSpectrum
          v-if="sheetOpen && settings.player.enableSpectrum"
          :show="isPlaying && immersive"
        />
        <!-- 顶/底栏渐变遮罩（全屏封面模式） -->
        <div
          v-if="fullscreenCover"
          class="cover-mask-top absolute top-0 inset-x-0 h-20 z-5 pointer-events-none transition-opacity duration-240 ease-[cubic-bezier(0.16,1,0.3,1)]"
          :class="immersive ? 'opacity-0' : 'opacity-100'"
        />
        <div
          v-if="fullscreenCover"
          class="cover-mask-bottom absolute bottom-0 inset-x-0 h-48 z-5 pointer-events-none transition-opacity duration-240 ease-[cubic-bezier(0.16,1,0.3,1)]"
          :class="immersive ? 'opacity-0' : 'opacity-100'"
        />
        <!-- 顶栏 -->
        <div
          class="absolute top-0 inset-x-0 h-14 z-10 app-drag-region transition-opacity duration-240 ease-[cubic-bezier(0.16,1,0.3,1)] flex items-center justify-between px-3"
          :class="immersive ? 'opacity-0 pointer-events-none' : 'opacity-100'"
          @mouseenter="onBarEnter"
          @mouseleave="onBarLeave"
        >
          <div class="app-no-drag flex items-center gap-2">
            <SButton type="cover" variant="ghost" circle :size="40" @click="toggleFullscreen">
              <template #icon>
                <IconLucideMinimize v-if="isFullscreen" />
                <IconLucideMaximize v-else />
              </template>
            </SButton>
          </div>
          <div class="app-no-drag flex items-center gap-3">
            <SButton type="cover" variant="ghost" circle :size="40" @click="collapse">
              <template #icon><IconLucideChevronDown /></template>
            </SButton>
            <WindowControls cover />
          </div>
        </div>
        <!-- 主区域 -->
        <div class="absolute top-14 inset-x-0 bottom-20" @mousemove="onMainMove">
          <!-- 左侧 -->
          <div
            v-if="!fullscreenCover"
            class="absolute inset-y-0 left-0 w-[45%] flex items-center justify-center px-12 transition-transform duration-320 ease-[cubic-bezier(0.32,0.72,0,1)]"
            :style="coverCentered ? 'transform: translateX(calc(100% * 11 / 18))' : undefined"
          >
            <div class="relative w-[clamp(200px,85%,50vh)] -translate-y-[11vh]">
              <Transition name="scale-switch" mode="out-in">
                <div :key="media.track?.id">
                  <PlayerCover />
                  <div class="absolute top-full left-0 w-full pt-6">
                    <PlayerData align="left" />
                  </div>
                </div>
              </Transition>
            </div>
          </div>
          <!-- 右侧 -->
          <div
            class="group absolute inset-y-0 right-0 pr-20 flex flex-col transition-opacity duration-280 ease-[cubic-bezier(0.16,1,0.3,1)]"
            :class="[
              fullscreenCover ? 'w-1/2' : 'w-[55%]',
              coverCentered || status.fullQueueOpen
                ? 'opacity-0 pointer-events-none'
                : 'opacity-100',
            ]"
          >
            <!-- 全屏封面 -->
            <div
              v-if="fullscreenCover"
              class="shrink-0 pt-2 pb-6 pl-[calc(1em-0.5rem)]"
              :style="{ fontSize: lyricFontSize }"
            >
              <PlayerData align="left" simple />
            </div>
            <!-- 歌词容器 -->
            <div
              class="lyric-area relative flex-1 min-h-0"
              :style="{
                fontSize: lyricFontSize,
                fontWeight: String(settings.lyric.fontWeight),
                fontFamily: settings.lyric.fontFamily || undefined,
                mixBlendMode: settings.lyric.lyricBlendMode,
              }"
            >
              <AMLLLyrics
                v-if="lyricMounted && hasLyric && settings.lyric.engine === 'amll'"
                ref="lyricRef"
                :lyric-lines="media.parsedLyric"
                :initial-time="initialLyricTimeMs"
                :playing="isPlaying"
                :align-position="settings.lyric.alignPosition"
                :word-fade-width="settings.lyric.wordFadeWidth"
                :hide-passed-lines="settings.lyric.hidePassedLines"
                :enable-blur="settings.lyric.enableBlur"
                :show-translation="settings.lyric.showTranslation"
                :show-line-romanization="settings.lyric.amllShowLineRomanization"
                :show-word-romanization="settings.lyric.amllShowWordRomanization"
                @seek="handleLyricSeek"
              >
                <template #bottom>
                  <div v-if="media.lyricAuthors.length > 0" class="lyric-credit-line">
                    <span class="lyric-credit-prefix">{{ $t("player.lyricCredit") }}</span>
                    <template v-for="(author, idx) in media.lyricAuthors" :key="author">
                      <span v-if="idx > 0" class="mx-1">,</span>
                      <span
                        class="lp-content lyric-credit"
                        @click.stop="openExternal(`https://github.com/${author}`)"
                      >
                        {{ "@" + author }}
                      </span>
                    </template>
                  </div>
                </template>
              </AMLLLyrics>
              <Lyrics
                v-else-if="lyricMounted && hasLyric"
                ref="lyricRef"
                :lyric-lines="media.parsedLyric"
                :initial-time="initialLyricTimeMs"
                :playing="isPlaying"
                :align-position="settings.lyric.alignPosition"
                :word-fade-width="settings.lyric.wordFadeWidth"
                :spring-config="springConfig"
                :inactive-alpha="settings.lyric.inactiveAlpha"
                :hide-passed-lines="settings.lyric.hidePassedLines"
                :enable-blur="settings.lyric.enableBlur"
                :enable-word-highlight="settings.lyric.enableWordHighlight"
                :enable-float-animation="settings.lyric.enableFloatAnimation"
                :enable-emphasize-effect="settings.lyric.enableEmphasizeEffect"
                :show-translation="settings.lyric.showTranslation"
                :show-romanization="settings.lyric.showRomanization"
                @seek="handleLyricSeek"
              >
                <template #bottom>
                  <div v-if="media.lyricAuthors.length > 0" class="lyric-credit-line">
                    <span class="lyric-credit-prefix">{{ $t("player.lyricCredit") }}</span>
                    <template v-for="(author, idx) in media.lyricAuthors" :key="author">
                      <span v-if="idx > 0" class="mx-1">,</span>
                      <span
                        class="lp-content lyric-credit"
                        @click.stop="openExternal(`https://github.com/${author}`)"
                      >
                        {{ "@" + author }}
                      </span>
                    </template>
                  </div>
                </template>
              </Lyrics>
              <div
                v-else-if="lyricMounted"
                class="w-full h-full flex items-center justify-center text-cover/30"
              >
                暂无歌词
              </div>
            </div>
            <!-- 歌词侧边工具栏 -->
            <LyricActions :immersive="immersive" />
          </div>
          <!-- 播放队列 -->
          <div
            class="absolute inset-y-0 right-0 pl-4 py-6 flex items-center"
            :class="[
              fullscreenCover ? 'w-1/2' : 'w-[55%]',
              status.fullQueueOpen ? '' : 'pointer-events-none',
            ]"
          >
            <Transition
              enter-active-class="transition-opacity duration-280 ease-[cubic-bezier(0.16,1,0.3,1)]"
              enter-from-class="opacity-0"
              leave-active-class="transition-opacity duration-280 ease-[cubic-bezier(0.16,1,0.3,1)]"
              leave-to-class="opacity-0"
            >
              <div v-if="status.fullQueueOpen" class="w-full h-full">
                <QueuePanel @close="status.fullQueueOpen = false" />
              </div>
            </Transition>
          </div>
        </div>
        <!-- 底栏 -->
        <div
          class="absolute bottom-0 inset-x-0 h-20 z-10 flex items-center gap-4 px-4 transition-opacity duration-240 ease-[cubic-bezier(0.16,1,0.3,1)]"
          :class="immersive ? 'opacity-0 pointer-events-none' : 'opacity-100'"
          @mouseenter="onBarEnter"
          @mouseleave="onBarLeave"
        >
          <div class="flex-1 min-w-0 flex items-center justify-start gap-2">
            <SButton
              type="cover"
              variant="ghost"
              size="large"
              circle
              :disabled="lyricToggleDisabled"
              :class="lyricToggleActive ? 'opacity-100' : 'opacity-40'"
              @click="toggleLyric"
            >
              <template #icon><IconLucideTextQuote /></template>
            </SButton>
            <SButton
              type="cover"
              variant="ghost"
              size="large"
              circle
              :disabled="!hasTrack"
              @click="fav.toggle(media.track)"
            >
              <template #icon>
                <SIconSwap :active="fav.isLiked(media.track)">
                  <template #on><IconFavorite /></template>
                  <template #off><IconFavoriteOutline /></template>
                </SIconSwap>
              </template>
            </SButton>
            <SButton
              type="cover"
              variant="ghost"
              size="large"
              circle
              :disabled="!hasTrack"
              @click="showComments"
            >
              <template #icon><IconLucideMessageCircle /></template>
            </SButton>
            <SButton
              v-if="media.track?.source === 'local' || media.track?.source === 'netease'"
              type="cover"
              variant="ghost"
              size="large"
              circle
              @click="media.track && openPicker([media.track])"
            >
              <template #icon><IconLucideListPlus /></template>
            </SButton>
            <SDropdownMenu
              v-if="canDownload"
              :items="downloadQualityItems"
              cover
              side="top"
              align="start"
              @select="onDownloadSelect"
            >
              <template #trigger>
                <SButton type="cover" variant="ghost" size="large" circle>
                  <template #icon><IconLucideDownload /></template>
                </SButton>
              </template>
            </SDropdownMenu>
          </div>
          <div class="shrink-0 flex flex-col items-center gap-1 w-[clamp(360px,35%,480px)]">
            <div class="flex items-center gap-3">
              <SButton
                type="cover"
                variant="ghost"
                circle
                @click="
                  fmMode
                    ? player.dislikeFmTrack()
                    : heartMode
                      ? player.exitHeartMode()
                      : player.toggleShuffleMode()
                "
              >
                <template #icon>
                  <IconLucideHeartOff v-if="fmMode" />
                  <IconSpHeartMode v-else-if="heartMode" />
                  <IconLucideShuffle v-else-if="shuffleMode === 'on'" />
                  <IconSpPlayOrder v-else />
                </template>
              </SButton>
              <SButton
                type="cover"
                variant="ghost"
                circle
                :disabled="!hasTrack || fmMode"
                @click="player.prevTrack()"
              >
                <template #icon><IconLucideSkipBack /></template>
              </SButton>
              <SButton
                type="cover"
                variant="secondary"
                size="large"
                circle
                :loading="isLoading"
                :disabled="!hasTrack && !isLoading"
                @click="player.togglePlay()"
              >
                <template #icon>
                  <SIconSwap :active="isPlaying">
                    <template #on><IconLucidePause /></template>
                    <template #off><IconLucidePlay /></template>
                  </SIconSwap>
                </template>
              </SButton>
              <SButton
                type="cover"
                variant="ghost"
                circle
                :disabled="!hasTrack"
                @click="player.nextTrack(true)"
              >
                <template #icon><IconLucideSkipForward /></template>
              </SButton>
              <SButton
                type="cover"
                variant="ghost"
                circle
                :disabled="fmMode"
                :class="fmMode || repeatMode === 'off' ? 'opacity-40' : 'opacity-100'"
                @click="player.cycleRepeatMode()"
              >
                <template #icon>
                  <IconLucideInfinity v-if="fmMode" />
                  <IconLucideRepeat1 v-else-if="repeatMode === 'one'" />
                  <IconLucideRepeat v-else />
                </template>
              </SButton>
            </div>
            <div class="flex items-center gap-2 w-full">
              <span
                class="text-xs text-cover/50 tabular-nums min-w-9 text-center cursor-pointer px-1.5 py-0.5 rounded-md transition-colors hover:bg-cover/10"
                @click="toggleTimeFormat"
              >
                {{ timeDisplay[0] }}
              </span>
              <SSlider
                :model-value="position"
                :min="0"
                :max="duration"
                :step="100"
                :always-show-thumb="false"
                cover
                class="flex-1"
                @drag-end="onSeekDragEnd"
              />
              <span
                class="text-xs text-cover/50 tabular-nums min-w-9 text-center cursor-pointer px-1.5 py-0.5 rounded-md transition-colors hover:bg-cover/10"
                @click="toggleTimeFormat"
              >
                {{ timeDisplay[1] }}
              </span>
            </div>
          </div>
          <div class="flex-1 min-w-0 flex items-center justify-end">
            <Toolbar cover />
          </div>
        </div>
      </div>
    </Transition>
    <PlaylistPickerDialog v-model:open="pickerOpen" :mode="pickerMode" :tracks="pickerTracks" />
  </Teleport>
</template>

<style scoped>
.lyric-area {
  filter: drop-shadow(0px 4px 6px rgba(0, 0, 0, 0.2));
  mask: linear-gradient(
    180deg,
    hsla(0, 0%, 100%, 0) 0,
    hsla(0, 0%, 100%, 0.6) 5%,
    #fff 10%,
    #fff 75%,
    hsla(0, 0%, 100%, 0.6) 85%,
    hsla(0, 0%, 100%, 0)
  );
}

/* 顶部/底部遮罩：多段非线性 alpha，避免暗色渐变出色阶 */
.cover-mask-top {
  background-image: linear-gradient(
    to bottom,
    rgba(0, 0, 0, 0.5) 0%,
    rgba(0, 0, 0, 0.44) 12%,
    rgba(0, 0, 0, 0.36) 25%,
    rgba(0, 0, 0, 0.27) 40%,
    rgba(0, 0, 0, 0.18) 55%,
    rgba(0, 0, 0, 0.1) 70%,
    rgba(0, 0, 0, 0.04) 85%,
    rgba(0, 0, 0, 0) 100%
  );
}

.cover-mask-bottom {
  background-image: linear-gradient(
    to top,
    rgba(0, 0, 0, 0.5) 0%,
    rgba(0, 0, 0, 0.44) 12%,
    rgba(0, 0, 0, 0.36) 25%,
    rgba(0, 0, 0, 0.27) 40%,
    rgba(0, 0, 0, 0.18) 55%,
    rgba(0, 0, 0, 0.1) 70%,
    rgba(0, 0, 0, 0.04) 85%,
    rgba(0, 0, 0, 0) 100%
  );
}

.lyric-credit-line {
  font-size: max(0.5em, 10px);
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-start;
  text-align: left;
  width: 100%;
}

.lyric-credit {
  margin-left: 0.5em;
}
</style>
