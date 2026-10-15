<script setup lang="ts">
import { buildQuestionStates, getCappedDueQuestions, questionsOfRoute } from '#shared/srs-math'

definePageMeta({ layout: 'default' })

const { bank, load } = useBank()
const srs = useSrsStore()
const session = useStudySession()
const filters = useFilters()
const { show } = useToast()

const sidebarOpen = ref(false)
const presetOpen = ref(false)

const questions = computed(() => bank.value
  ? buildQuestionStates(bank.value.questions, bank.value.topics, bank.value.routes, srs.srs)
  : [])
const topics = computed(() => bank.value?.topics || [])
const routes = computed(() => bank.value?.routes || [])

/** 拉起沉浸式刷题队列；空队列给出提示而不是弹空卡片 */
function launch(ids: string[], title: string) {
  if (!session.launch(ids, title)) show('当前队列为空，请先选择题目或调整筛选条件', 'ℹ️')
}

function dailyReview() {
  const ids = getCappedDueQuestions(questions.value, srs.dailyCap).map(q => q.id)
  launch(ids, `⏰ 今日抗遗忘复习队列 (${ids.length} 题)`)
}

function studyRoute(routeId: string) {
  const r = routes.value.find(x => x.id === routeId)
  if (!r) return
  const ids = questionsOfRoute(questions.value, r).map(q => q.id)
  launch(ids, `${r.icon} 岗位路线：${r.name} (${ids.length} 题)`)
}

function studyWeakness() {
  const ids = questions.value.filter(q => q.retention < 75 || q.reviewCount === 0).map(q => q.id)
  launch(ids, '🩺 薄弱项与未刷盲区特训队列')
}

function studyOne(id: string) {
  const q = questions.value.find(x => x.id === id)
  launch([id], `🎯 单题沉浸强化：${q ? q.title.slice(0, 18) : id}...`)
}

function startBasket() {
  const ids = [...srs.selected]
  launch(ids, `✨ 待刷清单自由组合 (${ids.length} 题)`)
}

function switchView(view: 'workbench' | 'database') {
  filters.view.value = view
  sidebarOpen.value = false
  document.getElementById('mainScrollContainer')?.scrollTo({ top: 0 })
}

function focusSearch() {
  filters.view.value = 'database'
  filters.setTab('all')
  nextTick(() => {
    const el = document.querySelector<HTMLInputElement>('input[placeholder^="搜索题目"]')
    el?.focus()
  })
}

function resetRecords() {
  srs.reset()
  show('已清空本机刷题记录，题库回到初始状态', '♻️')
}

// 键盘：'/' 快速搜题（与旧版一致）
function onKeydown(e: KeyboardEvent) {
  if (e.key !== '/' || session.isOpen.value || presetOpen.value) return
  const tag = (document.activeElement?.tagName || '').toLowerCase()
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return
  e.preventDefault()
  focusSearch()
}

onMounted(async () => {
  await load()
  window.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div class="h-screen flex flex-col md:flex-row overflow-hidden select-none md:select-auto">
    <div v-if="sidebarOpen" class="fixed inset-0 bg-black/25 z-40 md:hidden backdrop-blur-[1px]" @click="sidebarOpen = false" />

    <AppSidebar
      :view="filters.view.value"
      :topics="topics"
      :routes="routes"
      :questions="questions"
      :open="sidebarOpen"
      :total="questions.length"
      @switch-view="switchView"
      @jump-route="(id) => { filters.filterByRoute(id); switchView('database') }"
      @jump-topic="(id) => { filters.filterByTopic(id); switchView('database') }"
      @open-preset="presetOpen = true"
      @daily-review="dailyReview"
      @start-basket="startBasket"
      @search="focusSearch"
      @reset="resetRecords"
      @close="sidebarOpen = false"
    />

    <div class="flex-1 flex flex-col min-w-0 h-full bg-white relative">
      <AppTopbar
        :view="filters.view.value"
        @toggle-sidebar="sidebarOpen = true"
        @open-preset="presetOpen = true"
        @daily-review="dailyReview"
      />

      <main id="mainScrollContainer" class="flex-1 overflow-y-auto pb-28 md:pb-16">
        <div v-if="!bank" class="p-10 text-center text-notion-muted">正在加载题库（28 专题 / 787 题）…</div>
        <template v-else>
          <WorkbenchView
            v-show="filters.view.value === 'workbench'"
            :questions="questions"
            :topics="topics"
            :routes="routes"
            @daily-review="dailyReview"
            @open-preset="presetOpen = true"
            @study-one="studyOne"
            @study-route="studyRoute"
            @study-weakness="studyWeakness"
            @go-database="switchView('database')"
          />
          <DatabaseView
            v-if="filters.view.value === 'database'"
            :questions="questions"
            :topics="topics"
            :routes="routes"
            @open-preset="presetOpen = true"
            @study-one="studyOne"
            @study-many="(ids, title) => launch(ids, title)"
            @start-basket="startBasket"
          />
        </template>
      </main>

      <CustomBasketBar
        :questions="questions"
        :selected="srs.selected"
        :visible="!session.isOpen.value"
        @start="startBasket"
        @clear="srs.clearSelected()"
      />

      <nav class="md:hidden fixed bottom-0 inset-x-0 h-14 bg-white/95 backdrop-blur border-t border-notion-border flex items-center justify-around z-30 px-2">
        <button :class="['flex flex-col items-center py-1 px-3', filters.view.value === 'workbench' ? 'text-notion-blue' : 'text-notion-muted']" @click="switchView('workbench')">
          <span class="text-base leading-none">🏠</span>
          <span class="text-[10px] mt-1 font-medium">今日工作台</span>
        </button>
        <button class="flex items-center gap-1.5 px-4 py-2 rounded-full bg-notion-text text-white text-xs font-semibold shadow-md" @click="dailyReview">
          <span>⚡</span><span>沉浸刷题</span>
        </button>
        <button :class="['flex flex-col items-center py-1 px-3', filters.view.value === 'database' ? 'text-notion-blue' : 'text-notion-muted']" @click="switchView('database')">
          <span class="text-base leading-none">🗂️</span>
          <span class="text-[10px] mt-1 font-medium">题库与记忆库</span>
        </button>
      </nav>
    </div>

    <SmartPresetModal
      v-model:open="presetOpen"
      :topics="topics"
      :questions="questions"
      @launch="(ids) => launch(ids, `⚡ 智能抽题组卷 (${ids.length} 题)`)"
    />
    <StudyOverlay :questions="questions" />
    <SessionSummaryModal />
  </div>
</template>
