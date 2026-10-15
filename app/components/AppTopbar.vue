<script setup lang="ts">
defineProps<{ view: 'workbench' | 'database' }>()
const emit = defineEmits<{ 'toggle-sidebar': []; 'open-preset': []; 'daily-review': [] }>()

/** 待刷数量由页面计算后写进这个共享状态 */
const dueCount = useState<number>('due-count', () => 0)
</script>

<template>
  <header class="h-12 border-b border-notion-border px-3 md:px-6 flex items-center justify-between shrink-0 bg-white/95 backdrop-blur z-20">
    <div class="flex items-center gap-2 min-w-0">
      <button class="md:hidden p-1.5 rounded-md hover:bg-notion-hover text-notion-text" @click="emit('toggle-sidebar')">☰</button>
      <nav class="flex items-center gap-1.5 text-xs md:text-sm truncate">
        <span class="text-notion-muted hidden sm:inline">AI 八股刷题工作台</span>
        <span class="text-notion-muted hidden sm:inline">/</span>
        <span class="font-medium text-notion-text truncate flex items-center gap-1.5">
          <span>{{ view === 'workbench' ? '🏠' : '🗂️' }}</span>
          <span>{{ view === 'workbench' ? '今日工作台与分析' : '题库路线与记忆库 (Database)' }}</span>
        </span>
      </nav>
    </div>

    <div class="flex items-center gap-2">
      <button
        class="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-notion-blueBg text-notion-blue hover:opacity-90 transition"
        @click="emit('open-preset')"
      >
        ⚡ <span>智能组卷</span>
      </button>
      <button
        class="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-notion-orangeBg text-notion-orange hover:opacity-90 transition"
        @click="emit('daily-review')"
      >
        🔥 <span>今日待刷 <strong class="font-mono">{{ dueCount }}</strong></span>
      </button>
    </div>
  </header>
</template>
