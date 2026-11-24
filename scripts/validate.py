#!/usr/bin/env python3
"""Marketplace guard: standards + leak scan + contributor identity.

Run from the repo root:  python3 scripts/validate.py            (whole repo)
                         python3 scripts/validate.py --staged   (only files staged for commit)
Exit code 0 = clean, 1 = at least one ERROR.

Private terms (employer, product, client, partner, people names) must NEVER be written into this
public repo, not even here. Put them, one regex per line, in `.leak-denylist.local` at the repo root
(git-ignored). This script reads that file if it exists.
"""
import json, os, re, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)

# shironigun everywhere; named collaborators (see CLAUDE.md rule 3) by GitHub noreply email only.
ALLOWED_AUTHOR_NAMES = {"shironigun"}
COLLABORATORS = {"ayesha imtiaz": "252852590+aishaimt002@users.noreply.github.com",
                 "aishaimt002": "252852590+aishaimt002@users.noreply.github.com"}
ALLOWED_AUTHOR_EMAIL = re.compile(r"^(102178470\+)?shironigun@users\.noreply\.github\.com$|^252852590\+aishaimt002@users\.noreply\.github\.com$", re.I)

SKIP_DIRS = {".git", "node_modules", "dist", "build", "test-results", "reports"}
TEXT_EXT = {".md", ".json", ".yml", ".yaml", ".ts", ".tsx", ".js", ".mjs", ".cjs", ".py", ".css",
            ".svg", ".txt", ".html", ".sh", ".example", ""}
SKIP_FILES = {"package-lock.json", "THIRD_PARTY_NOTICES.txt", "cli.mjs"}

# Generic leak patterns that are safe to publish (they name no one).
GENERIC_LEAKS = [
    (r"(?<![A-Za-z0-9._%+-])(?!shironigun@gmail\.com\b)[A-Za-z0-9._%+-]+@(?![A-Za-z0-9.-]*example\.(com|org|net|test)\b)(?!users\.noreply\.github\.com\b)[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.(?!md\b|ts\b|js\b|json\b|test\b|invalid\b|localhost\b)[a-z]{2,}\b",
     "email address that is not a reserved example/test placeholder"),
    (r"dev\.azure\.com/(?!your-org\b|\$\{|<|\{)[A-Za-z0-9_-]+", "hardcoded Azure DevOps org URL"),
    (r"\b(?!0{8}-0{4}-0{4}-0{4}-0{12})[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b",
     "GUID (project / tenant / work-item ids must be placeholders)"),
    (r"(?i)\b(pat|token|secret|password|api[_-]?key)\s*[:=]\s*['\"][^'\"<>{}$]{12,}['\"]", "possible hardcoded secret"),
    (r"\bCustom\.(?!Example\b)[A-Z][A-Za-z0-9_]+", "org-specific custom field reference name (discover it into the profile instead)"),
    (r"(?i)C:\\\\?Users\\\\?[A-Za-z0-9._-]+|/Users/[a-z0-9._-]+/|/home/(?!(user|u|me|runner|node)/)[a-z0-9._-]+/", "personal filesystem path"),
]


def sh(*args):
    return subprocess.run(args, capture_output=True, text=True).stdout


def load_denylist():
    p = os.path.join(ROOT, ".leak-denylist.local")
    if not os.path.exists(p):
        return []
    out = []
    for line in open(p, encoding="utf-8"):
        line = line.strip()
        if line and not line.startswith("#"):
            out.append((r"(?i)" + line, "private term from .leak-denylist.local"))
    return out


def files(staged):
    if staged:
        return [f for f in sh("git", "diff", "--cached", "--name-only", "--diff-filter=ACMR").splitlines() if os.path.isfile(f)]
    out = []
    for d, dirs, fs in os.walk("."):
        dirs[:] = [x for x in dirs if x not in SKIP_DIRS]
        for f in fs:
            out.append(os.path.relpath(os.path.join(d, f)))
    return out


errors, warnings = [], []
def err(f, m): errors.append(f"ERROR  {f}: {m}")
def warn(f, m): warnings.append(f"WARN   {f}: {m}")


