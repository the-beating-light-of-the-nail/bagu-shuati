<script setup lang="ts">
import type { QuestionState, Topic } from '#shared/bank-types'

/** 待刷清单浮条：跨题库自由组合后的快捷开刷入口 */
const props = defineProps<{ questions: QuestionState[]; selected: string[]; visible: boolean }>()
const emit = defineEmits<{ start: []; clear: [] }>()

const breakdown = computed(() => {
  const chosen = props.questions.filter(q => props.selected.includes(q.id))
  if (!chosen.length) return '跨题库自由组合'
  const counts = new Map<string, number>()
  for (const q of chosen) counts.set(q.topicName, (counts.get(q.topicName) || 0) + 1)
  const parts = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([name, n]) => `${name} ${n} 题`)
  return parts.join(' · ') + (counts.size > 3 ? ` 等 ${counts.size} 个专题` : '')
})
</script>

<template>
  <div
    v-if="visible && selected.length"
    class="fixed bottom-16 md:bottom-5 left-1/2 -translate-x-1/2 z-30 w-[92%] max-w-xl bg-notion-text text-white px-4 py-2.5 rounded-xl shadow-xl border border-white/10 flex items-center justify-between gap-3 animate-notion-in"
  >
    <div class="flex items-center gap-2.5 min-w-0">
      <span class="w-6 h-6 rounded-md bg-notion-blue text-white text-xs font-bold font-mono flex items-center justify-center shrink-0">{{ selected.length }}</span>
      <div class="truncate">
        <div class="text-xs font-medium truncate">待刷清单 (Inbox) 已就绪</div>
        <div class="text-[10px] text-gray-300 truncate">{{ breakdown }}</div>
      </div>
    </div>
    <div class="flex items-center gap-2 shrink-0">
      <button class="px-2.5 py-1 rounded text-xs text-gray-300 hover:text-white hover:bg-white/10 transition" @click="emit('clear')">清空</button>
      <button class="px-3.5 py-1.5 rounded-md text-xs font-semibold bg-notion-blue hover:bg-[#1B6EC2] text-white transition" @click="emit('start')">⚡ 拉起沉浸式刷题</button>
    </div>
  </div>
</template>
