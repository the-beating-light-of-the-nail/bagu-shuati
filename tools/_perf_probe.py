# -*- coding: utf-8 -*-
"""临时诊断：逐题渲染，找出耗时异常或抛错的题目。"""
import json
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "tools"))
import build_site as b  # noqa: E402

raw = (ROOT / "data" / "bank.js").read_text(encoding="utf-8")
bank = json.loads(raw[raw.index("=") + 1:].rstrip().rstrip(";"))

slowest = []
t_all = time.time()
for n, q in enumerate(bank["questions"], 1):
    t = time.time()
    try:
        html = b.md_to_html(q["answer"])
        plain = b.plain_text(q["answer"], 4000)
    except Exception as e:  # noqa: BLE001
        print(f"[FAIL] #{n} {q['id']} len={len(q['answer'])} -> {type(e).__name__}: {e}", flush=True)
        continue
    dt = time.time() - t
    slowest.append((dt, q["id"], len(q["answer"]), len(html), len(plain)))
    if dt > 0.5 or n % 100 == 0:
        print(f"#{n} {q['id']} md={len(q['answer'])} html={len(html)} {dt:.3f}s", flush=True)

slowest.sort(reverse=True)
print("\n最慢 8 题：", flush=True)
for dt, qid, mdsz, hsz, psz in slowest[:8]:
    print(f"  {dt:6.3f}s  {qid}  md={mdsz} html={hsz} plain={psz}", flush=True)
print(f"全部耗时 {time.time() - t_all:.1f}s", flush=True)
