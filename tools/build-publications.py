#!/usr/bin/env python3
"""Regenerate publications.html from _bibliography/papers.bib.

Author links come from _data/coauthors.yml, so both files stay the single
source of truth. Run from anywhere:

    python3 tools/build-publications.py

Matching rules worth knowing: surnames are compared with accents folded
("Akyurek" matches "Akyürek"), and first names must match exactly -- prefix
matching once linked "Yannis Yiming He" to Yunzhong He via the initial "Y.".
"""
import re, html, io, os, unicodedata

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = HERE
OUT  = os.path.join(HERE, "publications.html")
bib  = open(os.path.join(SITE, "_bibliography", "papers.bib")).read()
coa  = open(os.path.join(SITE, "_data", "coauthors.yml")).read()

def fold(s):
    return "".join(c for c in unicodedata.normalize("NFD", s)
                   if unicodedata.category(c) != "Mn").lower()

people, cur = {}, None
for ln in coa.splitlines():
    m = re.match(r'^"([^"]+)":', ln)
    if m: cur = fold(m.group(1)); people[cur] = []; continue
    m = re.match(r'\s*-\s*firstname:\s*\[(.*?)\]', ln)
    if m:
        people[cur].append([[fold(x.strip().strip('"')) for x in m.group(1).split(",")], None]); continue
    m = re.match(r'\s*url:\s*(\S+)', ln)
    if m and cur and people[cur]: people[cur][-1][1] = m.group(1)

def clean(t): return " ".join(t.replace("{","").replace("}","").split())
def normalize(a):
    a = clean(a)
    if "," in a:
        last, first = [p.strip() for p in a.split(",", 1)]
        return first + " " + last
    return a

def link_author(a):
    disp = normalize(a); bare = disp.replace("*", "")
    if "rezaei" in fold(bare):
        return "<b>MohammadHossein Rezaei" + ("*" if "*" in disp else "") + "</b>"
    parts = bare.split()
    surname, given, first = fold(parts[-1]), fold(" ".join(parts[:-1])), fold(parts[0])
    for aliases, url in people.get(surname, []):
        if url and (given in aliases or first in aliases):
            return '<a href="%s">%s</a>' % (url, html.escape(disp))
    return html.escape(disp)

VENUE = {
 "rezaei2026onlinerubricselicitationpairwise": ("ICML 2026", 2026),
 "mahmoud2026rewardhacking": ("Preprint", 2026),
 "rezaei2026rgsd": ("Preprint", 2026),
 "tyagi2026noteveryrubric": ("Preprint", 2026),
 "gupta2026craft": ("Preprint", 2026),
 "bandi2026mcpatlas": ("Preprint", 2026),
 "raghavendra2026sweatlas": ("Preprint", 2026),
 "wang-etal-2026-commonsense": ("ACL Findings 2026", 2026),
 "rezaei-etal-2025-egonormia": ("ACL Findings 2025", 2025),
 "rezaei-blanco-2025-making": ("NAACL 2025", 2025),
 "rezaei-blanco-2024-paraphrasing": ("ACL 2024", 2024),
 "rezaei-EtAl:2024:SemEval2024": ("SemEval 2024", 2024),
 "sanayei-etal-2024-maria": ("SemEval 2024", 2024),
 "wang-etal-2023-interpreting": ("EMNLP Findings 2023", 2023),
}

ents = {}
for typ, key, body in re.findall(r'@(\w+)\{([^,]+),(.*?)\n\}', bib, re.S):
    def f(n):
        m = re.search(r'\b' + n + r'\s*=\s*[{"](.*)', body, re.S)
        if not m: return ""
        t, depth, out = m.group(1), 1, ""
        for ch in t:
            if ch == "{": depth += 1
            elif ch == "}":
                depth -= 1
                if depth == 0: break
            elif ch == '"' and depth == 1: break
            out += ch
        return clean(out)
    ents[key.strip()] = {k: f(k) for k in
                         ["title","author","url","arxiv","website","code","pdf"]}

# leaderboards are what these three actually are; label them as such
LEADERBOARD = {"rezaei-etal-2025-egonormia", "bandi2026mcpatlas", "raghavendra2026sweatlas"}

def tags(key, e):
    out, seen = [], set()
    # one entry has no url, only an absolute pdf link
    primary = e["url"] or (e["pdf"] if e["pdf"].startswith("http") else "")
    if primary:
        out.append(("Paper", primary)); seen.add(primary)
    if e["arxiv"]:
        u = "https://arxiv.org/abs/" + e["arxiv"]
        if u not in seen and "arxiv.org" not in primary:
            out.append(("arXiv", u))
    if e["website"] and e["website"].startswith("http"):
        out.append(("Leaderboard" if key in LEADERBOARD else "Project", e["website"]))
    if e["code"] and e["code"].startswith("http"):
        out.append(("Code", e["code"]))
    return out

body_html, last = io.StringIO(), None
for key, (venue, year) in VENUE.items():
    e = ents[key]
    ppl = ", ".join(link_author(a) for a in e["author"].split(" and "))
    if year != last:
        body_html.write('\n      <h2>%d</h2>\n' % year); last = year
    tg = "".join('<a href="%s">[%s]</a>' % (u, t) for t, u in tags(key, e))
    note = '<span class="eq">* equal contribution</span>' if "egonormia" in key else ""
    body_html.write(
        '      <div class="entry">\n'
        '        <div class="row"><span class="t">%s</span><span class="v">%s</span></div>\n'
        '        <div class="a">%s</div>\n'
        '        <div class="tags">%s%s</div>\n'
        '      </div>\n' % (html.escape(e["title"]), venue, ppl, tg, note))

PAGE = '''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Publications — MohammadHossein Rezaei</title>
<meta name="color-scheme" content="dark"/>
<link rel="icon" href="assets/img/favicon.ico" sizes="any"/>
<link rel="icon" type="image/png" sizes="32x32" href="assets/img/favicon-32x32.png"/>
<link rel="icon" type="image/png" sizes="16x16" href="assets/img/favicon-16x16.png"/>
<link rel="apple-touch-icon" href="assets/img/apple-touch-icon.png"/>
<link rel="stylesheet" href="assets/css/site.css"/>
</head>
<body class="pubs-page">
<div class="wrap">

  <header>
    <h1>Publications</h1>
    <div class="back"><a href="index.html">&larr; MohammadHossein Rezaei</a></div>
  </header>
''' + body_html.getvalue() + '''
</div>
</body>
</html>
'''
open(OUT, "w").write(PAGE)
print("written; entries:", PAGE.count('class="entry"'), "| tag links:", PAGE.count('class="tags"'))
