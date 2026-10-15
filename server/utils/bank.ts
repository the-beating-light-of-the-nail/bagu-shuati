// 题库数据的服务端读取入口（预渲染与 API 共用）。
// 直接 import JSON：只在服务端 / Nitro bundle 里，不会进客户端包。
import bankJson from '../../data/bank.json'
import type { Bank, Question, Topic, Route } from '../../shared/bank-types'

export const bank = bankJson as unknown as Bank
export const questions: Question[] = bank.questions
export const topics: Topic[] = bank.topics
export const routes: Route[] = bank.routes

export function getQuestion(id: string): Question | undefined {
  return questions.find(q => q.id === id)
}

export function getTopic(id: string): Topic | undefined {
  return topics.find(t => t.id === id)
}

export function questionsOfTopic(topicId: string): Question[] {
  return questions.filter(q => q.topicId === topicId)
}

export function getRoute(id: string): Route | undefined {
  return routes.find(r => r.id === id)
}

/** 单题页在所属专题内的前后题，用于静态内链 */
export function neighboursOf(id: string): { prev?: Question; next?: Question } {
  const q = getQuestion(id)
  if (!q) return {}
  const list = questionsOfTopic(q.topicId)
  const i = list.findIndex(x => x.id === id)
  return {
    prev: i > 0 ? list[i - 1] : undefined,
    next: i >= 0 && i + 1 < list.length ? list[i + 1] : undefined,
  }
}
