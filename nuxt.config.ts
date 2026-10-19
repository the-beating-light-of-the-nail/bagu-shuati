import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import type { Bank } from './shared/bank-types'

// 构建期直接读题库数据，生成 787 单题页 + 28 专题页的预渲染清单
const bank = JSON.parse(
  readFileSync(fileURLToPath(new URL('./data/bank.json', import.meta.url)), 'utf8'),
) as Bank

const siteUrl = process.env.NUXT_PUBLIC_SITE_URL || 'https://the-beating-light-of-the-nail.github.io/bagu-shuati'

const topicRoutes = bank.topics.map(t => `/topic/${t.id}`)
const questionRoutes = bank.questions.map(q => `/q/${q.id}`)
// '/' 不参与预渲染：Nitro 预渲染缓存写入时 unstorage 会对根路径的空 key 抛
// 「Invalid key」，在 cloudflare preset 下会直接让构建失败。工作台改为运行时 SSR，
// SEO 内容页（/bank、/topic/*、/q/*）全部预渲染。
const coreRoutes = ['/bank']

export default defineNuxtConfig({
  compatibilityDate: '2026-10-01',
  devtools: { enabled: false },

  css: ['~/assets/css/main.css'],

  modules: ['@pinia/nuxt'],

  vite: {
    plugins: [tailwindcss()],
  },

  runtimeConfig: {
    public: {
      // 构建期用 NUXT_PUBLIC_SITE_URL 注入正式域名，canonical / sitemap / og 都依赖它
      siteUrl,
    },
  },

  app: {
    head: {
      htmlAttrs: { lang: 'zh-CN' },
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'preconnect', href: 'https://cdn.jsdelivr.net' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap',
        },
      ],
    },
  },

  nitro: {
    // 只有生产构建才用 Cloudflare Workers preset；本地 dev 走默认 node-server，
    // 否则 dev 需要 miniflare 才能跑起来。
    ...(process.env.NODE_ENV === 'production' ? { preset: 'cloudflare_module' } : {}),
    prerender: {
      // 用上面的显式清单而不是爬链：题库答案里带有跨站外链与 `/?q=` 深链，
      // 交给爬虫会去预渲染无意义的带查询参数地址（nitro 会报 500）。
      crawlLinks: false,
      concurrency: 8,
      failOnError: true,
      routes: [...coreRoutes, ...topicRoutes, ...questionRoutes, '/sitemap.xml'],
    },
  },

})
