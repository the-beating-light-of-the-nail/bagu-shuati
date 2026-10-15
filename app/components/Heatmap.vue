<script setup lang="ts">
import type { StudyLog } from '#shared/bank-types'
import { pad2, todayStr } from '#shared/date'

/** 近 16 周刷题热力图：按刷题流水里的真实日期聚合 */
const props = defineProps<{ logs: StudyLog[]; todayCount: number }>()

const colors = ['bg-[#F1F1EF]', 'bg-[#D3E5EF]', 'bg-[#7FB8E6]', 'bg-[#2383E2]']
const weeks = 16

const columns = computed(() => {
  const dayCount: Record<string, number> = {}
  for (const log of props.logs) {
    const day = (log.time || '').slice(0, 10)
    if (day) dayCount[day] = (dayCount[day] || 0) + 1
  }
  const todayKey = todayStr()
  dayCount[todayKey] = Math.max(dayCount[todayKey] || 0, props.todayCount)

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const start = new Date(today)
  start.setDate(start.getDate() - (weeks * 7 - 1) - today.getDay())

  const cols: { key: string; count: number; level: number }[][] = []
  for (let w = 0; w < weeks; w++) {
    const cells: { key: string; count: number; level: number }[] = []
    for (let d = 0; d < 7; d++) {
      const cellDate = new Date(start)
      cellDate.setDate(start.getDate() + w * 7 + d)
      const key = `${cellDate.getFullYear()}-${pad2(cellDate.getMonth() + 1)}-${pad2(cellDate.getDate())}`
      const count = dayCount[key] || 0
      const future = cellDate > today
      const level = future || count === 0 ? 0 : count <= 2 ? 1 : count <= 5 ? 2 : 3
      cells.push({ key, count, level })
    }
    cols.push(cells)
  }
  return cols
})
</script>

<template>
  <div class="flex gap-1.5 overflow-x-auto py-1">
    <div v-for="(col, ci) in columns" :key="ci" class="flex flex-col gap-1.5 shrink-0">
      <div
        v-for="cell in col"
        :key="cell.key"
        :class="['w-3.5 h-3.5 rounded-[3px] border border-black/5', colors[cell.level]]"
        :title="`${cell.key}：刷题 ${cell.count} 次`"
      />
    </div>
  </div>
</template>
