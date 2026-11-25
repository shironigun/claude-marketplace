#!/usr/bin/env python3
"""Design Intelligence — Impact Analysis (plugin capability, NOT a skill).

Deterministic, evidence-only. Builds a reference index by scanning the org's
local overlay (<workspace>/config, knowledge, generation, default
./.claude/design-intelligence) plus the plugin's bundled _shared knowledge/config
and skill knowledge that the overlay does not override, and any run records under
<workspace>/runs/, for mentions of a token/color/component/rule, then reports
where a change could propagate. Bundled values are an illustrative example.

Impact levels:
  DIRECT   — the term appears verbatim in a file (cited: file + line)
  INDIRECT — a file references a construct that itself DIRECTLY uses the term
  POTENTIAL— a known conflict/alias exists for the term (owner-decision surface)
  UNKNOWN  — no generated-artifact/run index present to establish screen impact

Never asserts a screen/artifact is affected without an indexed run. If no run
metadata exists it reports UNKNOWN / INSUFFICIENT INDEX DATA for that layer.

Usage:
  python3 impact.py --token "#2F5DA8"
  python3 impact.py --component Button
  python3 impact.py --token primary --json
  python3 impact.py --workspace DIR --rule "8px radius"
"""
import sys, os, re, json

ROOT = os.path.dirname(os.path.abspath(__file__))
PLUGIN = os.path.normpath(os.path.join(ROOT, "..", ".."))
SCAN_DIRS = [os.path.join(PLUGIN, "_shared"), os.path.join(PLUGIN, "skills")]
# overlay sub-folder -> the bundled folder it overrides (see _shared/config/org-design-system.md)
OVERLAY_MAP = {"config": "_shared/config", "knowledge": "_shared/knowledge",
               "generation": "skills/design-system-generation"}
OVERLAY_LABEL = ".claude/design-intelligence/"

# Known conflict clusters (owner-decision surface). This default is the bundled
# illustrative example; the org's own clusters come from
# <workspace>/conflict-aliases.json ({"primary": ["#hex", ...], ...}) when present.
EXAMPLE_CONFLICT_ALIASES = {
    "primary": ["#2F5DA8", "#2E5BA6", "#2e5ba6", "#1D4E89", "#1d4e89"],
}


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


def conflict_aliases(workspace):
    path = os.path.join(workspace, "conflict-aliases.json")
    if os.path.isfile(path):
        try:
            return json.load(open(path, encoding="utf-8"))
        except Exception:
            pass
    return EXAMPLE_CONFLICT_ALIASES


def files_to_scan(workspace):
    """(label, path) for every .md: overlay copies first, bundled copies not overridden."""
    out, overridden = [], set()
    for sub, bundled in OVERLAY_MAP.items():
        d = os.path.join(workspace, sub)
        if os.path.isdir(d):
            for fn in sorted(os.listdir(d)):
                if fn.endswith(".md"):
                    out.append((f"{OVERLAY_LABEL}{sub}/{fn}", os.path.join(d, fn)))
                    overridden.add(f"{bundled}/{fn}")
    for base in SCAN_DIRS:
        for dirpath, _, files in os.walk(base):
            for fn in sorted(files):
                if not fn.endswith(".md"):
                    continue
                path = os.path.join(dirpath, fn)
                rel = os.path.relpath(path, PLUGIN).replace(os.sep, "/")
                if rel not in overridden:
                    out.append((rel, path))
    return out


def scan(term, workspace):
    """Return list of {file,line,text} where term appears verbatim (case-insensitive)."""
    hits = []
    needle = term.lower()
    for rel, path in files_to_scan(workspace):
        try:
            for i, line in enumerate(open(path, encoding="utf-8"), 1):
                if needle in line.lower():
                    hits.append({"file": rel, "line": i, "text": line.strip()[:140]})
        except Exception:
            pass
    return hits


def load_runs(workspace):
    """Load any generated-run records (documentation capability output) to map term→screen."""
    runs = []
    runs_dir = os.path.join(workspace, "runs")
    if os.path.isdir(runs_dir):
        for fn in sorted(os.listdir(runs_dir)):
            if fn.endswith(".json"):
                try:
                    runs.append(json.load(open(os.path.join(runs_dir, fn), encoding="utf-8")))
                except Exception:
                    pass
    return runs


def analyze(kind, term, workspace=None):
    workspace = workspace or take_workspace([])
    aliases_map = conflict_aliases(workspace)
    out = {"change": f"{kind}: {term}", "direct": [], "indirect": [],
           "potential": [], "screen_artifact_impact": "UNKNOWN / INSUFFICIENT INDEX DATA"}

    # DIRECT — verbatim references in knowledge/config/skill files
    out["direct"] = scan(term, workspace)

    # POTENTIAL — conflict aliases (e.g. the three 'primary' hexes)
    key = term.lower().lstrip("#")
    if key in aliases_map:
        for alias in aliases_map[key]:
            ah = scan(alias, workspace)
            if ah:
                out["potential"].append({"alias": alias, "refs": ah})
    for k, aliases in aliases_map.items():
        if term in aliases or term.lower() in [a.lower() for a in aliases]:
            out["potential"].append({"note": f"'{term}' is part of the '{k}' conflict cluster",
                                     "cluster": aliases})

    # INDIRECT — components/skills that consume the term's file(s)
    if out["direct"]:
        files = sorted({h["file"] for h in out["direct"]})
        out["indirect"] = [{"consumer": "design-system-generation + design-system-review",
                            "reason": f"both skills read {f} as source of truth"} for f in files
                           if f.startswith("_shared/")
                           or f.startswith(OVERLAY_LABEL + "config/")
                           or f.startswith(OVERLAY_LABEL + "knowledge/")]

    # SCREEN/ARTIFACT impact — only if run manifests exist
    runs = load_runs(workspace)
    if runs:
        affected = []
        for r in runs:
            blob = json.dumps(r).lower()
            if term.lower() in blob:
                affected.append({"screen": r.get("screen", "?"),
                                 "node": r.get("figma_node", "?")})
        out["screen_artifact_impact"] = affected or "No indexed run references this term"
    return out


def main():
    argv = sys.argv[1:]
    workspace = take_workspace(argv)
    if len(argv) < 2 or argv[0] not in ("--token", "--component", "--rule"):
        print("usage: impact.py [--workspace DIR] --token|--component|--rule <name> [--json]"); sys.exit(2)
    kind = argv[0].lstrip("-"); term = argv[1]
    res = analyze(kind, term, workspace)
    if "--json" in argv:
        print(json.dumps(res, indent=2)); return
    print(f"Impact analysis — change to {res['change']}\n")
    print(f"DIRECT IMPACT ({len(res['direct'])} verbatim refs):")
    for h in res["direct"][:12]:
        print(f"  - {h['file']}:{h['line']}  {h['text']}")
    if len(res["direct"]) > 12:
        print(f"  … +{len(res['direct'])-12} more")
    print(f"\nINDIRECT IMPACT ({len(res['indirect'])}):")
    for h in res["indirect"]:
        print(f"  - {h['consumer']} — {h['reason']}")
    print(f"\nPOTENTIAL IMPACT ({len(res['potential'])}):")
    for h in res["potential"]:
        print(f"  - {h}")
    print(f"\nSCREEN / ARTIFACT IMPACT: {res['screen_artifact_impact']}")


if __name__ == "__main__":
    for stream in (sys.stdout, sys.stderr):
        stream.reconfigure(encoding="utf-8")  # Windows consoles default to a legacy code page
    main()
