// 单题数据（含所属专题与前后题），供 /q/[id] 页面在预渲染与客户端导航时使用
export default defineEventHandler((event) => {
  const id = getRouterParam(event, 'id') as string
  const question = getQuestion(id)
  if (!question) {
    throw createError({ statusCode: 404, statusMessage: '题目不存在' })
  }
  const topic = getTopic(question.topicId) || null
  const { prev, next } = neighboursOf(id)
  return { question, topic, prev: prev || null, next: next || null }
})
