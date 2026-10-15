/**
 * 间隔复习（艾宾浩斯）相关的纯函数与常量。
 * 从旧版 index.html 的逻辑原样搬迁，全部做成「传入数组、返回结果」的纯函数，
 * 便于在 SSR / 客户端 / 将来服务端同步之间复用。
 */
import type { Question, QuestionState, Route, StudyLog, SrsEntry } from './bank-types'
import { addDaysDate, pad2, todayStr } from './date'

/** 新题的初始记忆状态 */
export const NEW_QUESTION_STATE: SrsEntry = {
  reviewCount: 0,
  lastReviewedAt: '尚未刷过',
  retention: 25,
  nextReviewText: '新题待攻克',
  lastRating: null,
  userNote: '',
}

/** 需要参与持久化的 SRS 字段 */
export const SRS_FIELDS: (keyof SrsEntry)[] = [
  'reviewCount', 'lastReviewedAt', 'retention', 'nextReviewText', 'lastRating', 'userNote',
]

/** 四档评分对应的留存率与下次复习节点 */
export const RATING_PRESETS: Record<string, { retention: number; nextReviewText: string }> = {
  forgot: { retention: 35, nextReviewText: '10 分钟后重刷' },
  hard: { retention: 65, nextReviewText: `1 天后 (${addDaysDate(1)})` },
  good: { retention: 86, nextReviewText: `3 天后 (${addDaysDate(3)})` },
  easy: { retention: 98, nextReviewText: `7 天后 (${addDaysDate(7)})` },
}

export const RATING_LABELS: Record<string, string> = {
  forgot: '1 · 忘记了',
  hard: '2 · 印象模糊',
  good: '3 · 比较熟悉',
  easy: '4 · 完全掌握',
}

/** 已刷过且留存率跌破 75% 视为待复习，按留存率升序（越紧急越靠前） */
export function getAllDueQuestions(questions: QuestionState[]): QuestionState[] {
  return questions
    .filter(q => q.reviewCount > 0 && q.retention < 75)
    .sort((a, b) => a.retention - b.retention)
}

/** 叠加「防雪崩每日上限」后的今日队列 */
export function getCappedDueQuestions(questions: QuestionState[], dailyCap: number): QuestionState[] {
  return getAllDueQuestions(questions).slice(0, dailyCap)
}

export function questionsOfTopic(questions: QuestionState[], topicId: string): QuestionState[] {
  return questions.filter(q => q.topicId === topicId)
}

export function questionsOfRoute(questions: QuestionState[], route: Route | undefined): QuestionState[] {
  if (!route) return []
  return questions.filter(q => route.topics.includes(q.topicId))
}

export function masteredPct(list: QuestionState[]): number {
  if (!list.length) return 0
  return Math.round((list.filter(q => q.retention >= 75).length / list.length) * 100)
}

/** 连续打卡天数：按刷题流水里出现过的日期回溯 */
export function getStreakDays(logs: StudyLog[], todayCount: number): number {
  const days = new Set(logs.map(l => (l.time || '').slice(0, 10)).filter(Boolean))
  if (todayCount > 0) days.add(todayStr())
  let streak = 0
  const cursor = new Date()
  cursor.setHours(0, 0, 0, 0)
  const fmt = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
  if (!days.has(fmt(cursor))) cursor.setDate(cursor.getDate() - 1)
  while (days.has(fmt(cursor))) {
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

/** 题目 + 进度 合并成运行态对象 */
export function buildQuestionStates(
  questions: Question[],
  topics: { id: string; icon?: string; tone?: string }[],
  routes: Route[],
  srs: Record<string, SrsEntry>,
): QuestionState[] {
  const topicMap = new Map(topics.map(t => [t.id, t]))
  return questions.map((q) => {
    const topic = topicMap.get(q.topicId) || {}
    return {
      ...q,
      topicIcon: topic.icon || '📄',
      tone: topic.tone || 'blue',
      routeIds: routes.filter(r => r.topics.includes(q.topicId)).map(r => r.id),
      ...(srs[q.id] ? { ...NEW_QUESTION_STATE, ...srs[q.id] } : NEW_QUESTION_STATE),
    } as QuestionState
  })
}
