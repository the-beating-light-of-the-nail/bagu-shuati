<script setup lang="ts">
import type { Topic } from '#shared/bank-types'

definePageMeta({ layout: 'content' })

const route = useRoute()
const slug = computed(() => String(route.params.slug))

const { data } = await useFetch(() => `/api/topic/${slug.value}`)
const topic = computed(() => (data.value as { topic?: Topic } | null)?.topic)
const list = computed(() => (data.value as { questions?: { id: string; title: string; difficulty: string; priority: boolean }[] } | null)?.questions || [])

if (!topic.value) {
  throw createError({ statusCode: 404, statusMessage: '专题不存在', fatal: true })
}

const siteUrl = useRuntimeConfig().public.siteUrl
const canonical = `${siteUrl}/topic/${slug.value}`
const pageTitle = computed(() => `${topic.value!.name}面试题（共 ${topic.value!.questionCount} 题）| AI 八股刷题工作台`)
const pageDesc = computed(() => `${topic.value!.name}方向的 AI 面试题共 ${topic.value!.questionCount} 道，覆盖 ${topic.value!.points.join('、') || '核心考点'}，每题都有参考答案与自测评分。`)

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
      '@type': 'ItemList',
      name: pageTitle.value,
      numberOfItems: list.value.length,
      itemListElement: list.value.map((q, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        url: `${siteUrl}/q/${q.id}`,
        name: q.title,
      })),
    }).replace(/<\//g, '<\\/'),
  }],
}))
</script>

<template>
  <div v-if="topic" class="notion-card p-5 md:p-7 space-y-4">
    <nav class="text-[13px] text-notion-muted">
      <NuxtLink to="/bank" class="hover:text-notion-blue">题库总览</NuxtLink>
      <span class="mx-1">›</span>
      <span>{{ topic.name }}</span>
    </nav>

    <h1 class="text-xl md:text-2xl font-bold">{{ topic.name }}面试题</h1>

    <div class="flex flex-wrap gap-1.5">
      <TopicChip :name="topic.name" :icon="topic.icon" :tone="topic.tone" />
      <DifficultyBadge :difficulty="topic.difficulty" />
      <span class="px-2 py-0.5 rounded text-[11px] bg-notion-sidebar text-notion-muted border border-notion-border">{{ topic.questionCount }} 题</span>
      <span class="px-2 py-0.5 rounded text-[11px] bg-notion-sidebar text-notion-muted border border-notion-border">难度 {{ '★'.repeat(topic.stars) }}</span>
    </div>

    <p class="text-[13px] text-notion-muted">{{ pageDesc }}</p>

    <ol class="list-decimal pl-6 space-y-1.5 text-[14px]">
      <li v-for="q in list" :key="q.id">
        <NuxtLink :to="`/q/${q.id}`" class="hover:text-notion-blue">{{ q.title }}</NuxtLink>
        <span class="ml-2 align-middle"><DifficultyBadge :difficulty="q.difficulty" /></span>
        <span v-if="q.priority" class="ml-1 align-middle px-2 py-0.5 rounded text-[11px] font-medium bg-notion-orangeBg text-notion-orange">🔥 高频</span>
      </li>
    </ol>

    <div class="flex flex-wrap gap-2 pt-4 border-t border-notion-border">
      <NuxtLink to="/" class="px-4 py-2 rounded-md text-[13px] font-medium bg-notion-blue text-white hover:bg-[#1B6EC2]">进入刷题工作台</NuxtLink>
      <NuxtLink to="/bank" class="px-4 py-2 rounded-md text-[13px] font-medium bg-notion-sidebar border border-notion-border hover:bg-notion-hover">返回题库总览</NuxtLink>
    </div>
  </div>
</template>
