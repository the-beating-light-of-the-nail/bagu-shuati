<script setup lang="ts">
import type { ChartConfiguration } from 'chart.js'

/**
 * Chart.js 薄封装：沿用旧版已验证的 imperative 配置对象，
 * 只负责实例化 / 更新 / 销毁（Chart.js 触碰 canvas，必须放在 <ClientOnly> 内）。
 */
const props = defineProps<{ config: ChartConfiguration; height?: string }>()

const el = ref<HTMLCanvasElement | null>(null)
let chart: { data: unknown; options: unknown; update: () => void; destroy: () => void } | null = null

onMounted(async () => {
  const { Chart, registerables } = await import('chart.js')
  Chart.register(...registerables)
  if (el.value) {
    chart = new Chart(el.value, props.config) as unknown as typeof chart
  }
})

watch(() => props.config, (cfg) => {
  if (!chart) return
  chart.data = cfg.data
  chart.options = cfg.options
  chart.update()
}, { deep: true })

onUnmounted(() => {
  chart?.destroy()
  chart = null
})
</script>

<template>
  <div :style="{ height: height || '14rem' }" class="w-full">
    <canvas ref="el" />
  </div>
</template>