def frontmatter(path):
    s = open(path, encoding="utf-8").read()
    m = re.match(r"^---\n(.*?)\n---\n", s, re.S)
    if not m:
        return None, s
    import yaml  # PyYAML
    try:
        return yaml.safe_load(m.group(1)) or {}, s
    except Exception as e:  # noqa
        err(path, f"frontmatter is not valid YAML ({str(e).splitlines()[0]})")
        return {}, s


def check_skill(path):
    fm, body = frontmatter(path)
    if fm is None:
        return err(path, "missing YAML frontmatter")
    name, desc = fm.get("name"), fm.get("description") or ""
    folder = os.path.basename(os.path.dirname(path))
    if name != folder: err(path, f"name '{name}' must equal folder '{folder}'")
    if not re.fullmatch(r"[a-z0-9]+(-[a-z0-9]+)*", str(name or "")) or len(str(name)) > 64:
        err(path, "name must be lowercase-hyphen, max 64 chars")
    if not desc: err(path, "description is required")
    if len(desc) > 1024: err(path, f"description is {len(desc)} chars (max 1024)")
    if re.search(r"[<>]", desc): err(path, "description must not contain < or >")
    if body.count("\n") > 500: warn(path, "SKILL.md over 500 lines; move detail into references/")
    # sibling references must stay inside the plugin
    plugin_dir = path.split("/skills/")[0]
    own = set(os.listdir(os.path.join(plugin_dir, "skills")))
    all_skills = {os.path.basename(os.path.dirname(p)) for p in all_skill_files}
    for other in sorted(all_skills - own):
        if re.search(rf"`{re.escape(other)}`", body):
            err(path, f"references skill `{other}` from another plugin")
    for ghost in ("storyteller",):
        if ghost in body: err(path, f"references non-existent skill `{ghost}`")


def check_agent(path):
    fm, _ = frontmatter(path)
    if fm is None: return err(path, "missing YAML frontmatter")
    for k in ("name", "description"):
        if not fm.get(k): err(path, f"agent needs '{k}'")
    if fm.get("name") and fm["name"] != os.path.splitext(os.path.basename(path))[0]:
        warn(path, "agent name differs from file name")
    if len(fm.get("description") or "") > 1024: warn(path, "agent description over 1024 chars")


def check_command(path):
    fm, _ = frontmatter(path)
    if fm is None: return err(path, "missing YAML frontmatter")
    if not fm.get("description"): err(path, "command needs 'description'")


def check_json(path):
    try:
        d = json.load(open(path, encoding="utf-8"))
    except Exception as e:  # noqa
        return err(path, f"invalid JSON ({e})")
    base = os.path.basename(path)
    if path.endswith(".claude-plugin/plugin.json"):
        if not re.fullmatch(r"[a-z0-9]+(-[a-z0-9]+)*", d.get("name", "")): err(path, "plugin name must be kebab-case")
        if not re.fullmatch(r"\d+\.\d+\.\d+", d.get("version", "")): err(path, "version must be semver x.y.z")
        if not d.get("description"): err(path, "description required")
        a = d.get("author", {})
        if not isinstance(a, dict) or a.get("name", "").lower() not in ALLOWED_AUTHOR_NAMES:
            err(path, "author.name must be shironigun")
        if a.get("email") not in (None, "shironigun@gmail.com"):
            err(path, "author.email may only be the maintainer's public contact")
    if path.endswith(".claude-plugin/marketplace.json"):
        if d.get("owner", {}).get("email") not in (None, "shironigun@gmail.com"):
            err(path, "owner.email may only be the maintainer's public contact")
        names = set()
        for p in d.get("plugins", []):
            if p["name"] in names: err(path, f"duplicate plugin {p['name']}")
            names.add(p["name"])
            if not os.path.isdir(p["source"]): err(path, f"source {p['source']} missing")
    if base == ".mcp.json":
        extra = set(d) - {"mcpServers"}
        if extra: err(path, f"only 'mcpServers' allowed at top level, found {sorted(extra)}")
        for n, srv in d.get("mcpServers", {}).items():
            if srv.get("command") == "cmd": err(path, f"server '{n}' uses a Windows-only 'cmd' launcher; use npx")
            args = " ".join(srv.get("args", []))
            for pkg in re.findall(r"(@?[a-z0-9][\w.-]*/?[\w.-]*@[\w.^~-]+|@?[a-z0-9][\w.-]*/[\w.-]+)(?=\s|$)", args):
                if "@" not in pkg.lstrip("@"): warn(path, f"server '{n}' package '{pkg}' is not version-pinned")
            for k, v in (srv.get("env") or {}).items():
                if v and "${" not in str(v) and re.search(r"://|\.com|\.net|org|project|tenant", str(v), re.I):
                    err(path, f"server '{n}' env {k} hardcodes an org-specific value; use ${{VAR}} expansion")


