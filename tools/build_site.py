#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""把题库数据生成为对搜索引擎友好的静态站（一题一页）。

输入 data/bank.js（由 tools/import_questions.py 生成），输出：
    bank/index.html      题库总览（28 个专题 + 787 题链接），爬虫入口
    topic/<slug>.html    专题聚合页，承接「XX 面试题」类关键词
    q/<id>.html          单题页：题干 + <details> 答案 + 页内自测评分
    sitemap.xml          816 条 URL
    robots.txt

用法:
    python tools/build_site.py --base-url https://your-domain.com
"""
import argparse
import html
import json
import re
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_BASE = "https://the-beating-light-of-the-nail.github.io/bagu-shuati"
SITE_NAME = "AI 八股刷题工作台"
UPSTREAM = "https://github.com/guocong-bincai/ai-interview-guide"
DEFAULT_BASE_PLACEHOLDER = "https://example.com"


# ----------------------------------------------------------------- Markdown
def esc(s):
    return html.escape(s, quote=False)


def attr(s):
    """HTML 属性值转义（题目文本里可能含引号）"""
    return html.escape(str(s), quote=True)


def inline_md(s):
    s = esc(s)
    codes = []

    def stash(m):
        codes.append(m.group(1))
        return "\x00%d\x00" % (len(codes) - 1)

    s = re.sub(r"`([^`]+)`", stash, s)
    s = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", s)
    s = re.sub(r"(^|[^*\w])\*([^*\n]+)\*", r"\1<em>\2</em>", s)
    s = re.sub(r"\[([^\]]+)\]\(([^)\s]+)\)", r'<a href="\2" rel="nofollow noopener" target="_blank">\1</a>', s)
    s = re.sub(r"\x00(\d+)\x00", lambda m: "<code>" + codes[int(m.group(1))] + "</code>", s)
    return s


RE_FENCE = re.compile(r"^\s*```")
RE_TABLE_ROW = re.compile(r"^\s*\|.*\|\s*$")
RE_TABLE_SEP = re.compile(r"^\s*\|[\s:|-]+\|\s*$")
RE_HEADING = re.compile(r"^(#{1,6})\s+(.*)$")
RE_HR = re.compile(r"^\s*([-*_])\1{2,}\s*$")
RE_QUOTE = re.compile(r"^\s*>")
RE_ITEM = re.compile(r"^\s*([-*+]|\d+[.、)])\s+(.*)$")


def split_row(line):
    return [c.strip() for c in line.strip().strip("|").split("|")]


def md_to_html(md):
    if not md:
        return ""
    lines = md.replace("\r\n", "\n").split("\n")
    out, i = [], 0
    while i < len(lines):
        line = lines[i]
        if RE_FENCE.match(line):
            buf = []
            i += 1
            while i < len(lines) and not re.match(r"^\s*```\s*$", lines[i]):
                buf.append(lines[i])
                i += 1
            i += 1
            out.append("<pre><code>%s</code></pre>" % esc("\n".join(buf)))
            continue
        if RE_TABLE_ROW.match(line) and i + 1 < len(lines) and RE_TABLE_SEP.match(lines[i + 1]):
            head = split_row(line)
            i += 2
            rows = []
            while i < len(lines) and RE_TABLE_ROW.match(lines[i]):
                rows.append(split_row(lines[i]))
                i += 1
            out.append(
                "<table><thead><tr>" + "".join("<th>%s</th>" % inline_md(h) for h in head) + "</tr></thead><tbody>"
                + "".join("<tr>" + "".join("<td>%s</td>" % inline_md(c) for c in r) + "</tr>" for r in rows)
                + "</tbody></table>"
            )
            continue
        m = RE_HEADING.match(line)
        if m:
            lvl = min(len(m.group(1)) + 1, 6)
            out.append("<h%d>%s</h%d>" % (lvl, inline_md(m.group(2)), lvl))
            i += 1
            continue
        if RE_HR.match(line):
            out.append("<hr/>")
            i += 1
            continue
        if RE_QUOTE.match(line):
            buf = []
            while i < len(lines) and RE_QUOTE.match(lines[i]):
                buf.append(re.sub(r"^\s*>\s?", "", lines[i]))
                i += 1
            out.append("<blockquote>%s</blockquote>" % inline_md("\n".join(buf)).replace("\n", "<br/>"))
            continue
        m = RE_ITEM.match(line)
        if m:
            ordered = m.group(1)[0].isdigit()
            items = []
            while i < len(lines):
                mm = RE_ITEM.match(lines[i])
                if not mm:
                    break
                items.append(inline_md(mm.group(2)))
                i += 1
            tag = "ol" if ordered else "ul"
            out.append("<%s>%s</%s>" % (tag, "".join("<li>%s</li>" % t for t in items), tag))
            continue
        if not line.strip():
            i += 1
            continue
        buf = []
        while i < len(lines) and lines[i].strip() and not is_block_start(lines[i]):
            buf.append(lines[i])
            i += 1
        out.append("<p>%s</p>" % inline_md("\n".join(buf)).replace("\n", "<br/>"))
    return "\n".join(out)


def is_block_start(line):
    return bool(
        RE_FENCE.match(line) or RE_HEADING.match(line) or RE_QUOTE.match(line)
        or RE_ITEM.match(line) or RE_TABLE_ROW.match(line) or RE_HR.match(line)
    )


def join_desc(title, body):
    """题干本身常以问号结尾，避免出现「？。」这类重复标点"""
    sep = "" if title and title[-1] in "？?。！!：:" else "。"
    return f"{title}{sep}{body}"


def plain_text(md, limit=120):
    """取答案的纯文本摘要用于 meta description / JSON-LD。

    逐行跳过代码块（不能对整段用 `.*?` 贪婪回退匹配，遇到未闭合的
    ``` 会退化成 O(n^2)，787 篇答案叠加后会把生成过程拖到几分钟）。
    """
    kept, in_fence = [], False
    for line in md.replace("\r\n", "\n").split("\n"):
        if line.lstrip().startswith("```"):
            in_fence = not in_fence
            continue
        if not in_fence:
            kept.append(line)
    t = "\n".join(kept)
    t = re.sub(r"[|#>*`\-]", " ", t)
    t = re.sub(r"\s+", " ", t).strip()
    return t[:limit]


