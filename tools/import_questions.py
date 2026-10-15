#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""把 ai-interview-guide 仓库的 docs/*/README.md 转成前端可直接加载的题库数据。

用法:
    python tools/import_questions.py --src <仓库 docs 目录> --out data/bank.js

数据来源: https://github.com/guocong-bincai/ai-interview-guide
仅依赖 Python 标准库。
"""
import argparse
import json
import re
from pathlib import Path

REPO = "guocong-bincai/ai-interview-guide"
CDN = f"https://cdn.jsdelivr.net/gh/{REPO}@main"
RAW = f"https://github.com/{REPO}/blob/main"

# 题目起始标记的几种写法（不同专题文档格式并不统一）
#   1) `### Q1: 题目`            2) `##### 字节 Q1：题目`（18 大厂题）
#   3) `## 1. 题目`（01 基础概念）4) `### 专题/高频追问：题目`
RE_Q = re.compile(r"^#{2,6}\s*(?P<pre>[\w\u4e00-\u9fff]{0,6}?)\s*Q\s*(?P<no>\d+)\s*[:：.、]\s*(?P<title>.+)$", re.I)
RE_NUM = re.compile(r"^##\s*(?P<no>\d+)\s*[.、]\s*(?P<title>.+)$")
RE_SUB = re.compile(r"^####\s*(?P<no>\d+)\s*[.、]\s*(?P<title>.+)$")
RE_HF = re.compile(r"^#{2,4}\s*(?P<kind>高频追问)\s*[:：]\s*(?P<title>.+)$")
# 二级标题（非题目）视为分节标题，其下的散落内容直接丢弃
RE_SECTION = re.compile(r"^##\s+(.*)$")
RE_IMG = re.compile(r"(?:assets/illustrations/[^\s\"')]+\.(?:webp|png|jpg|jpeg))")
RE_STARS = re.compile(r"⭐")
RE_NUMBER = re.compile(r"Q?\s*(\d+)")

# 各专题的展示配色 / 图标，按顺序循环分配
ICONS = ["📘", "🧩", "🔍", "🧠", "🤖", "📊", "🎯", "⚡", "🛡️", "🚀", "🖼️", "🧰",
         "👥", "🔌", "🧪", "📄", "💻", "🏢", "⚙️", "✨", "🌀", "🪞", "🔭", "🐍",
         "🏗️", "🧑‍💼", "📁", "✅"]
TONES = ["blue", "purple", "orange", "green", "red"]
# 岗位路线定义，来自仓库根 README「选择你的 AI 岗位路线」
ROUTES = [
    {"id": "route_app", "name": "AI 应用 / LLM 应用工程师", "icon": "🚀", "desc": "从模型能力走到可上线的业务系统：基础 → Prompt → RAG → Agent → 生产部署 → AI 系统设计。",
     "topics": ["01-basic-concepts", "02-prompt-engineering", "03-rag-system", "05-ai-agent-basics", "10-production-deployment", "25-system-design-ai"]},
    {"id": "route_rag", "name": "RAG 工程师", "icon": "📘", "desc": "从召回链路走到评测与生产治理：RAG 系统 → 向量索引 → 高级优化 → 安全评估 → 可观测性。",
     "topics": ["01-basic-concepts", "03-rag-system", "06-vector-index-optimization", "20-rag-advanced-optimization", "09-ai-safety-evaluation", "23-agent-observability"]},
    {"id": "route_agent", "name": "Agent 工程师", "icon": "🤖", "desc": "从工具调用走到规划、协作与治理：Agent 基础 → 规划反思 → 多 Agent → MCP/Skills → 可观测性。",
     "topics": ["02-prompt-engineering", "05-ai-agent-basics", "22-agent-planning-reflection", "13-multi-agent-systems", "14-mcp-skill-systems", "23-agent-observability"]},
    {"id": "route_ml", "name": "模型训练与推理工程师", "icon": "🧠", "desc": "从架构原理走到吞吐与部署：Transformer → 模型训练 → 推理优化 → 推理框架 → 生产部署。",
     "topics": ["04-transformer-architecture", "07-model-training", "08-inference-optimization", "19-inference-frameworks", "10-production-deployment"]},
    {"id": "route_fde", "name": "Forward Deployed Engineer", "icon": "🧑‍💼", "desc": "从开放问题走到客户生产结果：项目经验 → Python 工程 → AI 系统设计 → 生产部署 → FDE 专题。",
     "topics": ["27-project-experience", "24-python-engineering", "25-system-design-ai", "10-production-deployment", "26-forward-deployed-engineer"]},
    {"id": "route_mm", "name": "多模态 AI 工程师", "icon": "🖼️", "desc": "从多模态理解走到视觉工具与实时交互：Transformer → 多模态 AI → 多模态 Agent → 推理优化 → 生产部署。",
     "topics": ["04-transformer-architecture", "11-multimodal-ai", "21-multimodal-agents", "08-inference-optimization", "10-production-deployment"]},
    {"id": "route_safety", "name": "AI 安全与评测工程师", "icon": "🛡️", "desc": "从评测方法走到风险控制与线上监测：LLM 基础 → Prompt → 安全评估 → 可观测性 → 生产部署。",
     "topics": ["01-basic-concepts", "02-prompt-engineering", "09-ai-safety-evaluation", "23-agent-observability", "10-production-deployment"]},
]

# 各专题展示名（仓库 README 题库导航中的简称），缺省时回退到文档一级标题
TOPIC_LABELS = {
    "01-basic-concepts": "LLM 基础",
    "02-prompt-engineering": "Prompt 工程",
    "03-rag-system": "RAG 系统",
    "04-transformer-architecture": "Transformer 架构",
    "05-ai-agent-basics": "Agent 基础",
    "06-vector-index-optimization": "向量检索优化",
    "07-model-training": "模型训练",
    "08-inference-optimization": "推理优化",
    "09-ai-safety-evaluation": "安全与评测",
    "10-production-deployment": "生产部署",
    "11-multimodal-ai": "多模态 AI",
    "12-frameworks-tools": "框架与工具",
    "13-multi-agent-systems": "多 Agent 系统",
    "14-mcp-skill-systems": "MCP 与 Skills",
    "15-advanced-topics": "进阶专题",
    "16-resume-interview-tips": "简历与面试技巧",
    "17-ai-coding-tools": "AI 编程工具",
    "18-big-tech-interview-questions": "大厂面试题",
    "19-inference-frameworks": "推理框架",
    "20-rag-advanced-optimization": "RAG 高级优化",
    "21-multimodal-agents": "多模态 Agent",
    "22-agent-planning-reflection": "规划与反思",
    "23-agent-observability": "Agent 可观测性",
    "24-python-engineering": "Python 工程",
    "25-system-design-ai": "AI 系统设计",
    "26-forward-deployed-engineer": "FDE",
    "27-project-experience": "项目经验",
    "28-test-harness-evaluation": "测试 Harness",
}

DROP_LINE_RE = [
    re.compile(r"^</?details>\s*$", re.I),
    re.compile(r"^<summary>.*</summary>\s*$", re.I),
    re.compile(r"^>+\s*\*{0,2}(难度|更新|考点|面试优先顺序)"),
    re.compile(r"^>+\s*🧠\s*\*{0,2}图解记忆"),
    re.compile(r"^\*{0,2}(上一模块|下一模块)[:：]"),
    re.compile(r"^\[返回目录\s*→\]"),
]


def clean_topic_name(raw: str, fallback: str) -> str:
    name = re.sub(r"^[^\w\u4e00-\u9fff]+", "", raw).strip()
    name = re.sub(r"（[^）]*）", "", name).strip()
    for suffix in ("面试题", "面试真题", "面试宝典", "题库", "指南"):
        if name.endswith(suffix) and len(name) > len(suffix):
            name = name[: -len(suffix)].strip()
    return name or fallback


def parse_meta(lines):
    stars, points, priority = 0, [], []
    for ln in lines[:40]:
        m = re.match(r"^>\s*\*\*难度：?\*\*", ln)
        if m:
            stars = len(RE_STARS.findall(ln))
        m = re.match(r"^>\s*\*\*考点：?\*\*", ln)
        if m:
            points = [p.strip() for p in re.split(r"[、,，/]", ln.split("**", 2)[-1].strip()) if p.strip()]
        if ln.startswith(">") and "面试优先顺序" in ln:
            seg = ln.split("：", 1)[-1]
            seg = seg.split("。", 1)[0]
            priority = [int(n) for n in RE_NUMBER.findall(seg)]
    return stars, points, priority


def stars_to_difficulty(stars: int) -> str:
    if stars <= 2:
        return "简单"
    if stars == 3:
        return "中等"
    return "困难"


def parse_answer(raw_lines):
    """清洗答案正文，返回 (markdown, image_url, memory_point)"""
    image, memory, kept, in_center = "", "", [], False
    for ln in raw_lines:
        s = ln.rstrip()
        img = RE_IMG.search(s)
        sub = re.search(r"<sub>(.*?)</sub>", s, re.S)
        quote_mem = re.match(r"^>+\s*🧠\s*\*{0,2}图解记忆[:：]?\*{0,2}\s*(.+)$", s)

        if in_center:  # 插图块内的续行
            if img and not image:
                image = img.group(0)
            if sub and not memory:
                memory = re.sub(r"<[^>]+>", "", sub.group(1)).strip()
            if "</p>" in s:
                in_center = False
            continue

        if "<p align=\"center\"" in s:
            if img and not image:
                image = img.group(0)
            if sub and not memory:
                memory = re.sub(r"<[^>]+>", "", sub.group(1)).strip()
            if "</p>" not in s:
                in_center = True
            continue

        if img and ("<img" in s or "<a href" in s):
            if not image:
                image = img.group(0)
            continue

        if quote_mem:
            if not memory:
                memory = quote_mem.group(1).strip()
            continue

        if any(rx.search(s) for rx in DROP_LINE_RE):
            continue
        kept.append(s)

    text = "\n".join(kept)
    text = re.sub(r"\n{3,}", "\n\n", text).strip()
    text = re.sub(r"^(?:-{3,}|\*{3,})\s*\n?", "", text)
    text = re.sub(r"\n(?:-{3,}|\*{3,})\s*$", "", text).strip()
    return text, image, memory


def parse_topic_file(path: Path, topic_id: str, order: int):
    lines = path.read_text(encoding="utf-8").splitlines()
    raw_title = next((re.sub(r"^#\s*", "", l) for l in lines if re.match(r"^#\s", l)), topic_id)
    name = TOPIC_LABELS.get(topic_id) or clean_topic_name(raw_title, topic_id)
    stars, points, priority = parse_meta(lines)
    stars = stars or 3  # 少数专题文档没有标注难度，按中等处理

    questions, cur, buffer, section = [], None, [], ""
    idx = 0
    used_ids = {}  # 同一专题内题号可能重复（如 18 大厂题按公司各自从 Q1 编号）

    def flush():
        nonlocal cur, buffer
        if cur is None:
            buffer = []
            return
        answer, image, memory = parse_answer(buffer)
        # 只有标题没有正文的容器型标题（如「高频追问：xxx」）直接丢弃
        if len(re.sub(r"\s+", "", answer)) < 30:
            cur, buffer = None, []
            return
        diff = cur["difficulty"] or stars_to_difficulty(stars)
        qid = f"{topic_id}-q{cur['no']:03d}"
        if qid in used_ids:
            used_ids[qid] += 1
            qid = f"{qid}-{used_ids[qid]}"
        else:
            used_ids[qid] = 1
        q = {
            "id": qid,
            "topicId": topic_id,
            "topicName": name,
            "category": cur["category"],
            "qNo": cur["no"],
            "title": cur["title"],
            "difficulty": diff,
            "priority": cur["no"] in priority,
            "points": points,
            "hint": memory or (points[0] if points else ""),
            "memoryPoint": memory,
            "image": f"{CDN}/{image}" if image else "",
            "answer": answer,
            "sourceUrl": f"{RAW}/docs/{topic_id}/README.md",
        }
        questions.append(q)
        cur, buffer = None, []

    for ln in lines:
        m = RE_Q.match(ln) or RE_NUM.match(ln) or RE_HF.match(ln)
        if m:
            flush()
            idx += 1
            no = int(m.group("no")) if "no" in m.groupdict() else None
            title = m.group("title").strip()
            if m.re is RE_Q:
                pre = (m.group("pre") or "").strip()
                title = f"{pre} {title}".strip() if pre else title
            elif m.re is RE_HF:
                title = f"{m.group('kind')}：{title}"
            cur = {"no": no or idx, "title": title, "category": section, "difficulty": None}
            buffer = []
            continue
        sub = RE_SUB.match(ln)
        if sub:
            flush()
            label = sub.group("title").strip()
            section = f"{section} · {label}" if section else label
            continue
        if RE_SECTION.match(ln):
            flush()
            section = RE_SECTION.match(ln).group(1).strip()
            section = re.sub(r"^[^\w\u4e00-\u9fff]+", "", section).strip()
            if "目录" in section or "返回" in section:
                section = ""
            continue
        if cur is not None:
            star_line = re.match(r"^>+\s*\*\*难度：?\*\*", ln)
            if star_line and cur["difficulty"] is None:
                cur["difficulty"] = stars_to_difficulty(len(RE_STARS.findall(ln)))
            buffer.append(ln)

    flush()
    topic = {
        "id": topic_id,
        "num": f"{order:02d}",
        "name": name,
        "icon": ICONS[(order - 1) % len(ICONS)],
        "tone": TONES[(order - 1) % len(TONES)],
        "stars": stars,
        "difficulty": stars_to_difficulty(stars),
        "points": points,
        "questionCount": len(questions),
    }
    return topic, questions


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", required=True, help="仓库的 docs 目录")
    ap.add_argument("--out", default="data/bank.js")
    ap.add_argument("--format", choices=["js", "json"], default="js")
    args = ap.parse_args()

    src = Path(args.src)
    topics, questions, report = [], [], []
    dirs = sorted([d for d in src.iterdir() if d.is_dir() and re.match(r"^\d{2}-", d.name)])
    for i, d in enumerate(dirs, start=1):
        readme = d / "README.md"
        if not readme.exists():
            continue
        topic, qs = parse_topic_file(readme, d.name, i)
        topics.append(topic)
        questions.extend(qs)
        report.append(f"  {d.name:<34} {len(qs):>3} 题")

    bank = {
        "generatedAt": __import__("datetime").datetime.now().strftime("%Y-%m-%d %H:%M"),
        "source": f"https://github.com/{REPO}",
        "imageBase": CDN,
        "counts": {"topics": len(topics), "questions": len(questions)},
        "routes": ROUTES,
        "topics": topics,
        "questions": questions,
    }
    payload = json.dumps(bank, ensure_ascii=False, separators=(",", ":"))
    payload = payload.replace("</", "<\\/").replace("\u2028", "\\u2028").replace("\u2029", "\\u2029")

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    if args.format == "js":
        out.write_text("window.AI_INTERVIEW_BANK=" + payload + ";\n", encoding="utf-8")
    else:
        out.write_text(payload, encoding="utf-8")

    print("专题解析结果：")
    print("\n".join(report))
    print(f"\n共 {len(topics)} 个专题 / {len(questions)} 道题 -> {out} ({out.stat().st_size / 1024 / 1024:.2f} MB)")


if __name__ == "__main__":
    main()
