/**
 * 站点地图：构建期预渲染成静态 /sitemap.xml。
 * 直接由题库数据生成，不依赖第三方 sitemap 模块（也就少一个依赖与一层不确定性）。
 */
export default defineEventHandler((event) => {
  const siteUrl = useRuntimeConfig().public.siteUrl
  const today = new Date().toISOString().slice(0, 10)
  const urls = [
    { path: '/', priority: '1.0' },
    { path: '/bank', priority: '0.9' },
    ...topics.map(t => ({ path: `/topic/${t.id}`, priority: '0.8' })),
    ...questions.map(q => ({ path: `/q/${q.id}`, priority: '0.6' })),
  ]

  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls.map(u => `<url><loc>${siteUrl}${u.path}</loc><lastmod>${today}</lastmod><priority>${u.priority}</priority></url>`),
    '</urlset>',
  ].join('\n')

  setHeader(event, 'content-type', 'application/xml; charset=utf-8')
  return body
})
