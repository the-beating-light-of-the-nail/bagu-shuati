<script setup lang="ts">
const props = defineProps<{ name: string; icon?: string; tone?: string }>()
const cls = computed(() => toneClass(props.tone))
</script>

<template>
  <span :class="['px-2 py-0.5 rounded text-[11px] font-medium', cls]">{{ icon || '📄' }} {{ name }}</span>
</template>
