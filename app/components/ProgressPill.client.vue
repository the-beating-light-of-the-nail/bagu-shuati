<script setup lang="ts">
/** 单题进度胶囊：只在客户端渲染，避免预渲染 HTML 里出现个人进度（泄露 + hydration mismatch） */
const props = defineProps<{ id: string }>()
const srs = useSrsStore()
const entry = computed(() => srs.entryOf(props.id))
</script>

<template>
  <span :class="['px-2 py-0.5 rounded text-[11px] font-medium', entry.reviewCount ? 'bg-notion-greenBg text-notion-green' : 'bg-notion-sidebar text-notion-muted border border-notion-border']">
    {{ entry.reviewCount ? `已刷 ${entry.reviewCount} 次 · 留存 ${entry.retention}%` : '尚未刷过' }}
  </span>
</template>
