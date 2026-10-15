<script setup lang="ts">
const props = defineProps<{ difficulty: string }>()
const cls = computed(() => {
  if (props.difficulty === '简单') return 'bg-notion-greenBg text-notion-green'
  if (props.difficulty === '中等') return 'bg-notion-blueBg text-notion-blue'
  return 'bg-notion-redBg text-notion-red'
})
</script>

<template>
  <span :class="['px-2 py-0.5 rounded text-[11px] font-medium', cls]">{{ difficulty }}</span>
</template>
