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
index.html                 全部界面与交互逻辑
data/bank.js               题库数据（28 专题 / 787 题，由脚本生成）
tools/import_questions.py  题库解析脚本（仅用 Python 标准库）
```

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
