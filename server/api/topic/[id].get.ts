// 专题聚合数据：专题元信息 + 该专题所有题目的轻量列表（不含答案，避免页面过大）
export default defineEventHandler((event) => {
  const id = getRouterParam(event, 'id') as string
  const topic = getTopic(id)
  if (!topic) {
    throw createError({ statusCode: 404, statusMessage: '专题不存在' })
  }
  const questions = questionsOfTopic(id).map(q => ({
    id: q.id,
    title: q.title,
    difficulty: q.difficulty,
    priority: q.priority,
    qNo: q.qNo,
  }))
  return { topic, questions }
})