def scan_leaks(path, patterns):
    if os.path.basename(path) in SKIP_FILES or os.path.splitext(path)[1] not in TEXT_EXT:
        return
    if path.startswith("scripts/validate.py"):
        return
    try:
        text = open(path, encoding="utf-8").read()
    except Exception:  # noqa
        return
    for rx, why in patterns:
        for m in re.finditer(rx, text):
            line = text.count("\n", 0, m.start()) + 1
            err(f"{path}:{line}", f"{why}: '{m.group(0)[:60]}'")


def check_identity(staged):
    name = sh("git", "config", "user.name").strip()
    email = sh("git", "config", "user.email").strip()
    if name.lower() not in ALLOWED_AUTHOR_NAMES or not ALLOWED_AUTHOR_EMAIL.match(email):
        err("git config", f"commit identity is '{name} <{email}>'; must be shironigun with the GitHub noreply email")
    if staged:
        return
    upstream = sh("git", "rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}").strip() or "origin/main"
    for line in sh("git", "log", f"{upstream}..HEAD", "--format=%h|%an|%ae|%cn|%ce|%B%x00").split("\x00"):
        line = line.strip()
        if not line: continue
        h, an, ae, cn, ce, msg = line.split("|", 5)
        for who, mail in ((an, ae), (cn, ce)):
            if who.lower() not in ALLOWED_AUTHOR_NAMES | set(COLLABORATORS) and who != "GitHub":
                err(f"commit {h}", f"author/committer '{who} <{mail}>' is not shironigun")
            elif who != "GitHub" and (not ALLOWED_AUTHOR_EMAIL.match(mail) or
                                      (who.lower() in COLLABORATORS and mail.lower() != COLLABORATORS[who.lower()])):
                err(f"commit {h}", f"email '{mail}' is not the shironigun noreply address")
        if re.search(r"(?im)^(co-authored-by|signed-off-by):", msg):
            err(f"commit {h}", "message has a Co-authored-by/Signed-off-by trailer")
        if re.search(r"claude\.ai/code/session_", msg):
            err(f"commit {h}", "message links a private session")


staged = "--staged" in sys.argv
all_skill_files = [os.path.join(d, "SKILL.md") for d, _, fs in os.walk("plugins") if "SKILL.md" in fs and "node_modules" not in d]
patterns = GENERIC_LEAKS + load_denylist()
if not os.path.exists(".leak-denylist.local"):
    warn(".leak-denylist.local", "missing: private-term scan skipped (create it locally, never commit it)")

for f in files(staged):
    f = f.replace(os.sep, "/")
    if f.endswith("/SKILL.md"): check_skill(f)
    elif re.search(r"plugins/[^/]+/agents/[^/]+\.md$", f): check_agent(f)
    elif re.search(r"plugins/[^/]+/commands/[^/]+\.md$", f): check_command(f)
    if f.endswith(".json") and "node_modules" not in f and "/.vscode/" not in f and not f.endswith("package-lock.json"):
        check_json(f)  # .vscode/*.json is JSONC (comments allowed) and skipped
    scan_leaks(f, patterns)
check_identity(staged)

for w in warnings: print(w)
for e in errors: print(e)
print(f"\n{len(errors)} error(s), {len(warnings)} warning(s)")
sys.exit(1 if errors else 0)
