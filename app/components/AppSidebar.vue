<script setup lang="ts">
import type { QuestionState, Route, Topic } from '#shared/bank-types'
import { masteredPct, questionsOfRoute } from '#shared/srs-math'

const props = defineProps<{
  view: 'workbench' | 'database'
  topics: Topic[]
  routes: Route[]
  questions: QuestionState[]
  open: boolean
  total: number
}>()

const emit = defineEmits<{
  'switch-view': ['workbench' | 'database']
  'jump-route': [string]
  'jump-topic': [string]
  'open-preset': []
  'daily-review': []
  'start-basket': []
  'search': []
  'reset': []
  'close': []
}>()

const srs = useSrsStore()
const dueCount = useState<number>('due-count', () => 0)

const topTopics = computed(() => [...props.topics].sort((a, b) => b.questionCount - a.questionCount).slice(0, 8))
const routePct = (r: Route) => masteredPct(questionsOfRoute(props.questions, r))
</script>

<template>
  <aside
    :class="['fixed md:static inset-y-0 left-0 z-50 w-64 bg-notion-sidebar border-r border-notion-border flex flex-col justify-between transition-all duration-200 shrink-0', open ? 'translate-x-0' : '-translate-x-full md:translate-x-0']"
  >
    <div class="p-3 space-y-3.5 overflow-y-auto flex-1">
      <div class="flex items-center justify-between px-2 py-1.5 rounded-md">
        <div class="flex items-center gap-2.5 min-w-0">
          <div class="w-6 h-6 rounded bg-notion-text text-white flex items-center justify-center text-xs font-bold shrink-0">N</div>
          <div class="truncate">
            <div class="text-sm font-semibold text-notion-text leading-tight truncate">AI 八股刷题工作台</div>
            <div class="text-[11px] text-notion-muted">{{ topics.length }} 个专题 · {{ total }} 道题</div>
          </div>
        </div>
        <button class="md:hidden p-1 rounded hover:bg-black/5 text-notion-muted" @click="emit('close')">✕</button>
      </div>

      <div class="px-1 space-y-1.5">
        <button
          class="w-full flex items-center justify-between px-2.5 py-1.5 text-xs text-notion-muted bg-white border border-notion-border rounded-md hover:bg-notion-hover transition"
          @click="emit('search')"
        >
          <span class="flex items-center gap-2">🔍 <span>快速搜题 / 筛选记忆库...</span></span>
          <kbd>/</kbd>
        </button>

        <button
          class="w-full flex items-center justify-between px-2.5 py-1.5 text-xs font-medium text-notion-blue bg-notion-blueBg/70 border border-notion-blue/20 rounded-md hover:bg-notion-blueBg transition"
          @click="emit('open-preset')"
        >
          <span class="flex items-center gap-2">✨ <span>⚡ 一键智能抽题组卷</span></span>
          <span class="text-[10px] font-mono">1秒开刷</span>
        </button>

        <NuxtLink to="/bank" class="w-full flex items-center justify-between px-2.5 py-1.5 text-xs text-notion-muted bg-white border border-notion-border rounded-md hover:bg-notion-hover transition">
          <span class="flex items-center gap-2">📖 <span>题库总览（一题一页）</span></span>
          <kbd>↗</kbd>
        </NuxtLink>
      </div>

      <div class="space-y-0.5">
        <div class="px-2 py-1 text-[11px] font-semibold text-notion-muted uppercase tracking-wider">核心工作区</div>
        <button
          :class="['w-full flex items-center justify-between px-2.5 py-2 rounded-md text-sm font-medium transition', view === 'workbench' ? 'bg-notion-hover text-notion-text font-semibold' : 'text-notion-muted hover:bg-notion-hover']"
          @click="emit('switch-view', 'workbench')"
        >
          <span class="flex items-center gap-2.5">🏠 <span>今日工作台与分析</span></span>
          <span class="text-[11px] px-1.5 py-0.5 rounded bg-notion-orangeBg text-notion-orange font-mono font-medium">{{ dueCount }} 待刷</span>
        </button>
        <button
          :class="['w-full flex items-center justify-between px-2.5 py-2 rounded-md text-sm font-medium transition', view === 'database' ? 'bg-notion-hover text-notion-text font-semibold' : 'text-notion-muted hover:bg-notion-hover']"
          @click="emit('switch-view', 'database')"
        >
          <span class="flex items-center gap-2.5">🗂️ <span>题库路线与记忆库</span></span>
          <span class="text-[11px] text-notion-muted font-mono">{{ total }} 题</span>
        </button>
        <button
          class="w-full flex items-center justify-between px-2.5 py-2 rounded-md text-sm font-medium text-notion-muted hover:bg-notion-hover hover:text-notion-text transition"
          @click="emit('daily-review')"
        >
          <span class="flex items-center gap-2.5">🎯 <span>进入沉浸式刷题层</span></span>
          <span class="text-[10px] px-1.5 py-0.5 rounded bg-notion-blueBg text-notion-blue font-medium">全屏模态</span>
        </button>
      </div>

      <div class="pt-1 space-y-0.5">
        <div class="px-2 py-1 text-[11px] font-semibold text-notion-muted uppercase tracking-wider flex items-center justify-between">
          <span>岗位刷题路线</span>
          <span class="text-[10px] font-normal">点击速览</span>
        </div>
        <button
          v-for="route in routes"
          :key="route.id"
          class="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs text-notion-text hover:bg-notion-hover transition"
          @click="emit('jump-route', route.id)"
        >
          <span class="flex items-center gap-2 truncate">
            <span>{{ route.icon }}</span>
            <span class="truncate">{{ route.name }}</span>
          </span>
          <span class="text-[11px] text-notion-muted font-mono shrink-0">{{ routePct(route) }}%</span>
        </button>
      </div>

      <div class="pt-1 space-y-0.5">
        <div class="px-2 py-1 text-[11px] font-semibold text-notion-muted uppercase tracking-wider flex items-center justify-between">
          <span>专题题库直达</span>
          <span class="text-[10px] font-normal">共 {{ topics.length }} 个</span>
        </div>
        <button
          v-for="topic in topTopics"
          :key="topic.id"
          class="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs text-notion-text hover:bg-notion-hover transition"
          @click="emit('jump-topic', topic.id)"
        >
          <span class="flex items-center gap-2 truncate">
            <span :class="['w-2 h-2 rounded-full shrink-0', dotClass(topic.tone)]" />
            <span class="truncate">{{ topic.name }}</span>
          </span>
          <span :class="['text-[10px] px-1.5 py-0.5 rounded font-mono shrink-0', toneClass(topic.tone)]">{{ topic.questionCount }} 题</span>
        </button>
        <button
          class="w-full mt-0.5 flex items-center justify-center gap-1 py-1 rounded-md text-[11px] text-notion-blue hover:bg-notion-blueBg/60 transition"
          @click="emit('switch-view', 'database')"
        >
          查看全部题库 →
        </button>
      </div>
    </div>

    <div class="p-3 border-t border-notion-border bg-[#F3F3F0]/60 space-y-2">
      <div class="flex items-center justify-between text-xs">
        <span class="text-notion-muted">📚 待刷清单 (Inbox)</span>
        <span class="font-semibold text-notion-blue font-mono">{{ srs.selected.length }} 题</span>
      </div>
      <button
        :disabled="!srs.selected.length"
        class="w-full py-1.5 px-3 rounded-md text-xs font-medium bg-notion-text text-white hover:bg-black transition disabled:opacity-40 disabled:cursor-not-allowed"
        @click="emit('start-basket')"
      >
        ▶ 刷已勾选清单
      </button>
      <div class="flex items-center justify-between pt-1 text-[11px] text-notion-muted">
        <span>刷题记录仅保存在本机</span>
        <button class="underline hover:text-notion-text" @click="emit('reset')">重置刷题记录</button>
      </div>
      <a
        class="flex items-center justify-center gap-1 pt-1 text-[11px] text-notion-muted hover:text-notion-blue"
        href="https://github.com/guocong-bincai/ai-interview-guide"
        target="_blank"
        rel="noopener"
      >
        📖 题库来源：ai-interview-guide
      </a>
    </div>
  </aside>
</template>
