<script setup lang="ts">
import type { Topic } from '#shared/bank-types'

definePageMeta({ layout: 'content' })

interface HubQuestion {
  id: string
  title: string
  topicId: string
  difficulty: string
  priority: boolean
}

const { data } = await useFetch('/api/hub')
const topics = computed(() => (data.value as { topics?: Topic[] } | null)?.topics || [])
const questions = computed(() => (data.value as { questions?: HubQuestion[] } | null)?.questions || [])
const total = computed(() => (data.value as { total?: number } | null)?.total || 0)
const grouped = computed(() => topics.value.map(t => ({ topic: t, list: questions.value.filter(q => q.topicId === t.id) })))

const siteUrl = useRuntimeConfig().public.siteUrl
const canonical = `${siteUrl}/bank`
const pageTitle = computed(() => `AI 面试题库总览：${topics.value.length} 个专题 / ${total.value} 道题 | AI 八股刷题工作台`)
const pageDesc = '按专题列出全部 AI 面试题，每题含参考答案、图解与自测评分，可直接在页面内刷题。'

useSeoMeta({
  title: pageTitle,
  description: pageDesc,
  ogType: 'website',
  ogSiteName: 'AI 八股刷题工作台',
  ogTitle: pageTitle,
  ogDescription: pageDesc,
  ogUrl: canonical,
})
useHead(() => ({
  link: [{ rel: 'canonical', href: canonical }],
  script: [{
    type: 'application/ld+json',
    innerHTML: JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: pageTitle.value,
      url: canonical,
      hasPart: topics.value.map(t => ({ '@type': 'WebPage', name: `${t.name}面试题`, url: `${siteUrl}/topic/${t.id}` })),
    }).replace(/<\//g, '<\\/'),
  }],
}))
</script>

<template>
  <div class="notion-card p-5 md:p-7 space-y-5">
    <h1 class="text-xl md:text-2xl font-bold">AI 面试题库总览</h1>
    <p class="text-[13px] text-notion-muted">{{ pageDesc }}</p>
    <div class="flex flex-wrap gap-2">
      <NuxtLink to="/" class="px-4 py-2 rounded-md text-[13px] font-medium bg-notion-blue text-white hover:bg-[#1B6EC2]">
        进入刷题工作台（间隔复习 + 进度分析）
      </NuxtLink>
    </div>

    <section v-for="g in grouped" :key="g.topic.id" class="pt-5 border-t border-notion-border">
      <h2 class="flex flex-wrap items-center gap-2 text-[16px] font-semibold">
        <NuxtLink :to="`/topic/${g.topic.id}`" class="hover:text-notion-blue">{{ g.topic.icon }} {{ g.topic.name }}</NuxtLink>
        <span class="px-2 py-0.5 rounded text-[11px] bg-notion-sidebar text-notion-muted border border-notion-border">{{ g.list.length }} 题</span>
        <DifficultyBadge :difficulty="g.topic.difficulty" />
      </h2>
      <p class="text-[12.5px] text-notion-muted mt-1">{{ g.topic.points.join(' · ') || '核心考点' }}</p>
      <ol class="list-decimal pl-6 mt-2 space-y-1 text-[14px]">
        <li v-for="q in g.list" :key="q.id">
          <NuxtLink :to="`/q/${q.id}`" class="hover:text-notion-blue">{{ q.title }}</NuxtLink>
          <span v-if="q.priority" class="ml-2 align-middle px-2 py-0.5 rounded text-[11px] font-medium bg-notion-orangeBg text-notion-orange">🔥 高频</span>
        </li>
      </ol>
    </section>
  </div>
</template>
