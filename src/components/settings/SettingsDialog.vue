<script setup lang="ts">
import { useSettingsDialog } from "@/settings/useSettingsDialog";

const { open } = useSettingsDialog();
</script>

<template>
  <SDialog v-model:open="open" width="min(1024px, calc(100vw - 40px))" height="75vh">
    <SettingsContent class="h-full" />
  </SDialog>
</template>
