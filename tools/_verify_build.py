# -*- coding: utf-8 -*-
"""构建产物验收：页面数量、sitemap、单题页 HTML 内容。"""
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)
bank = json.load(open("data/bank.json", encoding="utf-8"))
ids = [q["id"] for q in bank["questions"]]

q_dir = ".output/public/q"
made = set(os.listdir(q_dir))
missing = [i for i in ids if i not in made]

print("题目总数:", len(ids), " 唯一 id:", len(set(ids)))
print("q 页面:", len(made), " 缺页:", len(missing), missing[:5])
print("topic 页面:", len(os.listdir(".output/public/topic")))
print("bank 首页:", os.path.exists(".output/public/bank/index.html"))

sm_path = ".output/public/sitemap.xml"
sm = open(sm_path, encoding="utf-8").read() if os.path.exists(sm_path) else ""
print("sitemap.xml:", os.path.exists(sm_path), " URL 数:", sm.count("<loc>"))

sample = os.path.join(q_dir, "01-basic-concepts-q001", "index.html")
page = open(sample, encoding="utf-8").read()
checks = {
    "题干": "Token 是什么" in page,
    "答案正文(表格)": "<table>" in page,
    "details 折叠": "<details" in page,
    "canonical": 'rel="canonical"' in page,
    "og:title": "og:title" in page,
    "JSON-LD QAPage": "QAPage" in page,
    "上游署名": "guocong-bincai" in page,
}
print("单题页 HTML:", len(page), "字节")
for k, v in checks.items():
    print("   ", ("OK  " if v else "FAIL"), k)

print("robots.txt:", os.path.exists(".output/public/robots.txt"))
print("server bundle:", os.path.exists(".output/server/index.mjs"))
