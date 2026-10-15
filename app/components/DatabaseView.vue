<script setup lang="ts">
import type { QuestionState, Route, Topic } from '#shared/bank-types'
import { getAllDueQuestions, masteredPct, questionsOfRoute, questionsOfTopic } from '#shared/srs-math'

const props = defineProps<{ questions: QuestionState[]; topics: Topic[]; routes: Route[] }>()
const emit = defineEmits<{
  'open-preset': []
  'study-one': [string]
  'study-many': [string[], string]
  'start-basket': []
}>()

const filters = useFilters()
const srs = useSrsStore()
const { show } = useToast()

const showcaseMode = ref<'routes' | 'banks'>('routes')
const showcaseCollapsed = ref(false)

const tabs = [
  { key: 'all', label: '📋 全部题目' },
  { key: 'due', label: '⏳ 遗忘曲线待复习 (<75%)' },
  { key: 'weak', label: '🔥 易错/模糊/未刷' },
  { key: 'mastered', label: '✅ 已稳固掌握 (≥75%)' },
  { key: 'logs', label: '🕒 刷题打卡流水日志' },
] as const

const counts = computed(() => ({
  all: props.questions.length,
  due: props.questions.filter(q => q.reviewCount > 0 && q.retention < 75).length,
  weak: props.questions.filter(q => q.retention < 70 || q.reviewCount === 0 || q.lastRating === 'forgot' || q.lastRating === 'hard').length,
  mastered: props.questions.filter(q => q.retention >= 75).length,
}))

const filtered = computed(() => filters.pickQuestions(props.questions, props.routes))
const visible = computed(() => filtered.value.slice(0, filters.visibleCount.value))
const hiddenCount = computed(() => Math.max(0, filtered.value.length - visible.value.length))

const isSelected = (id: string) => srs.selected.includes(id)
const topicName = (id: string) => props.topics.find(t => t.id === id)?.name || id

function toggleAll() {
  const all = filtered.value.every(q => isSelected(q.id))
  const ids = new Set(srs.selected)
  for (const q of filtered.value) {
    if (all) ids.delete(q.id)
    else ids.add(q.id)
  }
  srs.setSelected([...ids])
  show(all ? '已从待刷清单移除当前筛选题目' : `已将 ${filtered.value.length} 道题加入待刷清单`)
}

const ratingLabel: Record<string, { text: string, cls: string }> = {
  forgot: { text: '1·忘记了', cls: 'bg-notion-redBg text-notion-red' },
  hard: { text: '2·印象模糊', cls: 'bg-notion-orangeBg text-notion-orange' },
  good: { text: '3·比较熟悉', cls: 'bg-notion-blueBg text-notion-blue' },
  easy: { text: '4·完全掌握', cls: 'bg-notion-greenBg text-notion-green' },
}
</script>

