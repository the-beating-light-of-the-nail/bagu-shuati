<script setup lang="ts">
import type { Question, QuestionState, Topic } from '#shared/bank-types'
import { joinDesc, plainText } from '#shared/md'

definePageMeta({ layout: 'content' })

const route = useRoute()
const id = computed(() => String(route.params.id))

const { data } = await useFetch(() => `/api/q/${id.value}`)
const question = computed(() => (data.value as { question?: Question } | null)?.question)
const topic = computed(() => (data.value as { topic?: Topic | null } | null)?.topic || null)
const prev = computed(() => (data.value as { prev?: Question | null } | null)?.prev || null)
const next = computed(() => (data.value as { next?: Question | null } | null)?.next || null)

if (!question.value) {
  throw createError({ statusCode: 404, statusMessage: '题目不存在', fatal: true })
}

const siteUrl = useRuntimeConfig().public.siteUrl
const canonical = `${siteUrl}/q/${id.value}`
const pageTitle = computed(() => `${question.value!.title}｜${question.value!.topicName}面试题参考答案 | AI 八股刷题工作台`)
const pageDesc = computed(() => joinDesc(question.value!.title, plainText(question.value!.answer, 110)))

useSeoMeta({
  title: pageTitle,
  description: pageDesc,
  ogType: 'article',
  ogSiteName: 'AI 八股刷题工作台',
  ogTitle: pageTitle,
  ogDescription: pageDesc,
  ogUrl: canonical,
  ogImage: () => question.value?.image || undefined,
  twitterCard: 'summary_large_image',
})
useHead(() => ({
  link: [{ rel: 'canonical', href: canonical }],
  script: question.value
    ? [{
        type: 'application/ld+json',
        innerHTML: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'QAPage',
          mainEntity: {
            '@type': 'Question',
            name: question.value.title,
            acceptedAnswer: { '@type': 'Answer', text: plainText(question.value.answer, 400) },
          },
        }).replace(/<\//g, '<\\/'),
      }]
    : [],
}))

// 沉浸式刷题层需要 QuestionState（题目 + 进度合并），单题页只构造这一道题，不加载整库
const srs = useSrsStore()
const session = useStudySession()
const { show } = useToast()
const questions = computed<QuestionState[]>(() => {
  const q = question.value
  if (!q) return []
  return [{
    ...q,
    topicIcon: topic.value?.icon || '📄',
    tone: topic.value?.tone || 'blue',
    routeIds: [],
    ...srs.entryOf(q.id),
  }]
})

async function rate(rating: string) {
  const q = question.value
  if (!q) return
  const entry = await srs.rate(q.id, q.title, q.topicName, rating)
  show(`已记录第 ${entry.reviewCount} 次刷完 · 留存率 ${entry.retention}% · 进度已同步到工作台`, '✅')
}

function immersive() {
  const q = question.value
  if (!q) return
  if (!session.launch([q.id], `🎯 单题沉浸强化：${q.title.slice(0, 18)}...`)) {
    show('无法打开刷题层', 'ℹ️')
  }
}
</script>

<template>
  <article v-if="question" class="notion-card p-5 md:p-7 space-y-4">
    <nav class="text-[13px] text-notion-muted flex flex-wrap items-center gap-1.5">
      <NuxtLink to="/bank" class="hover:text-notion-blue">题库总览</NuxtLink>
      <span>›</span>
      <NuxtLink :to="`/topic/${question.topicId}`" class="hover:text-notion-blue">{{ question.topicName }}</NuxtLink>
      <span>›</span>
      <span>第 {{ question.qNo }} 题</span>
    </nav>

    <h1 class="text-xl md:text-2xl font-bold leading-snug">{{ question.title }}</h1>

    <div class="flex flex-wrap gap-1.5">
      <TopicChip :name="question.topicName" :icon="topic?.icon" :tone="topic?.tone" />
      <DifficultyBadge :difficulty="question.difficulty" />
      <span v-if="question.priority" class="px-2 py-0.5 rounded text-[11px] font-medium bg-notion-orangeBg text-notion-orange">🔥 高频必考</span>
      <span v-if="question.category" class="px-2 py-0.5 rounded text-[11px] bg-notion-sidebar text-notion-muted border border-notion-border">{{ question.category }}</span>
      <ClientOnly><ProgressPill :id="question.id" /></ClientOnly>
    </div>

    <div class="border-t border-notion-border pt-4 space-y-3">
      <p class="text-[13px] text-notion-muted">
        先在心里组织一遍答案，再展开参考答案对照。展开后可以给自己评一档，进度会同步到刷题工作台。
      </p>

      <details class="space-y-3">
        <summary class="answer-toggle">展开参考答案</summary>
        <div class="pt-4 space-y-3">
          <a v-if="question.image" :href="question.image" target="_blank" rel="noopener" class="block">
            <img :src="question.image" :alt="`${question.title} 图解`" loading="lazy" class="w-full rounded-lg border border-notion-border bg-white">
          </a>
          <MarkdownAnswer class="answer-md-lg" :md="question.answer" />
        </div>
      </details>

      <!-- 进度与评分只在客户端渲染：预渲染 HTML 里不出现个人进度 -->
      <ClientOnly>
        <div class="pt-4 border-t border-dashed border-notion-border space-y-2">
          <p class="text-[13px] text-notion-muted">自测评分（与工作台共用同一份进度）</p>
          <RateBar @rate="rate" />
        </div>
      </ClientOnly>
    </div>

    <div class="flex flex-wrap gap-2 pt-4 border-t border-notion-border">
      <button class="px-4 py-2 rounded-md text-[13px] font-medium bg-notion-blue text-white hover:bg-[#1B6EC2]" @click="immersive">
        沉浸式刷题（关键词锚点 + 计时）
      </button>
      <NuxtLink to="/" class="px-4 py-2 rounded-md text-[13px] font-medium bg-notion-sidebar border border-notion-border hover:bg-notion-hover">
        进入工作台刷全部 787 题
      </NuxtLink>
    </div>

    <nav class="flex items-center justify-between gap-3 pt-2 text-[13px]">
      <NuxtLink v-if="prev" :to="`/q/${prev.id}`" class="text-notion-blue hover:underline truncate">← 上一题：{{ prev.title.slice(0, 28) }}</NuxtLink>
      <span v-else />
      <NuxtLink v-if="next" :to="`/q/${next.id}`" class="text-notion-blue hover:underline truncate text-right">下一题：{{ next.title.slice(0, 28) }} →</NuxtLink>
    </nav>

    <p class="text-[12px] text-notion-muted pt-2 border-t border-notion-border">
      本题原文：
      <a class="underline" :href="question.sourceUrl" rel="nofollow noopener" target="_blank">ai-interview-guide / {{ question.topicName }}</a>
      ·
      <NuxtLink :to="`/topic/${question.topicId}`" class="underline">查看整个专题（{{ topic?.questionCount || '全部' }} 题）→</NuxtLink>
    </p>
  </article>
</template>
