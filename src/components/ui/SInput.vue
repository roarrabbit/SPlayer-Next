<script setup lang="ts">
export interface SInputProps {
  modelValue?: string;
  placeholder?: string;
  disabled?: boolean;
  clearable?: boolean;
  type?: string;
}

const props = withDefaults(defineProps<SInputProps>(), {
  modelValue: "",
  placeholder: "",
  disabled: false,
  clearable: false,
  type: "text",
});

const emit = defineEmits<{
  "update:modelValue": [value: string];
  focus: [];
  blur: [];
}>();

const isFocused = ref(false);
const showClear = computed(() => props.clearable && props.modelValue.length > 0 && !props.disabled);

const handleClear = () => {
  emit("update:modelValue", "");
};
</script>

<template>
  <div
    class="flex w-full items-center gap-2 h-8.5 px-3 text-sm text-on-surface bg-surface-bright/40 border border-solid rounded-lg transition-[border-color,box-shadow] duration-250"
    :class="[
      isFocused
        ? 'border-primary shadow-[0_0_0_2px_rgb(var(--s-primary)/0.25)]'
        : 'border-outline-variant/50 hover:border-on-surface/30',
      disabled ? 'opacity-50 cursor-not-allowed' : '',
    ]"
  >
    <!-- 前置插槽 -->
    <slot name="prefix" />

    <input
      :value="modelValue"
      :type="type"
      :placeholder="placeholder"
      :disabled="disabled"
      class="flex-1 min-w-0 bg-transparent outline-none border-none shadow-none text-on-surface placeholder:text-on-surface-variant/40 disabled:cursor-not-allowed"
      @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      @focus="isFocused = true; emit('focus')"
      @blur="isFocused = false; emit('blur')"
    />

    <!-- 清空按钮 -->
    <Transition name="fade">
      <IconLucideX
        v-if="showClear"
        class="size-3.5 text-on-surface-variant/50 shrink-0 cursor-pointer transition-colors duration-200 hover:text-on-surface"
        @click="handleClear"
      />
    </Transition>

    <!-- 后置插槽 -->
    <slot name="suffix" />
  </div>
</template>
