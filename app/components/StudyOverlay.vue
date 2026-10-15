<script setup lang="ts">
import type { QuestionState } from '#shared/bank-types'
import { NEW_QUESTION_STATE } from '#shared/srs-math'

const props = defineProps<{ questions: QuestionState[] }>()

const session = useStudySession()
const srs = useSrsStore()
const { bank } = useBank()
const { show } = useToast()

const revealed = ref(false)
const keyword = ref('')
const note = ref('')
const seconds = ref(0)
let timer: ReturnType<typeof setInterval> | undefined

const total = computed(() => session.queue.value.length)
const currentId = computed(() => session.queue.value[session.index.value])
const current = computed<QuestionState | undefined>(() => props.questions.find(q => q.id === currentId.value))
const entry = computed(() => (currentId.value ? srs.entryOf(currentId.value) : { ...NEW_QUESTION_STATE }))
const routeLabel = computed(() => {
  const q = current.value
  const routes = bank.value?.routes
  if (!q || !routes?.length) return ''
  const hit = routes.find(r => q.routeIds.includes(r.id))
  return hit ? `${hit.icon} ${hit.name}` : ''
})

function resetCardState() {
  revealed.value = false
  keyword.value = ''
  note.value = current.value ? srs.entryOf(current.value.id).userNote : ''
  document.getElementById('studyCardScrollWrap')?.scrollTo({ top: 0 })
}

function reveal() {
  revealed.value = true
}

function move(delta: number) {
  const next = session.index.value + delta
  if (next < 0) {
    show('已经是当前队列第一题', 'ℹ️')
    return
  }
  if (next >= total.value) {
    show('已经是当前队列最后一题', 'ℹ️')
    return
  }
  session.index.value = next
  resetCardState()
}

function close() {
  session.close()
}

async function rate(rating: string) {
  const q = current.value
  if (!q) return
  await srs.rate(q.id, q.title, q.topicName, rating)
  session.completed.value += 1
  if (rating === 'good' || rating === 'easy') session.mastered.value += 1

  if (session.index.value < total.value - 1) {
    session.index.value += 1
    resetCardState()
    show(`已记录第 ${srs.entryOf(q.id).reviewCount} 次刷完 · 留存率更新为 ${srs.entryOf(q.id).retention}%`, '✅')
  } else {
    session.close()
    session.showSummary.value = true
  }
}

function saveNote(value: string) {
  if (current.value) void srs.setNote(current.value.id, value)
}

// 键盘快捷键：Esc 退出 / Space 揭晓 / 1~4 评分 / ←→ 切题
function onKeydown(e: KeyboardEvent) {
  if (!session.isOpen.value) return
  const tag = (document.activeElement?.tagName || '').toLowerCase()
  const typing = tag === 'input' || tag === 'textarea' || tag === 'select'

  if (e.key === 'Escape') {
    close()
    return
  }
  if (typing) return
  if (e.code === 'Space') {
    e.preventDefault()
    if (!revealed.value) reveal()
  } else if (e.key === '1' && revealed.value) {
    void rate('forgot')
  } else if (e.key === '2' && revealed.value) {
    void rate('hard')
  } else if (e.key === '3' && revealed.value) {
    void rate('good')
  } else if (e.key === '4' && revealed.value) {
    void rate('easy')
  } else if (e.key === 'ArrowLeft') {
    move(-1)
  } else if (e.key === 'ArrowRight') {
    move(1)
  }
}

// 移动端滑动评分：左滑记为「模糊」，右滑记为「掌握」（阈值与旧版一致）
let touchStartX = 0
let touchStartY = 0
const cardEl = ref<HTMLElement | null>(null)
function onTouchStart(e: TouchEvent) {
  touchStartX = e.changedTouches[0]!.screenX
  touchStartY = e.changedTouches[0]!.screenY
}
function onTouchEnd(e: TouchEvent) {
  if (!revealed.value || !cardEl.value) return
  const dx = e.changedTouches[0]!.screenX - touchStartX
  const dy = e.changedTouches[0]!.screenY - touchStartY
  if (Math.abs(dx) > 75 && Math.abs(dx) > Math.abs(dy) * 1.5) {
    const shift = dx < 0 ? '-40px' : '40px'
    cardEl.value.style.transform = `translateX(${shift})`
    setTimeout(() => {
      if (cardEl.value) cardEl.value.style.transform = ''
      void rate(dx < 0 ? 'hard' : 'good')
    }, 140)
  }
}

