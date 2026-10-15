<script setup lang="ts">
/** 四档艾宾浩斯评分按钮：刷题层底部与单题页共用 */
defineProps<{ compact?: boolean }>()
const emit = defineEmits<{ rate: [rating: string] }>()

const options = [
  { key: 'forgot', label: '1 · 忘记了', sub: '10分钟重刷 · 留存35%', cls: 'bg-notion-redBg/70 hover:bg-notion-redBg', text: 'text-notion-red' },
  { key: 'hard', label: '2 · 印象模糊', sub: '1天后复习 · 留存65%', cls: 'bg-notion-orangeBg/70 hover:bg-notion-orangeBg', text: 'text-notion-orange' },
  { key: 'good', label: '3 · 比较熟悉', sub: '3天后复习 · 留存86%', cls: 'bg-notion-blueBg/70 hover:bg-notion-blueBg', text: 'text-notion-blue' },
  { key: 'easy', label: '4 · 完全掌握', sub: '7天后复习 · 留存98%', cls: 'bg-notion-greenBg/70 hover:bg-notion-greenBg', text: 'text-notion-green' },
]
</script>

<template>
  <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
    <button
      v-for="opt in options"
      :key="opt.key"
      type="button"
      :class="['p-2.5 rounded-lg border border-notion-border text-left transition', opt.cls]"
      @click="emit('rate', opt.key)"
    >
      <div class="flex items-center justify-between">
        <span :class="['text-xs font-bold', opt.text]">{{ opt.label }}</span>
        <kbd v-if="!compact" class="hidden sm:inline">{{ opt.key === 'forgot' ? 1 : opt.key === 'hard' ? 2 : opt.key === 'good' ? 3 : 4 }}</kbd>
      </div>
      <div class="text-[10px] text-notion-muted mt-0.5">{{ opt.sub }}</div>
    </button>
  </div>
</template>
