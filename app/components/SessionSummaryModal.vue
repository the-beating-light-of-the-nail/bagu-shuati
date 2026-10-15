<script setup lang="ts">
const { showSummary, completed, mastered, queue } = useStudySession()
const { bank } = useBank()
const srs = useSrsStore()
const { show } = useToast()

/** 全库平均留存：题库尚未懒加载时显示占位 */
const avgRetention = computed(() => {
  const qs = bank.value?.questions
  if (!qs?.length) return null
  const sum = qs.reduce((acc, q) => acc + srs.entryOf(q.id).retention, 0)
  return Math.round(sum / qs.length)
})
</script>

<template>
  <div v-if="showSummary" class="fixed inset-0 bg-black/30 backdrop-blur-[1px] z-50 flex items-center justify-center p-4">
    <div class="bg-white border border-notion-border rounded-xl max-w-md w-full p-6 space-y-5 shadow-xl animate-notion-in">
      <div class="flex items-start justify-between">
        <div class="space-y-1">
          <div class="text-3xl">🎉</div>
          <h3 class="text-lg font-bold text-notion-text">本轮沉浸式刷题完成！</h3>
          <p class="text-xs text-notion-muted">所有题目的累计刷题次数、刷完时间与艾宾浩斯留存率已实时同步。</p>
        </div>
        <button class="p-1 rounded hover:bg-notion-hover text-notion-muted" @click="showSummary = false">✕</button>
      </div>

      <div class="grid grid-cols-3 gap-2.5 text-center">
        <div class="notion-callout p-3">
          <div class="text-lg font-bold font-mono text-notion-text">{{ completed || queue.length }}</div>
          <div class="text-[11px] text-notion-muted">本轮完成题数</div>
        </div>
        <div class="notion-callout p-3">
          <div class="text-lg font-bold font-mono text-notion-green">{{ mastered }}</div>
          <div class="text-[11px] text-notion-muted">熟悉/完全掌握</div>
        </div>
        <div class="notion-callout p-3">
          <div class="text-lg font-bold font-mono text-notion-blue">{{ avgRetention === null ? '—' : avgRetention + '%' }}</div>
          <div class="text-[11px] text-notion-muted">全库平均留存</div>
        </div>
      </div>

      <div class="flex flex-col sm:flex-row gap-2 pt-2">
        <button
          class="flex-1 py-2 px-3 rounded-md text-xs font-medium bg-notion-sidebar border border-notion-border hover:bg-notion-hover text-notion-text transition"
          @click="showSummary = false; show('完整刷题流水与图表请在工作台查看')"
        >
          查看刷题流水与曲线记录
        </button>
        <button
          class="flex-1 py-2 px-3 rounded-md text-xs font-medium bg-notion-blue text-white hover:bg-[#1B6EC2] transition"
          @click="showSummary = false"
        >
          返回今日工作台
        </button>
      </div>
    </div>
  </div>
</template>
