<script setup lang="ts">
import type { ChartConfiguration } from 'chart.js'
import type { QuestionState, Route, Topic } from '#shared/bank-types'
import { getAllDueQuestions, getCappedDueQuestions, getStreakDays, masteredPct, questionsOfRoute, questionsOfTopic } from '#shared/srs-math'

const props = defineProps<{ questions: QuestionState[]; topics: Topic[]; routes: Route[] }>()
const emit = defineEmits<{
  'daily-review': []
  'open-preset': []
  'study-one': [string]
  'study-route': [string]
  'study-weakness': []
  'go-database': []
}>()

const srs = useSrsStore()
const dueCount = useState<number>('due-count', () => 0)

const allDue = computed(() => getAllDueQuestions(props.questions))
const cappedDue = computed(() => getCappedDueQuestions(props.questions, srs.dailyCap))
const deferred = computed(() => Math.max(0, allDue.value.length - cappedDue.value.length))

watchEffect(() => { dueCount.value = cappedDue.value.length })

const totalReviews = computed(() => props.questions.reduce((acc, q) => acc + q.reviewCount, 0))
const coveredCount = computed(() => props.questions.filter(q => q.reviewCount > 0).length)
const avgRetention = computed(() => {
  if (!props.questions.length) return 0
  return Math.round(props.questions.reduce((acc, q) => acc + q.retention, 0) / props.questions.length)
})
const unseenCount = computed(() => props.questions.filter(q => q.reviewCount === 0).length)
const streak = computed(() => getStreakDays(srs.logs, srs.today))

const weakTopics = computed(() => props.topics
  .map(t => {
    const list = questionsOfTopic(props.questions, t.id)
    const avg = list.length ? Math.round(list.reduce((s, q) => s + q.retention, 0) / list.length) : 0
    return { topic: t, avg, total: list.length }
  })
  .sort((a, b) => a.avg - b.avg)
  .slice(0, 3))

const topTopics = computed(() => props.topics
  .map(t => ({ topic: t, total: questionsOfTopic(props.questions, t.id).length }))
  .sort((a, b) => b.total - a.total)
  .slice(0, 3))

const ebbinghausConfig = computed<ChartConfiguration>(() => ({
  type: 'line',
  data: {
    labels: ['刚刷完', '20分钟', '1小时', '9小时', '1天后', '2天后', '6天后', '31天后'],
    datasets: [
      { label: '4次+间隔复习 (稳固记忆)', data: [100, 99, 97, 95, 93, 91, 88, 84], borderColor: '#448361', tension: 0.35, borderWidth: 2 },
      { label: '2~3次强化复习', data: [100, 94, 88, 83, 78, 73, 66, 55], borderColor: '#2383E2', tension: 0.35, borderWidth: 2 },
      {
        label: '首次刷完不复习 (快速遗忘)',
        data: [100, 58, 44, 36, 33, 28, 25, 21],
        borderColor: '#D44C47',
        backgroundColor: 'rgba(212, 76, 71, 0.06)',
        tension: 0.35,
        borderWidth: 2,
        fill: true,
      },
      { label: '75% 复习触发线', data: [75, 75, 75, 75, 75, 75, 75, 75], borderColor: '#D9730D', borderDash: [5, 4], borderWidth: 1.5, pointRadius: 0 },
    ],
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } } },
    scales: {
      y: { min: 0, max: 100, ticks: { callback: v => `${v}%`, font: { size: 10 } }, grid: { color: '#F1F1EF' } },
      x: { ticks: { font: { size: 10 } }, grid: { display: false } },
    },
  },
}))

