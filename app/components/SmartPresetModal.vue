<script setup lang="ts">
import type { QuestionState, Topic } from '#shared/bank-types'

const props = defineProps<{ open: boolean; topics: Topic[]; questions: QuestionState[] }>()
const emit = defineEmits<{ 'update:open': [boolean]; launch: [string[]] }>()

const srs = useSrsStore()
const count = ref(5)
const strategy = ref('due_first')

/** 默认全选；用户取消过就以取消结果为准 */
const chosen = computed(() => {
  const set = new Set(srs.presetTopics)
  if (!set.size) props.topics.forEach(t => set.add(t.id))
  return set
})

function toggle(id: string) {
  const next = new Set(chosen.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  srs.setPresetTopics([...next])
}

function setAll(all: boolean) {
  srs.setPresetTopics(all ? props.topics.map(t => t.id) : [])
}

const counts = [3, 5, 10, 99]

function launch() {
  let pool = props.questions.filter(q => chosen.value.has(q.topicId))
  if (!pool.length) pool = [...props.questions]

  const s = strategy.value
  if (s === 'due_first') {
    pool.sort((a, b) => a.retention - b.retention)
  } else if (s === 'weak_only') {
    const weak = pool.filter(q => q.retention < 75)
    if (weak.length) pool = weak.sort((a, b) => a.retention - b.retention)
  } else if (s === 'unseen_only') {
    const unseen = pool.filter(q => q.reviewCount === 0)
    if (unseen.length) pool = unseen
  } else if (s === 'priority_first') {
    pool.sort((a, b) => (Number(b.priority) - Number(a.priority)) || (a.retention - b.retention))
  } else if (s === 'random_all') {
    pool.sort(() => Math.random() - 0.5)
  }

  emit('launch', pool.slice(0, count.value).map(q => q.id))
  emit('update:open', false)
}
</script>

<template>
  <div v-if="open" class="fixed inset-0 bg-black/30 backdrop-blur-[1px] z-50 flex items-center justify-center p-4">
    <div class="bg-white border border-notion-border rounded-xl max-w-lg w-full p-6 space-y-5 shadow-xl animate-notion-in">
      <div class="flex items-start justify-between border-b border-notion-border pb-3">
        <div class="space-y-1">
          <div class="flex items-center gap-2">
            <span class="text-xl">⚡</span>
            <h3 class="text-base font-bold text-notion-text">一键智能抽题组卷（免手动勾选）</h3>
          </div>
          <p class="text-xs text-notion-muted">告别在海量题库里逐个打勾的疲劳，按条件 1 秒钟生成专属刷题队列</p>
        </div>
        <button class="p-1 rounded hover:bg-notion-hover text-notion-muted" @click="emit('update:open', false)">✕</button>
      </div>

      <div class="space-y-4 text-xs">
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <label class="font-semibold text-notion-text">1. 包含哪些专题题库？（可多选）</label>
            <div class="flex items-center gap-2 text-[11px]">
              <button type="button" class="text-notion-blue hover:underline" @click="setAll(true)">全选</button>
              <span class="text-notion-border">|</span>
              <button type="button" class="text-notion-muted hover:text-notion-text" @click="setAll(false)">清空</button>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-1 border border-notion-border rounded-lg p-2 bg-notion-sidebar/30">
            <label v-for="t in topics" :key="t.id" class="flex items-center gap-2 p-2 rounded-lg border border-notion-border bg-white cursor-pointer">
              <input type="checkbox" :checked="chosen.has(t.id)" class="notion-checkbox" @change="toggle(t.id)">
              <span class="truncate">{{ t.icon }} {{ t.name }}</span>
              <span class="ml-auto text-[10px] text-notion-muted font-mono shrink-0">{{ t.questionCount }}</span>
            </label>
          </div>
        </div>

        <div class="space-y-2">
          <label class="font-semibold text-notion-text block">2. 抽题策略与记忆状态筛选</label>
          <select v-model="strategy" class="w-full p-2.5 rounded-lg border border-notion-border bg-white text-notion-text focus:outline-none">
            <option value="due_first">⏰ 优先抗遗忘待复习 + 未刷盲区题（推荐）</option>
            <option value="priority_first">🔥 优先抽面试高频必考题（题库标注的高频顺序）</option>
            <option value="weak_only">🔥 仅抽易错/印象模糊/低留存题目 (&lt;75%)</option>
            <option value="unseen_only">🆕 仅抽尚未刷过的新题 (0次)</option>
            <option value="random_all">🎲 在所选题库中随机混合抽取</option>
          </select>
        </div>

        <div class="space-y-2">
          <label class="font-semibold text-notion-text block">3. 本轮刷题数量</label>
          <div class="grid grid-cols-4 gap-2">
            <button
              v-for="n in counts"
              :key="n"
              type="button"
              :class="['py-2 rounded-lg border font-mono', count === n ? 'border-notion-blue bg-notion-blueBg text-notion-blue font-bold' : 'border-notion-border bg-white text-notion-text']"
              @click="count = n"
            >
              {{ n === 99 ? '全部匹配' : n + ' 题' }}
            </button>
          </div>
        </div>
      </div>

      <div class="flex items-center justify-end gap-2 pt-2 border-t border-notion-border">
        <button class="px-4 py-2 rounded-lg text-xs font-medium bg-notion-sidebar hover:bg-notion-hover text-notion-text transition" @click="emit('update:open', false)">
          取消
        </button>
        <button class="px-5 py-2 rounded-lg text-xs font-semibold bg-notion-blue text-white hover:bg-[#1B6EC2] transition" @click="launch">
          ⚡ 立即生成队列并开刷
        </button>
      </div>
    </div>
  </div>
</template>