# ----------------------------------------------------------------- 模板
def page_shell(title, desc, canonical, extra_head, body, depth, jsonld=""):
    up = "../" * depth
    ld = ('<script type="application/ld+json">%s</script>' % json.dumps(jsonld, ensure_ascii=False)) if jsonld else ""
    return f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{esc(title)}</title>
<meta name="description" content="{esc(desc)}">
<link rel="canonical" href="{canonical}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="{SITE_NAME}">
<meta property="og:title" content="{esc(title)}">
<meta property="og:description" content="{esc(desc)}">
<meta property="og:url" content="{canonical}">
{extra_head}
<meta name="twitter:card" content="summary_large_image">
<link rel="stylesheet" href="{up}assets/site.css">
{ld}
</head>
<body>
<header class="topbar">
  <a class="brand" href="{up}bank/index.html">{SITE_NAME}</a>
  <nav class="topnav">
    <a href="{up}bank/index.html">题库总览</a>
    <a class="cta" href="{up}index.html">进入刷题工作台</a>
  </nav>
</header>
<main class="wrap">
{body}
</main>
<footer class="foot">
  <p>题库内容来自 <a href="{UPSTREAM}" rel="noopener" target="_blank">guocong-bincai/ai-interview-guide</a>（MIT License），版权归原作者所有，本项目仅做结构化整理与刷题交互。</p>
  <p class="muted">刷题进度保存在你自己的浏览器本地，不会上传。</p>
</footer>
<script src="{up}assets/site.js" defer></script>
</body>
</html>
"""


def question_page(q, prev_q, next_q, siblings, base_url, depth=1):
    canonical = f"{base_url}/q/{q['id']}.html"
    title = f"{q['title']}｜{q['topicName']}面试题参考答案 | {SITE_NAME}"
    plain = plain_text(q["answer"], 4000)
    desc = join_desc(q["title"], plain[:110])
    image_head = f'<meta property="og:image" content="{attr(q["image"])}">' if q.get("image") else ""
    answer_md = md_to_html(q["answer"])
    illus = (
        f'<figure class="illus"><a href="{attr(q["image"])}" target="_blank" rel="noopener">'
        f'<img src="{attr(q["image"])}" alt="{attr(q["title"])} 图解" loading="lazy"></a>'
        f"<figcaption>题库原图 · 图文双通道记忆</figcaption></figure>"
    ) if q.get("image") else ""
    badges = [
        f'<span class="badge tone">{esc(q["topicName"])}</span>',
        f'<span class="badge">{esc(q["difficulty"])}</span>',
    ]
    if q.get("priority"):
        badges.append('<span class="badge hot">高频必考</span>')
    if q.get("category"):
        badges.append(f'<span class="badge">{esc(q["category"])}</span>')

    related = "".join(
        f'<li><a href="{s["id"]}.html">{esc(s["title"])}</a></li>'
        for s in siblings[:10] if s["id"] != q["id"]
    )

    pager = (
        (f'<a class="pg" href="{prev_q["id"]}.html">← 上一题：{esc(prev_q["title"][:28])}</a>' if prev_q else "<span></span>")
        + (f'<a class="pg" href="{next_q["id"]}.html">下一题：{esc(next_q["title"][:28])} →</a>' if next_q else "<span></span>")
    )

    body = f"""<nav class="crumbs" aria-label="面包屑">
  <a href="../bank/index.html">题库总览</a> ›
  <a href="../topic/{q['topicId']}.html">{esc(q['topicName'])}</a> ›
  <span>第 {q['qNo']} 题</span>
