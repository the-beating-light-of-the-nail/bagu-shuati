// 进度只在客户端初始化：预渲染 HTML 里不能出现任何个人进度（既会泄露数据，也会造成 hydration mismatch）
export default defineNuxtPlugin(async () => {
  const srs = useSrsStore()
  await srs.init()
})
