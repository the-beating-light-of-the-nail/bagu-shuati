/**
 * 兼容旧版工作台的深链：`/?q=<id>` 301 到该题的静态页 `/q/<id>`。
 * 题目页既能被搜索引擎索引，也能在页内自测评分，比落在工作台的浮层里更有用。
 */
export default defineEventHandler((event) => {
  const url = getRequestURL(event)
  if (url.pathname !== '/') return
  const id = url.searchParams.get('q')
  if (!id) return
  if (getQuestion(id)) {
    return sendRedirect(event, `/q/${id}`, 301)
  }
})