</nav>

<article class="card">
  <h1>{esc(q['title'])}</h1>
  <div class="meta">{''.join(badges)}<span class="badge srs" data-srs-pill>尚未刷过</span></div>

  <div class="selftest">
    <p class="lead">先在心里组织一遍答案，再展开参考答案对照。展开后可以给自己评一档，进度会同步到刷题工作台。</p>
    <details class="answer" data-answer>
      <summary>展开参考答案</summary>
      <div class="answer-md">{answer_md}</div>
      {illus}
      <div class="rate" data-rate-box>
        <p class="rate-title">自测评分（与工作台共用同一份进度）</p>
        <div class="rate-btns">
          <button type="button" class="r-forgot" data-rate="forgot">1 · 忘记了<br><sub>10 分钟后重刷</sub></button>
          <button type="button" class="r-hard" data-rate="hard">2 · 印象模糊<br><sub>1 天后复习</sub></button>
          <button type="button" class="r-good" data-rate="good">3 · 比较熟悉<br><sub>3 天后复习</sub></button>
          <button type="button" class="r-easy" data-rate="easy">4 · 完全掌握<br><sub>7 天后复习</sub></button>
        </div>
      </div>
    </details>
  </div>

  <div class="jump">
    <a class="btn primary" href="../index.html?q={q['id']}">在刷题工作台打开这题</a>
    <a class="btn" href="../index.html">进入工作台刷全部 787 题</a>
  </div>
</article>

<nav class="pager">{pager}</nav>

<section class="related">
  <h2>「{esc(q['topicName'])}」其他面试题</h2>
  <ul>{related}</ul>
  <p><a href="../topic/{q['topicId']}.html">查看整个专题（{len(siblings)} 题）→</a></p>
</section>

<p class="source">本题原文：<a href="{attr(q['sourceUrl'])}" rel="nofollow noopener" target="_blank">ai-interview-guide / {esc(q['topicName'])}</a></p>"""

    jsonld = {
        "@context": "https://schema.org",
        "@type": "QAPage",
        "mainEntity": {
            "@type": "Question",
            "name": q["title"],
            "acceptedAnswer": {"@type": "Answer", "text": plain[:400]},
        },
    }
    extra = f'<body data-qid="{attr(q["id"])}" data-qtitle="{attr(q["title"])}" data-topic="{attr(q["topicName"])}">'
    return page_shell(title, desc, canonical, image_head, body, depth, jsonld).replace("<body>", extra)


def topic_page(topic, questions, base_url):
    canonical = f"{base_url}/topic/{topic['id']}.html"
    title = f"{topic['name']}面试题（共 {topic['questionCount']} 题）| {SITE_NAME}"
    desc = f"{topic['name']}方向的 AI 面试题共 {topic['questionCount']} 道，覆盖 {('、'.join(topic['points']) or '核心考点')}，每题都有参考答案与自测评分。"
    items = "".join(
        f'<li><a href="../q/{q["id"]}.html">{esc(q["title"])}</a>'
        f'<span class="badge">{esc(q["difficulty"])}</span></li>'
        for q in questions
    )
    body = f"""<nav class="crumbs"><a href="../bank/index.html">题库总览</a> › <span>{esc(topic['name'])}</span></nav>
<article class="card">
  <h1>{esc(topic['name'])}面试题</h1>
  <div class="meta"><span class="badge tone">{topic['icon']} {esc(topic['name'])}</span>
    <span class="badge">{topic['difficulty']}</span>
    <span class="badge">{topic['questionCount']} 题</span></div>
  <p class="lead">{esc(desc)}</p>
  <ol class="qlist">{items}</ol>
  <div class="jump"><a class="btn primary" href="../index.html">进入刷题工作台</a></div>
