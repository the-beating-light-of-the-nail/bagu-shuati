// 题库总览数据：28 个专题 + 全部题目的轻量索引（爬虫入口页用）
export default defineEventHandler(() => ({
  topics,
  routes,
  total: questions.length,
  questions: questions.map(q => ({
    id: q.id,
    title: q.title,
    topicId: q.topicId,
    difficulty: q.difficulty,
    priority: q.priority,
  })),
}))
