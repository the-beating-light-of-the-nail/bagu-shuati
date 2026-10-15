<script setup lang="ts">
const props = defineProps<{ retention: number }>()
const colorClass = computed(() => (props.retention < 55 ? 'bg-notion-red' : props.retention < 75 ? 'bg-notion-orange' : 'bg-notion-green'))
const textClass = computed(() => (props.retention < 55 ? 'text-notion-red' : props.retention < 75 ? 'text-notion-orange' : 'text-notion-green'))
</script>

<template>
  <div class="flex items-center gap-2">
    <div class="w-16 h-1.5 bg-notion-sidebar rounded-full overflow-hidden border border-notion-border">
      <div :class="['h-full', colorClass]" :style="`width: ${retention}%`" />
    </div>
    <span :class="['font-mono font-semibold', textClass]">{{ retention }}%</span>
  </div>
</template>
