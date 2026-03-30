<script setup lang="ts">
import { useSettingsDialog } from "@/settings/useSettingsDialog";

const router = useRouter();
const { show: showSettings } = useSettingsDialog();
</script>

<template>
  <div class="flex items-center gap-3 flex-1">
    <!-- 前进后退 -->
    <SButton variant="tertiary" circle ripple :size="40" @click="router.back()">
      <template #icon><IconLucideChevronLeft /></template>
    </SButton>
    <SButton variant="tertiary" circle ripple :size="40" @click="router.forward()">
      <template #icon><IconLucideChevronRight /></template>
    </SButton>
    <!-- 设置 -->
    <SButton
      variant="tertiary"
      circle
      ripple
      :size="40"
      class="ml-auto"
      @click="showSettings()"
    >
      <template #icon><IconLucideSettings /></template>
    </SButton>
  </div>
</template>
