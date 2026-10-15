# AI 八股刷题工作台

基于真实面试题库的「艾宾浩斯间隔重复」刷题单页应用：**28 个专题 / 787 道 AI 面试题**，支持沉浸式刷题、记忆留存率追踪、遗忘曲线与专题能力雷达。

## 功能

- **今日抗遗忘队列**：留存率跌破 75% 的题目自动进入复习队列，并按「防雪崩每日上限」限流，避免复习堆积
- **沉浸式刷题层**：先写关键词锚点 → 揭晓标准解析（题库原文 Markdown 渲染 + 原文配图）→ 四档艾宾浩斯评分
- **岗位刷题路线（7 条）/ 专题题库（28 个）**：自由勾选组题、一键智能抽题组卷、待刷清单
- **多维分析**：遗忘曲线、专题记忆雷达、近 16 周刷题热力图、连续打卡天数
- 刷题进度只写在浏览器 localStorage，不采集、不上传任何数据

## 技术栈

零构建静态单页：单个 `index.html` + 原生 JS（ES6+），无框架、无 npm、无后端。

| 层 | 方案 |
|---|---|
| 样式 | Tailwind CSS（CDN JIT，内联自定义配色）+ 少量原生 CSS |
| 图表 | Chart.js 4.4.1（CDN） |
| 图标 / 字体 | Lucide（CDN）、Google Fonts（Inter / JetBrains Mono） |
| 数据 | `data/bank.js`，以 `<script src>` 加载 |
| 持久化 | localStorage（仅存有刷题痕迹的题目增量） |
| Markdown | 页面内自写的轻量渲染器，无第三方库 |
| 数据生成 | `tools/import_questions.py`（Python 3 标准库） |

## 运行

直接双击 `index.html` 即可；或本地起静态服务：

```bash
python -m http.server 8787
# 浏览器打开 http://127.0.0.1:8787/index.html
```

> 注意：Tailwind / Chart.js / Lucide 与题库配图走 CDN（cdn.tailwindcss.com、jsdelivr 等），断网时样式、图表与配图会缺失，题库文本与刷题逻辑不受影响。

## 目录结构

```
index.html                 刷题工作台（全部界面与交互逻辑）
data/bank.js               题库数据（28 专题 / 787 题，由脚本生成）
assets/site.css|site.js    静态题库站的共享样式与自测脚本
bank/index.html            静态站入口：按专题列出全部 787 题
topic/<slug>.html          专题聚合页（28 个）
q/<id>.html                单题页（787 个）
sitemap.xml / robots.txt   搜索引擎收录用
tools/import_questions.py  题库解析脚本（仅用标准库）
tools/build_site.py        静态站生成脚本（仅用标准库）
```

## 静态题库站（面向搜索引擎）

工作台本身是 JS 渲染的单页，搜索引擎抓不到内容。因此额外生成一套「一题一页」的静态站：**每个题目页既是搜索落地页（答案直接写在 HTML 里），又能在页内自测刷题**。

```bash
python tools/build_site.py --base-url https://your-domain.com
```

要点：

- 答案放在 `<details>` 折叠块中 —— 源码里可见（爬虫能索引全文），默认折叠（用户先自测再对答案）
- 每题页带 `title` / `description` / `canonical` / `og:*` / `QAPage` 结构化数据，并有专题页、上下题、同专题内链
- 页内评分写的是**和工作台同一份** localStorage 进度，两边互通
- 专题页 / 首页 / 单题页之间互相链接，`sitemap.xml` 共 816 条 URL

`--base-url` 用于生成 canonical 与 sitemap 的绝对地址，默认值是本仓库的 GitHub Pages 地址；**部署到自定义域名时务必用真实域名重跑**，否则 canonical 会指向错误地址。

部署：仓库为纯静态，直接把 `main` 分支根目录托管到 GitHub Pages / Cloudflare Pages 即可，然后到搜索引擎资源平台提交 `sitemap.xml`。

## 题库再生成

题库更新后重跑解析脚本即可（脚本兼容上游文档的多种标题写法）：

```bash
git clone --depth 1 --filter=blob:none --sparse https://github.com/guocong-bincai/ai-interview-guide.git upstream
git -C upstream sparse-checkout set docs

python tools/import_questions.py --src upstream/docs --out data/bank.js
```

## 数据来源与许可

题目、答案与配图来自 [guocong-bincai/ai-interview-guide](https://github.com/guocong-bincai/ai-interview-guide)（**MIT License**）。

`data/bank.js` 由该仓库 `docs/*/README.md` 解析派生，内容版权归原作者所有；配图不落地，直接通过 jsDelivr CDN 引用上游仓库文件。再分发或商用题库内容时，请遵守上游仓库的 MIT 许可并保留其版权声明。