watch(currentId, () => resetCardState())

onMounted(() => {
  if (session.isOpen.value) resetCardState()
  timer = setInterval(() => { seconds.value += 1 }, 1000)
  window.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  clearInterval(timer)
  window.removeEventListener('keydown', onKeydown)
})

const timerText = computed(() => {
  const m = String(Math.floor(seconds.value / 60)).padStart(2, '0')
  const s = String(seconds.value % 60).padStart(2, '0')
  return `⏱️ ${m}:${s}`
})

const progressWidth = computed(() => (total.value ? Math.round(((session.index.value + 1) / total.value) * 100) : 0))
</script>

<template>
  <div v-if="session.isOpen.value" class="fixed inset-0 z-50 bg-[#F7F7F5] flex flex-col justify-between overflow-hidden animate-notion-in">
    <header class="bg-white border-b border-notion-border px-3 md:px-8 py-2.5 flex items-center justify-between shrink-0">
      <div class="flex items-center gap-2.5 min-w-0">
        <button
          class="px-2.5 py-1 rounded-md text-xs font-medium bg-notion-sidebar border border-notion-border hover:bg-notion-hover text-notion-text flex items-center gap-1 transition"
          title="退出沉浸刷题 (Esc)"
          @click="close"
        >
          ✕ <span>退出</span>
        </button>
        <div class="truncate">
          <div class="flex items-center gap-2">
            <span class="text-xs md:text-sm font-semibold text-notion-text truncate">{{ session.title.value }}</span>
            <span class="px-2 py-0.5 rounded bg-notion-blueBg text-notion-blue font-mono text-xs font-semibold">
              {{ session.index.value + 1 }} / {{ total }}
            </span>
          </div>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <span class="text-xs font-mono text-notion-muted hidden sm:inline">{{ timerText }}</span>
        <button class="p-1.5 rounded-md bg-white border border-notion-border hover:bg-notion-hover text-notion-text" title="上一题 (←)" @click="move(-1)">‹</button>
        <button class="p-1.5 rounded-md bg-white border border-notion-border hover:bg-notion-hover text-notion-text" title="下一题 (→)" @click="move(1)">›</button>
      </div>
    </header>

    <div class="w-full h-1 bg-notion-border shrink-0">
      <div class="h-full bg-notion-blue transition-all duration-300" :style="`width: ${progressWidth}%`" />
    </div>

    <div id="studyCardScrollWrap" class="flex-1 overflow-y-auto px-3 sm:px-6 py-4 md:py-8">
      <div
        ref="cardEl"
        class="max-w-3xl mx-auto notion-card p-5 md:p-8 space-y-6 shadow-sm bg-white swipe-card-transition"
        @touchstart.passive="onTouchStart"
        @touchend.passive="onTouchEnd"
      >
        <div v-if="current" class="flex flex-wrap items-center justify-between gap-2 border-b border-notion-border pb-3.5">
          <div class="flex flex-wrap items-center gap-1.5">
            <TopicChip :name="current.topicName" :icon="current.topicIcon" :tone="current.tone" />
            <span v-if="routeLabel" class="px-2 py-0.5 rounded text-[11px] font-medium bg-notion-sidebar text-notion-text border border-notion-border">🛣️ {{ routeLabel }}</span>
            <span v-if="current.priority" class="px-2 py-0.5 rounded text-[11px] font-medium bg-notion-orangeBg text-notion-orange">🔥 高频必考</span>
            <DifficultyBadge :difficulty="current.difficulty" />
          </div>
          <div class="text-[11px] font-mono text-notion-muted bg-notion-sidebar px-2.5 py-1 rounded-md border border-notion-border">
            已刷 <strong class="text-notion-text">{{ entry.reviewCount }}</strong> 次 · 上次: {{ entry.lastReviewedAt }} · 留存
            <strong :class="entry.retention < 75 ? 'text-notion-orange' : 'text-notion-green'">{{ entry.retention }}%</strong>
          </div>
        </div>

        <template v-if="current">
          <div class="space-y-3">
            <h1 class="text-base sm:text-lg md:text-xl font-bold text-notion-text leading-snug select-text">{{ current.title }}</h1>
            <div class="notion-callout p-3 text-xs md:text-sm text-notion-muted flex items-start gap-2.5">
              <span class="text-base shrink-0">💡</span>
              <div><strong>记忆锚点：</strong>{{ current.hint || '先自己组织 30 秒版回答，再对照下方标准解析。' }}</div>
            </div>
          </div>

          <div v-if="!revealed" class="space-y-3 pt-1">
            <div class="p-3.5 rounded-lg bg-notion-sidebar/70 border border-notion-border space-y-2">
              <div class="flex items-center justify-between text-xs">
                <span class="font-semibold text-notion-text">🎯 10秒关键词思维锚点（可选，强迫大脑主动提取）</span>
                <span class="text-[11px] text-notion-muted hidden sm:inline">输入后直接按 <kbd>Enter</kbd> 揭晓答案对比</span>
              </div>
              <input
                v-model="keyword"
                type="text"
                placeholder="敲入 2~4 个核心得分词（如：Self-Attention、Rerank、KV Cache）..."
                class="w-full px-3 py-2 text-xs md:text-sm bg-white border border-notion-border rounded-md focus:outline-none focus:border-notion-blue transition"
                @keydown.enter.prevent="reveal"
              >
            </div>

            <button
              class="w-full py-3 px-4 rounded-lg bg-notion-text text-white hover:bg-black text-sm font-semibold transition flex items-center justify-center gap-2 shadow-sm"
              @click="reveal"
            >
              👁 揭晓标准解析并对比思路 (Space / Enter)
            </button>

            <div class="text-center text-[11px] text-notion-muted md:hidden">
              💡 手机端提示：翻开答案后，支持<strong>左滑卡片记为“模糊”</strong>、<strong>右滑卡片记为“掌握”</strong>
            </div>
          </div>

          <div v-else class="space-y-5 pt-3 border-t border-notion-border animate-notion-in select-text">
            <div class="p-3 rounded-lg bg-notion-blueBg/50 border border-notion-blue/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div class="flex items-center gap-2">
                <span class="font-semibold text-notion-blue shrink-0">🎯 你刚才提取的锚点词：</span>
                <span class="font-mono text-notion-text font-medium">{{ keyword || '（未输入锚点词，直接心算默背）' }}</span>
              </div>
              <span class="text-[11px] text-notion-muted shrink-0">请对照下方标准解析评估记忆准确度</span>
            </div>

            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <span class="text-xs font-semibold uppercase tracking-wider text-notion-blue">📖 标准参考解析与架构要点</span>
                <span class="text-[11px] text-notion-muted md:hidden">👈 左滑模糊 · 右滑掌握 👉</span>
              </div>
              <a v-if="current.image" :href="current.image" target="_blank" rel="noopener" class="block">
                <img :src="current.image" :alt="current.title" loading="lazy" class="w-full rounded-lg border border-notion-border bg-white">
              </a>
              <MarkdownAnswer class="bg-notion-sidebar/40 p-4 rounded-lg border border-notion-border" :md="current.answer" />
            </div>

            <div class="space-y-1.5 pt-1">
              <div class="flex items-center justify-between text-xs text-notion-muted">
                <span class="font-medium">✏️ 个人面试话术批注 / 追问补充（自动保存在本题记录中）</span>
                <span class="text-[11px] text-notion-green">自动保存</span>
              </div>
              <textarea
                v-model="note"
                rows="2"
                placeholder="记录你自己的口语化背诵口诀，或面试官可能追问的细节..."
                class="w-full p-2.5 text-xs bg-notion-sidebar/50 border border-notion-border rounded-md focus:bg-white focus:outline-none focus:border-notion-blue transition resize-y"
                @input="saveNote(note)"
              />
            </div>
          </div>
        </template>
      </div>
    </div>

    <footer class="bg-white border-t border-notion-border px-3 sm:px-6 py-3 shrink-0">
      <div class="max-w-3xl mx-auto">
        <div v-if="!revealed" class="text-center text-xs text-notion-muted py-1.5">
          请先在脑海中回忆或输入关键词锚点，点击上方按钮或按 <kbd>Space</kbd> 揭晓答案后再进行艾宾浩斯评分
        </div>
        <RateBar v-else @rate="rate" />
      </div>
    </footer>
  </div>
</template>