<template>
  <section class="max-w-6xl mx-auto px-4 sm:px-8 pt-6 md:pt-9 space-y-6 animate-notion-in">
    <div class="flex flex-col md:flex-row md:items-end justify-between gap-4">
      <div class="space-y-1.5">
        <div class="text-3xl md:text-4xl">🗂️</div>
        <h1 class="text-2xl font-bold text-notion-text">题库路线速览 &amp; 艾宾浩斯记忆库</h1>
        <p class="text-xs md:text-sm text-notion-muted">
          既可按「路线/题库」整组推进，也可按「遗忘曲线状态」查看每道题的<strong>已刷次数、最近刷完时间与个人批注</strong>，或自由勾选组建专属题单。
        </p>
      </div>
      <div class="flex items-center gap-2 shrink-0">
        <button class="px-3 py-1.5 rounded-md text-xs font-medium bg-notion-sidebar border border-notion-border hover:bg-notion-hover transition" @click="emit('open-preset')">
          ⚡ 智能抽题组卷
        </button>
        <button class="px-3.5 py-1.5 rounded-md text-xs font-medium bg-notion-blue text-white hover:bg-[#1B6EC2] transition" @click="emit('start-basket')">
          ▶ 刷待刷清单 ({{ srs.selected.length }})
        </button>
      </div>
    </div>

    <div class="notion-card p-4 space-y-4 bg-notion-sidebar/40">
      <div class="flex items-center justify-between flex-wrap gap-2">
        <div class="flex items-center gap-2">
          <button
            :class="['px-2.5 py-1 rounded text-xs transition', showcaseMode === 'routes' ? 'font-semibold bg-notion-text text-white' : 'font-medium bg-white border border-notion-border text-notion-text hover:bg-notion-hover']"
            @click="showcaseMode = 'routes'"
          >
            🛣️ 岗位刷题路线 ({{ routes.length }})
          </button>
          <button
            :class="['px-2.5 py-1 rounded text-xs transition', showcaseMode === 'banks' ? 'font-semibold bg-notion-text text-white' : 'font-medium bg-white border border-notion-border text-notion-text hover:bg-notion-hover']"
            @click="showcaseMode = 'banks'"
          >
            📦 专题题库 ({{ topics.length }})
          </button>
        </div>
        <button class="text-xs text-notion-muted hover:text-notion-text" @click="showcaseCollapsed = !showcaseCollapsed">
          {{ showcaseCollapsed ? '展开路线/题库速览' : '收起速览卡' }}
        </button>
      </div>

      <div v-show="!showcaseCollapsed">
        <div v-if="showcaseMode === 'routes'" class="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
          <div v-for="route in routes" :key="route.id" class="notion-card p-3.5 flex flex-col justify-between space-y-3 bg-white">
            <div class="space-y-1">
              <div class="flex items-center justify-between gap-2">
                <span class="px-2 py-0.5 rounded text-xs font-semibold bg-notion-sidebar text-notion-text border border-notion-border truncate">{{ route.icon }} {{ route.name }}</span>
                <span class="text-[11px] font-mono text-notion-muted shrink-0">{{ masteredPct(questionsOfRoute(questions, route)) }}% 已稳固</span>
              </div>
              <p class="text-[11px] text-notion-muted">{{ route.desc }}</p>
              <div class="flex flex-wrap gap-1 pt-1">
                <span v-for="id in route.topics" :key="id" class="text-[10px] px-1.5 py-0.5 rounded bg-notion-sidebar text-notion-muted border border-notion-border">{{ topicName(id) }}</span>
              </div>
            </div>
            <div class="flex items-center gap-1.5 pt-1">
              <button class="flex-1 py-1 px-2 rounded text-[11px] font-medium bg-notion-sidebar border border-notion-border hover:bg-notion-hover transition" @click="filters.filterByRoute(route.id)">
                在下表筛选此路线
              </button>
              <button class="flex-1 py-1 px-2 rounded text-[11px] font-medium bg-notion-text text-white hover:bg-black transition" @click="emit('study-many', questionsOfRoute(questions, route).map(q => q.id), `${route.icon} 岗位路线：${route.name}`)">
                直接开刷 ({{ questionsOfRoute(questions, route).length }}题)
              </button>
            </div>
          </div>
        </div>

        <div v-else class="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
          <div v-for="topic in topics" :key="topic.id" class="notion-card p-3.5 flex flex-col justify-between space-y-3 bg-white">
            <div class="space-y-1">
              <div class="flex items-center justify-between gap-2">
                <span :class="['px-2 py-0.5 rounded text-xs font-semibold truncate', toneClass(topic.tone)]">{{ topic.icon }} {{ topic.name }}</span>
                <span class="text-[11px] font-mono text-notion-muted shrink-0">累计刷 {{ questionsOfTopic(questions, topic.id).reduce((s, q) => s + q.reviewCount, 0) }} 次</span>
              </div>
              <p class="text-[11px] text-notion-muted line-clamp-2">{{ topic.points.join(' · ') || `难度 ${'★'.repeat(topic.stars)}` }}</p>
            </div>
            <div class="flex items-center gap-1.5 pt-1">
              <button class="flex-1 py-1 px-2 rounded text-[11px] font-medium bg-notion-sidebar border border-notion-border hover:bg-notion-hover transition" @click="filters.filterByTopic(topic.id)">
                在下表筛选此题库
              </button>
              <button class="flex-1 py-1 px-2 rounded text-[11px] font-medium bg-notion-blue text-white hover:bg-[#1B6EC2] transition" @click="emit('study-many', questionsOfTopic(questions, topic.id).map(q => q.id), `${topic.icon} 专题整库：${topic.name}`)">
                整库开刷 ({{ questionsOfTopic(questions, topic.id).length }}题)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="space-y-3">
      <div class="flex items-center gap-1 border-b border-notion-border overflow-x-auto">
        <button
          v-for="t in tabs"
          :key="t.key"
          :class="['px-3 py-2 text-xs md:text-sm whitespace-nowrap border-b-2 flex items-center gap-1.5', filters.tab.value === t.key ? 'border-notion-text text-notion-text font-semibold' : 'border-transparent text-notion-muted hover:text-notion-text font-medium']"
          @click="filters.setTab(t.key)"
        >
          <span>{{ t.label }}</span>
          <span v-if="t.key !== 'logs'" class="px-1.5 rounded bg-notion-sidebar text-[11px] font-mono">{{ (counts as Record<string, number>)[t.key] }}</span>
        </button>
      </div>

      <div v-if="filters.tab.value === 'logs'" class="notion-card divide-y divide-notion-border text-xs">
        <div v-for="log in srs.logs" :key="log.id" class="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-notion-hover/40">
          <div class="flex items-center gap-2.5 min-w-0">
            <span class="font-mono text-[11px] text-notion-muted shrink-0">{{ log.time }}</span>
            <span class="px-1.5 py-0.5 rounded bg-notion-sidebar text-[11px] text-notion-muted shrink-0">{{ log.bankName }}</span>
            <button class="font-medium text-notion-text truncate hover:text-notion-blue text-left" @click="emit('study-one', log.qId)">{{ log.qTitle }}</button>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <span class="text-[11px] text-notion-muted font-mono">第 {{ log.countAfter }} 次刷完</span>
            <span v-if="ratingLabel[log.rating]" :class="['px-2 py-0.5 rounded text-[11px] font-medium', ratingLabel[log.rating]!.cls]">{{ ratingLabel[log.rating]!.text }}</span>
            <span class="text-[11px] font-mono font-semibold text-notion-blue">留存 -&gt; {{ log.retentionAfter }}%</span>
          </div>
        </div>
        <div v-if="!srs.logs.length" class="p-8 text-center text-notion-muted">还没有刷题记录，去沉浸式刷题层开一局吧</div>
      </div>

      <template v-else>
        <div class="notion-callout p-3 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          <div class="flex flex-wrap items-center gap-2 flex-1">
            <input
              v-model="filters.search"
              type="text"
              placeholder="搜索题目名称、关键词、个人笔记..."
              class="flex-1 min-w-[180px] px-3 py-1.5 text-xs bg-white border border-notion-border rounded-md focus:outline-none focus:border-notion-blue"
            >
            <select v-model="filters.topicId" class="px-2.5 py-1.5 text-xs bg-white border border-notion-border rounded-md text-notion-text focus:outline-none max-w-[190px]">
              <option value="all">全部专题题库</option>
              <option v-for="t in topics" :key="t.id" :value="t.id">{{ t.icon }} {{ t.name }} ({{ t.questionCount }})</option>
            </select>
            <select v-model="filters.routeId" class="px-2.5 py-1.5 text-xs bg-white border border-notion-border rounded-md text-notion-text focus:outline-none max-w-[190px]">
              <option value="all">全部岗位路线</option>
              <option v-for="r in routes" :key="r.id" :value="r.id">{{ r.icon }} {{ r.name }}</option>
            </select>
            <select v-model="filters.difficulty" class="px-2.5 py-1.5 text-xs bg-white border border-notion-border rounded-md text-notion-text focus:outline-none">
              <option value="all">全部难度</option>
              <option value="简单">简单</option>
              <option value="中等">中等</option>
              <option value="困难">困难</option>
            </select>
          </div>

          <div class="flex items-center justify-between lg:justify-end gap-2">
            <button class="px-2.5 py-1.5 text-xs font-medium bg-white border border-notion-border rounded-md hover:bg-notion-hover transition" @click="toggleAll">
              全选当前筛选入清单
            </button>
            <button
              class="px-2.5 py-1.5 text-xs font-medium bg-notion-text text-white rounded-md hover:bg-black transition"
              @click="emit('study-many', filtered.map(q => q.id), `🎯 当前筛选队列 (${filtered.length} 题)`)"
            >
              直接刷当前筛选
            </button>
            <div class="inline-flex rounded-md border border-notion-border bg-white p-0.5">
              <button :class="['px-2 py-1 rounded text-xs font-medium', filters.layout.value === 'table' ? 'bg-notion-sidebar text-notion-text' : 'text-notion-muted']" @click="filters.layout.value = 'table'">表格</button>
              <button :class="['px-2 py-1 rounded text-xs font-medium', filters.layout.value === 'gallery' ? 'bg-notion-sidebar text-notion-text' : 'text-notion-muted']" @click="filters.layout.value = 'gallery'">画廊</button>
            </div>
          </div>
        </div>

        <div v-if="filters.layout.value === 'table'" class="notion-card overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="border-b border-notion-border bg-notion-sidebar/70 text-[11px] font-semibold text-notion-muted uppercase">
                  <th class="py-2.5 px-3 w-10 text-center">清单</th>
                  <th class="py-2.5 px-3 min-w-[250px]">题目名称 &amp; 个人笔记锚点</th>
                  <th class="py-2.5 px-3 whitespace-nowrap">专题 &amp; 分类</th>
                  <th class="py-2.5 px-3 whitespace-nowrap">难度</th>
                  <th class="py-2.5 px-3 whitespace-nowrap">累计已刷 / 最近刷完</th>
                  <th class="py-2.5 px-3 whitespace-nowrap">记忆留存率 &amp; 下次节点</th>
                  <th class="py-2.5 px-3 text-right whitespace-nowrap">操作</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-notion-border text-xs">
                <tr v-for="q in visible" :key="q.id" class="hover:bg-notion-hover/60 transition">
                  <td class="py-3 px-3 text-center align-top pt-3.5">
                    <input type="checkbox" :checked="isSelected(q.id)" class="notion-checkbox" @change="srs.toggleSelected(q.id)">
                  </td>
                  <td class="py-3 px-3 max-w-sm">
                    <button class="font-medium text-notion-text hover:text-notion-blue line-clamp-2 text-left" @click="emit('study-one', q.id)">{{ q.title }}</button>
                    <div v-if="q.userNote" class="mt-1 text-[11px] text-notion-blue bg-notion-blueBg/40 px-2 py-0.5 rounded inline-block truncate max-w-md">📝 批注: {{ q.userNote }}</div>
                  </td>
                  <td class="py-3 px-3 whitespace-nowrap">
                    <TopicChip :name="q.topicName" :icon="q.topicIcon" :tone="q.tone" />
                    <div class="text-[11px] text-notion-muted mt-1">{{ q.category || '未分类' }}{{ q.priority ? ' · 🔥高频' : '' }}</div>
                  </td>
                  <td class="py-3 px-3 whitespace-nowrap"><DifficultyBadge :difficulty="q.difficulty" /></td>
                  <td class="py-3 px-3 whitespace-nowrap font-mono">
                    <span class="px-1.5 py-0.5 rounded bg-notion-sidebar text-notion-text font-semibold">已刷 {{ q.reviewCount }} 次</span>
                    <div class="text-[11px] text-notion-muted mt-0.5">{{ q.lastReviewedAt }}</div>
                  </td>
                  <td class="py-3 px-3 whitespace-nowrap">
                    <RetentionBar :retention="q.retention" />
                    <div :class="['text-[10px] mt-0.5', q.retention < 75 ? 'text-notion-orange font-medium' : 'text-notion-muted']">{{ q.nextReviewText }}</div>
                  </td>
                  <td class="py-3 px-3 text-right whitespace-nowrap">
                    <button class="px-2.5 py-1 rounded bg-notion-sidebar border border-notion-border hover:bg-notion-text hover:text-white transition text-xs font-medium" @click="emit('study-one', q.id)">沉浸刷</button>
                  </td>
                </tr>
                <tr v-if="!visible.length"><td colspan="7" class="py-8 text-center text-notion-muted">当前视图或筛选条件下暂无题目</td></tr>
                <tr v-else-if="hiddenCount > 0">
                  <td colspan="7" class="py-4 text-center">
                    <button class="px-4 py-1.5 rounded-md text-xs font-medium bg-notion-sidebar border border-notion-border hover:bg-notion-hover transition" @click="filters.visibleCount.value += 100">
                      加载更多（还有 {{ hiddenCount }} 题）
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div v-for="q in visible" :key="q.id" class="notion-card notion-card-hover p-4 flex flex-col justify-between space-y-3">
            <div class="space-y-2">
              <div class="flex items-center justify-between gap-2">
                <label class="flex items-center gap-2 cursor-pointer text-xs text-notion-muted">
                  <input type="checkbox" :checked="isSelected(q.id)" class="notion-checkbox" @change="srs.toggleSelected(q.id)">
                  <span>加入待刷清单</span>
                </label>
                <DifficultyBadge :difficulty="q.difficulty" />
              </div>
              <button class="text-sm font-semibold text-notion-text hover:text-notion-blue line-clamp-2 text-left" @click="emit('study-one', q.id)">{{ q.title }}</button>
              <div class="flex flex-wrap gap-1.5 pt-1">
                <TopicChip :name="q.topicName" :icon="q.topicIcon" :tone="q.tone" />
                <span class="px-2 py-0.5 rounded text-[11px] bg-notion-sidebar text-notion-muted">{{ q.category || '未分类' }}</span>
                <span v-if="q.priority" class="px-2 py-0.5 rounded text-[11px] bg-notion-orangeBg text-notion-orange">🔥 高频</span>
              </div>
              <div v-if="q.userNote" class="text-[11px] text-notion-blue bg-notion-blueBg/40 px-2 py-1 rounded truncate">📝 {{ q.userNote }}</div>
            </div>
            <div class="pt-3 border-t border-notion-border flex items-center justify-between text-xs">
              <div class="text-[11px] text-notion-muted font-mono">
                已刷 {{ q.reviewCount }} 次 · 留存 <strong :class="q.retention < 75 ? 'text-notion-orange' : 'text-notion-green'">{{ q.retention }}%</strong>
              </div>
              <button class="px-2.5 py-1 rounded bg-notion-text text-white hover:bg-black transition text-xs" @click="emit('study-one', q.id)">沉浸刷</button>
            </div>
          </div>
          <button
            v-if="hiddenCount > 0"
            class="notion-card notion-card-hover p-4 text-xs font-medium text-notion-muted flex items-center justify-center"
            @click="filters.visibleCount.value += 100"
          >
            加载更多（还有 {{ hiddenCount }} 题）
          </button>
        </div>
      </template>
    </div>
  </section>
</template>