/** 取题量最大的 6 个专题作为雷达维度 */
const radarConfig = computed<ChartConfiguration>(() => {
  const dimTopics = [...props.topics].sort((a, b) => b.questionCount - a.questionCount).slice(0, 6)
  return {
    type: 'radar',
    data: {
      labels: dimTopics.map(t => t.name),
      datasets: [{
        label: '掌握度 (%)',
        data: dimTopics.map(t => {
          const qs = questionsOfTopic(props.questions, t.id)
          if (!qs.length) return 0
          return Math.round(qs.reduce((s, q) => s + q.retention, 0) / qs.length)
        }),
        backgroundColor: 'rgba(35, 131, 226, 0.16)',
        borderColor: '#2383E2',
        pointBackgroundColor: '#2383E2',
        borderWidth: 2,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: { r: { min: 0, max: 100, ticks: { display: false }, pointLabels: { font: { size: 11 } } } },
      plugins: { legend: { display: false } },
    },
  }
})
</script>

<template>
  <section class="max-w-6xl mx-auto px-4 sm:px-8 pt-6 md:pt-9 space-y-8 animate-notion-in">
    <div class="flex flex-col md:flex-row md:items-end justify-between gap-4">
      <div class="space-y-1.5">
        <div class="text-4xl select-none">🧠</div>
        <h1 class="text-2xl md:text-3xl font-bold tracking-tight text-notion-text">今日抗遗忘工作台 &amp; 能力全景分析</h1>
        <p class="text-xs md:text-sm text-notion-muted">
          将「今日复习任务」、「岗位路线进度」与「专题掌握度分析」聚合一屏，告别繁琐跳转，打开即刷。
        </p>
      </div>
      <div class="flex items-center gap-2 bg-notion-sidebar px-3 py-2 rounded-lg border border-notion-border self-start md:self-auto">
        <span class="text-xs text-notion-muted">防雪崩每日复习上限:</span>
        <select
          :value="srs.dailyCap"
          class="text-xs font-semibold bg-white border border-notion-border rounded px-2 py-1 text-notion-text focus:outline-none"
          @change="srs.setDailyCap(Number(($event.target as HTMLSelectElement).value))"
        >
          <option :value="5">5 题 / 天 (轻松模式)</option>
          <option :value="8">8 题 / 天 (标准节奏)</option>
          <option :value="12">12 题 / 天 (冲刺模式)</option>
          <option :value="99">不设上限 (全量展示)</option>
        </select>
      </div>
    </div>

    <div class="notion-callout p-4 md:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-5 border-l-4 border-l-notion-blue">
      <div class="space-y-2.5 flex-1">
        <div class="flex flex-wrap items-center gap-2">
          <span class="text-lg">⏰</span>
          <h2 class="text-base font-bold text-notion-text">今日艾宾浩斯抗遗忘队列</h2>
          <span class="text-xs px-2 py-0.5 rounded-full bg-notion-orangeBg text-notion-orange font-semibold">今日精选 {{ cappedDue.length }} 题</span>
          <span v-if="deferred > 0" class="text-xs px-2 py-0.5 rounded-full bg-notion-greenBg text-notion-green font-medium">
            🛡️ 已触发防雪崩熔断：其余 {{ deferred }} 题平滑顺延
          </span>
        </div>
        <p class="text-xs md:text-sm text-notion-muted leading-relaxed">
          <template v-if="deferred > 0">
            检测到共有 <strong>{{ allDue.length }}</strong> 道题的记忆留存率低于 75%。为避免复习堆积焦虑，系统已按「遗忘紧急度 × 首刷盲区」为您锁定最急需巩固的 <strong>{{ cappedDue.length }}</strong> 道题。
          </template>
          <template v-else>
            当前共有 <strong>{{ allDue.length }}</strong> 道题的记忆留存率衰减至 75% 临界点以下，立即完成复习可将记忆周期延长 3~7 倍。
          </template>
        </p>
        <div class="flex flex-wrap gap-1.5 pt-1">
          <button
            v-for="q in cappedDue"
            :key="q.id"
            class="px-2.5 py-1 rounded-md text-xs bg-white border border-notion-border text-notion-text hover:bg-notion-hover transition truncate max-w-[230px] flex items-center gap-1.5"
            @click="emit('study-one', q.id)"
          >
            <span class="truncate">{{ q.title }}</span>
            <span class="text-notion-red font-mono font-semibold shrink-0">{{ q.retention }}%</span>
          </button>
          <span v-if="!cappedDue.length" class="text-xs text-notion-green font-medium">
            🎉 今日抗遗忘队列已全部清空！您可以使用智能抽题继续拓展新题。
          </span>
        </div>
      </div>

      <div class="flex flex-col sm:flex-row lg:flex-col gap-2 shrink-0">
        <button
          class="px-5 py-2.5 rounded-lg text-xs md:text-sm font-semibold bg-notion-blue text-white hover:bg-[#1B6EC2] transition shadow-sm"
          @click="emit('daily-review')"
        >
          ⚡ 开始今日复习 ({{ cappedDue.length }} 题)
        </button>
        <button
          class="px-4 py-2 rounded-lg text-xs font-medium bg-white border border-notion-border text-notion-text hover:bg-notion-hover transition"
          @click="emit('open-preset')"
        >
          ⚡ 按条件智能抽题组卷
        </button>
      </div>
    </div>

    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
      <div class="notion-card p-4 space-y-1">
        <div class="flex items-center justify-between text-xs text-notion-muted"><span>今日已完成刷题</span><span class="text-base">🔥</span></div>
        <div class="text-2xl font-bold text-notion-text font-mono">{{ srs.today }}</div>
        <div class="text-[11px] text-notion-green">{{ streak > 0 ? `连续打卡第 ${streak} 天 · 保持节奏` : '今天还没有刷题记录，先开一局吧' }}</div>
      </div>
      <button class="notion-card notion-card-hover p-4 space-y-1 text-left" @click="filters.setTab('due'); emit('go-database')">
        <div class="flex items-center justify-between text-xs text-notion-muted"><span>今日待刷 / 总衰减题数</span><span class="text-base">⏳</span></div>
        <div class="text-2xl font-bold text-notion-orange font-mono">{{ cappedDue.length }} / {{ allDue.length }}</div>
        <div class="text-[11px] text-notion-muted">{{ deferred > 0 ? `防雪崩已顺延 ${deferred} 题至明日` : '全部待复习题均在今日上限内' }}</div>
      </button>
      <button class="notion-card notion-card-hover p-4 space-y-1 text-left" @click="filters.setTab('logs'); emit('go-database')">
        <div class="flex items-center justify-between text-xs text-notion-muted"><span>累计刷题总次数</span><span class="text-base">📚</span></div>
        <div class="text-2xl font-bold text-notion-text font-mono">{{ totalReviews }}</div>
        <div class="text-[11px] text-notion-muted">已覆盖 {{ coveredCount }}/{{ questions.length }} 道面试题</div>
      </button>
      <div class="notion-card p-4 space-y-1">
        <div class="flex items-center justify-between text-xs text-notion-muted"><span>全库平均记忆留存率</span><span class="text-base">📈</span></div>
        <div class="text-2xl font-bold text-notion-blue font-mono">{{ avgRetention }}%</div>
        <div class="text-[11px] text-notion-muted">基于艾宾浩斯衰减模型估算</div>
      </div>
    </div>

    <div class="space-y-3">
      <div class="flex items-center justify-between border-b border-notion-border pb-2">
        <div class="flex items-center gap-2">
          <span class="text-lg">🗺️</span>
          <h2 class="text-base font-semibold text-notion-text">岗位刷题路线与专题题库直达</h2>
        </div>
        <button class="text-xs text-notion-blue hover:underline" @click="filters.setTab('all'); emit('go-database')">进入题库与记忆库自由选题 →</button>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div v-for="route in routes" :key="route.id" class="notion-card notion-card-hover p-4 flex flex-col justify-between space-y-3.5">
          <div class="space-y-1.5">
            <div class="flex items-center justify-between gap-2">
              <span class="px-2 py-0.5 rounded text-xs font-semibold bg-notion-sidebar text-notion-text border border-notion-border truncate">{{ route.icon }} {{ route.name }}</span>
              <span class="text-xs font-mono text-notion-muted shrink-0">{{ questionsOfRoute(questions, route).filter(q => q.retention >= 75).length }}/{{ questionsOfRoute(questions, route).length }}</span>
            </div>
            <p class="text-xs text-notion-muted line-clamp-2">{{ route.desc }}</p>
          </div>
          <div class="space-y-2.5">
            <div class="space-y-1">
              <div class="flex justify-between text-[11px] text-notion-muted">
                <span>路线掌握率</span>
                <span class="font-mono font-semibold text-notion-text">{{ masteredPct(questionsOfRoute(questions, route)) }}%</span>
              </div>
              <div class="w-full h-1.5 bg-notion-sidebar rounded-full overflow-hidden border border-notion-border">
                <div class="h-full bg-notion-blue" :style="`width: ${masteredPct(questionsOfRoute(questions, route))}%`" />
              </div>
            </div>
            <div class="flex items-center gap-2">
              <button class="flex-1 py-1.5 px-2.5 rounded text-xs font-medium bg-notion-text text-white hover:bg-black transition" @click="emit('study-route', route.id)">
                沉浸刷此路线
              </button>
              <button class="py-1.5 px-2.5 rounded text-xs font-medium bg-notion-sidebar border border-notion-border hover:bg-notion-hover transition" @click="filters.filterByRoute(route.id); emit('go-database')">
                查看题单
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="space-y-4 pt-2">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-notion-border pb-2">
        <div class="flex items-center gap-2">
          <span class="text-lg">📊</span>
          <h2 class="text-base font-semibold text-notion-text">艾宾浩斯遗忘曲线 &amp; 专题能力诊断</h2>
        </div>
        <button class="text-xs px-3 py-1 rounded-md bg-notion-purpleBg text-notion-purple font-medium hover:opacity-90 transition self-start sm:self-auto" @click="emit('study-weakness')">
          🎯 一键特训薄弱与未刷盲区
        </button>
      </div>

      <div class="notion-callout p-4 text-xs md:text-sm text-notion-text leading-relaxed space-y-1.5">
        <div class="font-semibold text-notion-text">🤖 实时记忆诊断报告：</div>
        <p>
          • <strong>最薄弱专题</strong>：
          <template v-for="(x, i) in weakTopics" :key="x.topic.id">
            <code>{{ x.topic.name }}</code> 平均留存 <strong>{{ x.avg }}%</strong>（{{ x.total }} 题）<span v-if="i < weakTopics.length - 1"> · </span>
          </template>
        </p>
        <p>
          • <strong>题量最大的专题</strong>：
          <template v-for="(x, i) in topTopics" :key="x.topic.id">
            <code>{{ x.topic.name }}</code> {{ x.total }} 题<span v-if="i < topTopics.length - 1"> · </span>
          </template>
        </p>
        <p>
          • <strong>行动建议</strong>：全库 {{ questions.length }} 题中已覆盖 <strong>{{ coveredCount }}</strong> 题，还有
          <strong>{{ unseenCount }} 道盲区新题</strong>。建议先完成今日 {{ cappedDue.length }} 道抗遗忘复习，再点右上角「一键特训薄弱与未刷盲区」扫盲。
        </p>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div class="notion-card p-4 md:p-5 space-y-2">
          <div class="flex items-center justify-between">
            <h3 class="text-xs md:text-sm font-semibold text-notion-text">📉 艾宾浩斯衰减曲线 vs 间隔重复强化</h3>
            <span class="text-[11px] text-notion-orange font-mono">75% 复习警戒线</span>
          </div>
          <ClientOnly><ChartCanvas :config="ebbinghausConfig" height="14rem" /></ClientOnly>
        </div>

        <div class="notion-card p-4 md:p-5 space-y-2">
          <div class="flex items-center justify-between">
            <h3 class="text-xs md:text-sm font-semibold text-notion-text">🕸️ 六大专题记忆留存掌握度雷达</h3>
            <span class="text-[11px] text-notion-muted">随每次刷题评分动态演进</span>
          </div>
          <ClientOnly><ChartCanvas :config="radarConfig" height="14rem" /></ClientOnly>
        </div>
      </div>

      <div class="notion-card p-4 md:p-5 space-y-3">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 class="text-xs md:text-sm font-semibold text-notion-text">🟩 近 16 周沉浸刷题记忆热力图</h3>
            <p class="text-[11px] text-notion-muted">每次在全屏沉浸层完成评分后，今日热力格与刷题次数将实时点亮</p>
          </div>
          <div class="flex items-center gap-1.5 text-[11px] text-notion-muted">
            <span>少</span>
            <span class="w-3 h-3 rounded-sm bg-[#F1F1EF] border border-notion-border" />
            <span class="w-3 h-3 rounded-sm bg-[#D3E5EF]" />
            <span class="w-3 h-3 rounded-sm bg-[#7FB8E6]" />
            <span class="w-3 h-3 rounded-sm bg-[#2383E2]" />
            <span>多</span>
          </div>
        </div>
        <Heatmap :logs="srs.logs" :today-count="srs.today" />
      </div>
    </div>
  </section>
</template>
