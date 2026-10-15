/** 题库数据的类型定义（data/bank.json 的结构） */

export interface Question {
  id: string
  topicId: string
  topicName: string
  category: string
  qNo: number
  title: string
  difficulty: string
  priority: boolean
  points: string[]
  hint: string
  memoryPoint: string
  /** jsDelivr 上的题库原图（可能为空） */
  image: string
  /** 答案 Markdown 原文 */
  answer: string
  sourceUrl: string
}

export interface Topic {
  id: string
  num: string
  name: string
  icon: string
  tone: string
  stars: number
  difficulty: string
  points: string[]
  questionCount: number
}

export interface Route {
  id: string
  name: string
  icon: string
  desc: string
  topics: string[]
}

export interface Bank {
  generatedAt: string
  source: string
  imageBase: string
  counts: { topics: number; questions: number }
  routes: Route[]
  topics: Topic[]
  questions: Question[]
}

/** 单题的间隔复习状态 */
export interface SrsEntry {
  reviewCount: number
  lastReviewedAt: string
  retention: number
  nextReviewText: string
  lastRating: string | null
  userNote: string
}

export interface StudyLog {
  id: string
  qId: string
  qTitle: string
  bankName: string
  time: string
  rating: string
  countAfter: number
  retentionAfter: number
}

/** localStorage / 未来 KV/D1 里保存的进度快照 */
export interface ProgressSnapshot {
  v: number
  srs: Record<string, SrsEntry>
  logs: StudyLog[]
  today: number
  todayDate: string
  dailyCap: number
  selected: string[]
  presetTopics: string[]
}

/** 题目 + 进度合并后的运行态（工作台渲染用的对象） */
export interface QuestionState extends Question {
  topicIcon: string
  tone: string
  routeIds: string[]
  reviewCount: number
  lastReviewedAt: string
  retention: number
  nextReviewText: string
  lastRating: string | null
  userNote: string
}
