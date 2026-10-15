# AI 八股刷题工作台

基于真实面试题库的「艾宾浩斯间隔重复」刷题站：**28 个专题 / 787 道 AI 面试题**。

同一份题库有两种呈现，互相打通：

| 形态 | 路由 | 作用 |
|---|---|---|
| 刷题工作台 | `/` | 今日抗遗忘队列、遗忘曲线、专题雷达、热力图、智能组卷、待刷清单 |
| 单题页（SEO 落地页） | `/q/<id>` | **一题一页**：题干与完整答案直接写在 HTML 里（可被搜索引擎收录），答案用 `<details>` 折叠，用户先自测再对答案，页内即可评分 |
| 专题页 / 题库总览 | `/topic/<slug>`、`/bank` | 承接「XX 面试题」类关键词，串起全部内链 |

进度存在浏览器本地（localStorage，键 `bagu_shuati_v1`，与旧版逐字段一致），单题页与工作台的评分**共用同一份进度**。

## 技术栈

- **Nuxt 4**（SSR + 预渲染），部署目标 **Cloudflare Workers**（`nitro.preset = cloudflare_module`）
- **Tailwind CSS v4**（`@tailwindcss/vite`，沿用旧版 `tailwind.config.js` 的 `notion.*` 配色）
- **Chart.js 4.4.1**（薄封装 `ChartCanvas.vue`）、**Pinia**、图标用 `@lucide/vue`
- 题库数据：`data/bank.json`（3.1 MB，由 Python 脚本生成）
- Markdown 渲染：[shared/md.ts](shared/md.ts) —— **SSR 与客户端共用同一份纯函数**，所以没有 hydration mismatch

## 本地开发

```bash
npm install
npm run dev            # http://localhost:3000
```

## 构建与部署（Cloudflare）

```bash
# 构建期必须注入正式域名，否则 canonical / sitemap 会指向错误地址
$env:NUXT_PUBLIC_SITE_URL = "https://your-domain.com"
npx nuxi build --preset=cloudflare_module

npx wrangler deploy .output/server/index.mjs --assets .output/public
```

产物：`.output/public` 下 **787 个单题页 + 28 个专题页 + 题库总览 + sitemap.xml（817 条 URL）+ robots.txt**，`.output/server/index.mjs` 为 Worker 入口。

> `/` 不参与预渲染：Nitro 预渲染写入缓存时 `unstorage` 会对根路径的空 key 抛 `Invalid key`（cloudflare preset 下直接让构建失败），因此工作台走运行时 SSR；SEO 内容页全部预渲染。

## 目录结构

```
app/                  Nuxt 应用（pages / components / composables / stores / layouts）
shared/               两端共用：md.ts（Markdown）、srs-math.ts（间隔复习纯函数）、date.ts、bank-types.ts
server/               Nitro：utils/bank.ts、api/{bank,q,topic,hub}、routes/sitemap.xml、middleware/legacy-q.ts
data/bank.json        题库数据（真源）
public/data/bank.json 工作台运行时懒加载的副本（避免 3.1 MB 进 bundle）
tools/import_questions.py  题库解析脚本（仅用 Python 标准库）
tools/build_site.py / assets/ / index.html / data/bank.js   旧版零构建实现，保留作回滚锚点，验证稳定后可删
```

## 题库更新

```bash
git clone --depth 1 --filter=blob:none --sparse https://github.com/guocong-bincai/ai-interview-guide.git upstream
git -C upstream sparse-checkout set docs
python tools/import_questions.py --src upstream/docs --out data/bank.json --format json
copy data\bank.json public\data\bank.json
```

脚本兼容上游文档的多种标题写法，并为重复题号自动去重（上游 18 大厂题按公司各自从 Q1 编号）。

## 数据来源与许可

题目、答案与配图来自 [guocong-bincai/ai-interview-guide](https://github.com/guocong-bincai/ai-interview-guide)（**MIT License**），版权归原作者所有；本项目仅做结构化整理与刷题交互，配图通过 jsDelivr 引用上游仓库文件。再分发或商用题库内容请遵守上游许可。
