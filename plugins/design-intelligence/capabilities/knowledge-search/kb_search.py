#!/usr/bin/env python3
"""Design Intelligence — Knowledge-Base Search (plugin capability, NOT a skill).

Deterministic, dependency-free search over _shared/knowledge and _shared/config.
No embeddings/vectors. Splits each knowledge file into heading-delimited
sections, scores sections against the query by term overlap, and returns the
best matches with source file + section + snippet + relevance. Returns
NO_KNOWLEDGE_FOUND when nothing clears the threshold — never fabricates.

Usage:
  python3 kb_search.py "what is the mobile touch target?"
  python3 kb_search.py --json "canonical primary color"
  python3 kb_search.py --workspace DIR "primary color"
Search roots: the org's local overlay (<workspace>/knowledge and <workspace>/config,
default ./.claude/design-intelligence) first, then the plugin's bundled
../../_shared files that the overlay does not override (bundled values are an
illustrative example).
"""
import sys, os, re, json

ROOT = os.path.dirname(os.path.abspath(__file__))
SHARED = os.path.normpath(os.path.join(ROOT, "..", "..", "_shared"))
SUBDIRS = ("knowledge", "config")


def take_workspace(argv):
    """Pop `--workspace DIR` from argv and return the org's local overlay folder.

    Order: --workspace DIR, then $DESIGN_INTELLIGENCE_HOME, then
    ./.claude/design-intelligence (git-ignored, in the project you run from).
    See _shared/config/org-design-system.md.
    """
    if "--workspace" in argv:
        i = argv.index("--workspace")
        if i + 1 >= len(argv):
            print("--workspace needs a directory"); sys.exit(2)
        path = argv[i + 1]
        del argv[i:i + 2]
        return os.path.abspath(path)
    env = os.environ.get("DESIGN_INTELLIGENCE_HOME")
    return os.path.abspath(env or os.path.join(os.getcwd(), ".claude", "design-intelligence"))
STOP = set("a an the of to in on for is are be do how what which when where "
           "should must can could this that these those and or with as it its "
           "use used using our my your value values".split())
THRESHOLD = 1.5  # minimum score to count as a hit


def tokenize(text):
    return [w for w in re.findall(r"[a-zA-Z0-9#.\-]+", text.lower()) if w not in STOP and len(w) > 1]


def split_sections(md):
    """Split markdown into (heading, body) sections on ## / ### / # headings."""
    sections, cur_h, cur = [], "(intro)", []
    for line in md.splitlines():
        if re.match(r"^#{1,6}\s", line):
            if cur:
                sections.append((cur_h, "\n".join(cur).strip()))
            cur_h = re.sub(r"^#{1,6}\s+", "", line).strip()
            cur = []
        else:
            cur.append(line)
    if cur:
        sections.append((cur_h, "\n".join(cur).strip()))
    return sections


def gather(workspace):
    """Overlay files first; a bundled file is skipped when the overlay overrides it."""
    docs, seen = [], set()
    roots = [(workspace, ".claude/design-intelligence/"), (SHARED, "_shared/")]
    for base, label in roots:
        for sub in SUBDIRS:
            d = os.path.join(base, sub)
            if not os.path.isdir(d):
                continue
            for fn in sorted(os.listdir(d)):
                if not fn.endswith(".md") or (sub, fn) in seen:
                    continue
                seen.add((sub, fn))
                with open(os.path.join(d, fn), encoding="utf-8") as f:
                    md = f.read()
                for h, body in split_sections(md):
                    if body:
                        docs.append({"file": f"{label}{sub}/{fn}",
                                     "section": h, "body": body})
    return docs


def score(qtokens, sec):
    hay = tokenize(sec["section"] + " " + sec["body"])
    if not hay:
        return 0.0
    hayset = set(hay)
    s = 0.0
    for qt in qtokens:
        if qt in set(tokenize(sec["section"])):
            s += 2.0            # heading match weighted higher
        elif qt in hayset:
            s += 1.0
    # small boost for exact multi-term co-occurrence
    return s


def search(query, top=3, workspace=None):
    q = tokenize(query)
    if not q:
        return []
    scored = []
    for sec in gather(workspace or take_workspace([])):
        sc = score(q, sec)
        if sc >= THRESHOLD:
            body = sec["body"]
            snippet = (body[:280] + "…") if len(body) > 280 else body
            scored.append({"file": sec["file"], "section": sec["section"],
                           "relevance": round(sc, 1), "snippet": snippet})
    scored.sort(key=lambda x: x["relevance"], reverse=True)
    return scored[:top]


def main():
    argv = sys.argv[1:]
    workspace = take_workspace(argv)
    args = [a for a in argv if a != "--json"]
    as_json = "--json" in argv
    if not args:
        print("usage: kb_search.py [--json] [--workspace DIR] <query>"); sys.exit(2)
    query = " ".join(args)
    hits = search(query, workspace=workspace)
    if as_json:
        print(json.dumps({"query": query,
                          "result": hits or "NO_KNOWLEDGE_FOUND"}, indent=2))
        return
    print(f'Query: "{query}"')
    if not hits:
        print("NO_KNOWLEDGE_FOUND")
        return
    for i, h in enumerate(hits, 1):
        print(f"\n[{i}] {h['file']} › {h['section']}  (relevance {h['relevance']})")
        print("    " + h["snippet"].replace("\n", "\n    "))


if __name__ == "__main__":
    for stream in (sys.stdout, sys.stderr):
        stream.reconfigure(encoding="utf-8")  # Windows consoles default to a legacy code page
    main()