</article>"""
    jsonld = {
        "@context": "https://schema.org",
        "@type": "ItemList",
        "name": f"{topic['name']}面试题",
        "numberOfItems": len(questions),
        "itemListElement": [
            {"@type": "ListItem", "position": i + 1, "url": f"{base_url}/q/{q['id']}.html", "name": q["title"]}
            for i, q in enumerate(questions)
        ],
    }
    return page_shell(title, desc, canonical, "", body, 1, jsonld)


def hub_page(topics, by_topic, base_url):
    canonical = f"{base_url}/bank/index.html"
    title = f"AI 面试题库总览：{len(topics)} 个专题 / {sum(len(v) for v in by_topic.values())} 道题 | {SITE_NAME}"
    desc = "按专题列出全部 AI 面试题，每题含参考答案、图解与自测评分，可直接在页面内刷题。"
    blocks = []
    for t in topics:
        qs = by_topic.get(t["id"], [])
        links = "".join(f'<li><a href="../q/{q["id"]}.html">{esc(q["title"])}</a></li>' for q in qs)
        blocks.append(
            f"""<section class="topic-block">
  <h2><a href="../topic/{t['id']}.html">{t['icon']} {esc(t['name'])}</a>
    <span class="badge">{len(qs)} 题</span><span class="badge">{t['difficulty']}</span></h2>
  <p class="muted">{esc(' · '.join(t['points']) or '核心考点')}</p>
  <ol class="qlist">{links}</ol>
</section>"""
        )
    body = f"""<article class="card">
  <h1>AI 面试题库总览</h1>
  <p class="lead">{esc(desc)}</p>
  <div class="jump">
    <a class="btn primary" href="../index.html">进入刷题工作台（间隔复习 + 进度分析）</a>
  </div>
  {''.join(blocks)}
</article>"""
    return page_shell(title, desc, canonical, "", body, 1)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", default=str(ROOT / "data" / "bank.js"))
    ap.add_argument("--out", default=str(ROOT))
    ap.add_argument("--base-url", default=DEFAULT_BASE)
    args = ap.parse_args()

    raw = Path(args.data).read_text(encoding="utf-8")
    payload = raw[raw.index("=") + 1:].rstrip().rstrip(";")
    bank = json.loads(payload)
    base_url = args.base_url.rstrip("/")
    if base_url == DEFAULT_BASE_PLACEHOLDER:
        print("!! 正在使用占位域名，canonical/sitemap 需要换成正式域名后重跑（--base-url）")

    out = Path(args.out)
    (out / "q").mkdir(parents=True, exist_ok=True)
    (out / "topic").mkdir(parents=True, exist_ok=True)
    (out / "bank").mkdir(parents=True, exist_ok=True)

    by_topic = {}
    for q in bank["questions"]:
        by_topic.setdefault(q["topicId"], []).append(q)

    written = 0
    sitemap = []
    tasks = []  # (路径, 页面内容)，最后并行落盘
    for topic in bank["topics"]:
        tqs = by_topic.get(topic["id"], [])
        tasks.append((out / "topic" / f"{topic['id']}.html", topic_page(topic, tqs, base_url)))
        sitemap.append((f"{base_url}/topic/{topic['id']}.html", "0.8"))
        written += 1
        for i, q in enumerate(tqs):
            tasks.append((
                out / "q" / f"{q['id']}.html",
                question_page(
                    q,
                    tqs[i - 1] if i else None,
                    tqs[i + 1] if i + 1 < len(tqs) else None,
                    tqs,
                    base_url,
                ),
            ))
            sitemap.append((f"{base_url}/q/{q['id']}.html", "0.6"))
            written += 1

    tasks.append((out / "bank" / "index.html", hub_page(bank["topics"], by_topic, base_url)))
    sitemap.insert(0, (f"{base_url}/bank/index.html", "1.0"))

    # 近 800 个小文件串行写盘会受杀软扫描影响，用线程池并发写入
    print(f"开始写入 {len(tasks)} 个页面 ...", flush=True)

    def write_one(item):
        path, content = item
        path.write_text(content, encoding="utf-8")
        return len(content)

    from concurrent.futures import ThreadPoolExecutor
    total_bytes = 0
    with ThreadPoolExecutor(max_workers=16) as pool:
        for n, size in enumerate(pool.map(write_one, tasks), 1):
            total_bytes += size
            if n % 200 == 0:
                print(f"  已写入 {n}/{len(tasks)} 页", flush=True)

    today = date.today().isoformat()
    sm = ['<?xml version="1.0" encoding="UTF-8"?>',
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for loc, prio in sitemap:
        sm.append(f"<url><loc>{loc}</loc><lastmod>{today}</lastmod><priority>{prio}</priority></url>")
    sm.append("</urlset>")
    (out / "sitemap.xml").write_text("\n".join(sm), encoding="utf-8")
    (out / "robots.txt").write_text(
        f"User-agent: *\nAllow: /\n\nSitemap: {base_url}/sitemap.xml\n", encoding="utf-8")

    print(f"生成 {written} 个页面（其中单题页 {len(bank['questions'])}），共 {total_bytes / 1024 / 1024:.1f} MB")
    print(f"sitemap.xml 共 {len(sitemap)} 条 URL，base-url = {base_url}")
    print("输出目录：", out / "q", "、", out / "topic", "、", out / "bank")


if __name__ == "__main__":
    main()
