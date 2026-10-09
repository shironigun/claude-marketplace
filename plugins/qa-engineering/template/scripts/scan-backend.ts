/**
 * `npm run scan` — read the surrounding backend repo and report what this
 * workspace should be configured to match.
 *
 * Run it BEFORE editing anything. Every backend is different: different stack,
 * different route conventions, one API host or six, an OpenAPI doc or nothing.
 * The template ships a shape; this tells you what YOUR shape is, so you adapt
 * from evidence instead of from assumptions.
 *
 * It is read-only and deterministic — it reads files and writes a report. It
 * never edits anything, and it never calls a model.
 *
 * Output:
 *   reports/scan.md    human-readable, with the concrete next edits
 *   reports/scan.json  the same findings, for an agent or a script to consume
 *
 * What it cannot know: which host is primary, which routes matter, what your
 * modules should be called. Those are judgement calls — it gives you the
 * evidence to make them.
 */
import * as fs from 'fs';
import * as path from 'path';

const AUTOMATION_ROOT = path.resolve(__dirname, '..');

// The backend repo is the parent of `automation/`. `SCAN_ROOT` overrides it for
// the case where this workspace lives somewhere else in the tree.
const REPO_ROOT = process.env.SCAN_ROOT
  ? path.resolve(process.env.SCAN_ROOT)
  : path.resolve(AUTOMATION_ROOT, '..');

// Directories that never contain useful signal and always contain enormous
// numbers of files.
const SKIP_DIRS = new Set([
  'node_modules', '.git', '.svn', '.hg', '.idea', '.vs', '.vscode',
  'automation', 'dist', 'build', 'out', 'bin', 'obj', 'target', 'vendor',
  'coverage', '.next', '.nuxt', '.output', '__pycache__', '.venv', 'venv',
  'env', 'packages', 'TestResults', '.gradle', '.terraform', 'migrations',
]);

const MAX_DEPTH = 8;
const MAX_FILES = 40_000;
const MAX_FILE_BYTES = 512 * 1024;

// ── Types ─────────────────────────────────────────────────────────────────────

interface RouteHit {
  method?: string;
  path: string;
  file: string;
}

interface UrlCandidate {
  key: string;
  value: string;
  file: string;
}

interface ScanResult {
  repoRoot: string;
  scannedFiles: number;
  stacks: string[];
  /** Non-REST protocols in play — they change how specs are written. */
  protocols: string[];
  openApiDocs: Array<{ file: string; pathCount?: number }>;
  routeCount: number;
  routePrefixes: Array<{ prefix: string; count: number; sampleFile: string }>;
  authRoutes: RouteHit[];
  urlCandidates: UrlCandidate[];
  ci: string[];
  sourceDirs: string[];
  existingTestDirs: string[];
}

// ── Stack detection ───────────────────────────────────────────────────────────

const STACK_MARKERS: Array<{ id: string; label: string; test: (file: string) => boolean }> = [
  { id: 'dotnet', label: '.NET / C#',            test: (f) => f.endsWith('.csproj') || f.endsWith('.sln') },
  { id: 'spring', label: 'Java / Kotlin (Spring)', test: (f) => f.endsWith('pom.xml') || f.endsWith('build.gradle') || f.endsWith('build.gradle.kts') },
  { id: 'node',   label: 'Node (Express/Fastify/Koa)', test: (f) => f.endsWith('package.json') },
  { id: 'python', label: 'Python (FastAPI/Django/Flask)', test: (f) => f.endsWith('requirements.txt') || f.endsWith('pyproject.toml') || f.endsWith('manage.py') },
  { id: 'go',     label: 'Go',                   test: (f) => f.endsWith('go.mod') },
  { id: 'rails',  label: 'Ruby on Rails',        test: (f) => f.endsWith('Gemfile') },
  { id: 'php',    label: 'PHP (Laravel/Symfony)', test: (f) => f.endsWith('composer.json') },
];

// ── Route extraction ──────────────────────────────────────────────────────────
// Each pattern yields capture groups; the HTTP verb (if any) and the path are
// identified by shape rather than by position, so one helper handles all of them.

const ROUTE_PATTERNS: Array<{ stack: string; exts: string[]; re: RegExp }> = [
  // .NET — attribute routing and minimal APIs
  { stack: 'dotnet', exts: ['.cs'], re: /\[Http(Get|Post|Put|Patch|Delete)\(\s*"([^"]*)"/g },
  { stack: 'dotnet', exts: ['.cs'], re: /\[Route\(\s*"([^"]+)"/g },
  { stack: 'dotnet', exts: ['.cs'], re: /\.Map(Get|Post|Put|Patch|Delete)\(\s*"([^"]+)"/g },

  // Express / Fastify / Koa routers
  { stack: 'node', exts: ['.js', '.ts', '.mjs', '.cjs'], re: /\b(?:app|router|server|api)\.(get|post|put|patch|delete)\(\s*['"`]([^'"`]+)/g },

  // NestJS decorators
  { stack: 'node', exts: ['.ts'], re: /@(Get|Post|Put|Patch|Delete)\(\s*['"]([^'"]*)['"]\s*\)/g },
  { stack: 'node', exts: ['.ts'], re: /@Controller\(\s*['"]([^'"]*)['"]/g },

  // Spring
  { stack: 'spring', exts: ['.java', '.kt'], re: /@(Get|Post|Put|Patch|Delete)Mapping\(\s*(?:value\s*=\s*)?"([^"]*)"/g },
  { stack: 'spring', exts: ['.java', '.kt'], re: /@RequestMapping\(\s*(?:value\s*=\s*)?"([^"]*)"/g },

  // FastAPI / Flask
  { stack: 'python', exts: ['.py'], re: /@(?:app|router|bp|blueprint)\.(get|post|put|patch|delete)\(\s*["']([^"']+)/g },
  { stack: 'python', exts: ['.py'], re: /@(?:app|bp)\.route\(\s*["']([^"']+)/g },

  // Go — net/http, chi, gin, echo
  { stack: 'go', exts: ['.go'], re: /\.(GET|POST|PUT|PATCH|DELETE)\(\s*"([^"]+)"/g },
  { stack: 'go', exts: ['.go'], re: /\.HandleFunc\(\s*"([^"]+)"/g },

  // Laravel
  { stack: 'php', exts: ['.php'], re: /Route::(get|post|put|patch|delete)\(\s*['"]([^'"]+)/g },
];

const VERB = /^(get|post|put|patch|delete)$/i;

// ── Protocol detection ────────────────────────────────────────────────────────
// REST + JSON is the default the template assumes. Anything else changes how
// specs are written, so surfacing it early is worth a filename check.
const PROTOCOL_MARKERS: Array<{ label: string; test: (base: string) => boolean }> = [
  { label: 'GraphQL',        test: (b) => b.endsWith('.graphql') || b.endsWith('.gql') },
  { label: 'SOAP / XML',     test: (b) => b.endsWith('.wsdl') || b.endsWith('.xsd') },
  { label: 'gRPC / protobuf', test: (b) => b.endsWith('.proto') },
];

function extractRoutes(text: string, re: RegExp, file: string): RouteHit[] {
  const hits: RouteHit[] = [];
  // Fresh regex per file — a shared /g regex carries lastIndex between calls.
  const pattern = new RegExp(re.source, re.flags);
  for (const match of text.matchAll(pattern)) {
    const groups = match.slice(1).filter((g): g is string => typeof g === 'string');
    const method = groups.find((g) => VERB.test(g))?.toUpperCase();
    const routePath = groups.filter((g) => !VERB.test(g)).pop();
    if (routePath === undefined || routePath.length > 200) continue;
    hits.push({ method, path: routePath, file });
  }
  return hits;
}

// ── URL candidates ────────────────────────────────────────────────────────────
// Base URLs are usually already written down somewhere — a frontend env file, an
// appsettings.json, a compose file. Finding them saves an afternoon of asking.

const ENV_FILE = /(^\.env)|(\.env\.)|(^appsettings.*\.json$)|(^application.*\.(properties|ya?ml)$)|(^docker-compose.*\.ya?ml$)/i;
const URLISH_KEY = /(API|URL|URI|BASE|GATEWAY|ENDPOINT|HOST)/i;
const SECRET_KEY = /(PASSWORD|SECRET|PWD|CONNECTIONSTRING|PRIVATE|CREDENTIAL|APIKEY|API_KEY|ACCESS_KEY)/i;
const KEY_VALUE = /^\s*["']?([A-Za-z0-9_.:-]+)["']?\s*[:=]\s*["']?(https?:\/\/[^\s"',]+)/;

function extractUrlCandidates(text: string, file: string): UrlCandidate[] {
  const out: UrlCandidate[] = [];
  for (const line of text.split('\n')) {
    if (line.length > 500) continue;
    const m = KEY_VALUE.exec(line);
    if (!m) continue;
    const [, key, value] = m;
    if (SECRET_KEY.test(key)) continue;         // never surface a secret
    if (!URLISH_KEY.test(key)) continue;
    out.push({ key, value: value.replace(/[,;)]+$/, ''), file });
  }
  return out;
}

// ── Walk ──────────────────────────────────────────────────────────────────────

function walk(dir: string, depth: number, files: string[]): void {
  if (depth > MAX_DEPTH || files.length >= MAX_FILES) return;

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (files.length >= MAX_FILES) return;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // Dot-directories are noise, except `.github` — that is where the
      // workflows live, and knowing the CI system decides which pipeline
      // definition to keep.
      const isHidden = entry.name.startsWith('.') && entry.name !== '.github';
      if (SKIP_DIRS.has(entry.name) || isHidden) continue;
      walk(full, depth + 1, files);
    } else if (entry.isFile()) {
      files.push(full);
    }
  }
}

function readIfSmall(file: string): string | null {
  try {
    if (fs.statSync(file).size > MAX_FILE_BYTES) return null;
    return fs.readFileSync(file, 'utf8');
  } catch {
    return null;
  }
}

const rel = (file: string): string => path.relative(REPO_ROOT, file).replace(/\\/g, '/');

// ── Scan ──────────────────────────────────────────────────────────────────────

function scan(): ScanResult {
  const files: string[] = [];
  walk(REPO_ROOT, 0, files);

  const stacks = new Set<string>();
  const protocols = new Set<string>();
  const openApiDocs: ScanResult['openApiDocs'] = [];
  const routes: RouteHit[] = [];
  const urlCandidates: UrlCandidate[] = [];
  const ci = new Set<string>();
  const existingTestDirs = new Set<string>();

  for (const file of files) {
    const base = path.basename(file);
    const ext = path.extname(file);
    const relPath = rel(file);

    // Stack markers
    for (const marker of STACK_MARKERS) {
      if (marker.test(base)) stacks.add(marker.label);
    }

    // Protocol markers
    for (const marker of PROTOCOL_MARKERS) {
      if (marker.test(base)) protocols.add(marker.label);
    }

    // CI systems already in the repo — tells you which pipeline template to keep
    if (/^azure-pipelines.*\.ya?ml$/i.test(base)) ci.add('Azure DevOps');
    if (relPath.startsWith('.github/workflows/')) ci.add('GitHub Actions');
    if (base === '.gitlab-ci.yml') ci.add('GitLab CI');
    if (base === 'Jenkinsfile') ci.add('Jenkins');

    // Existing test suites — precedent worth reading before you invent your own
    if (/(^|\/)(tests?|e2e|spec|__tests__)\//i.test(relPath)) {
      existingTestDirs.add(relPath.split('/').slice(0, 3).join('/'));
    }

    // OpenAPI — by far the best signal when it exists
    if (/^(swagger|openapi)\.(json|ya?ml)$/i.test(base) || /\.(openapi|swagger)\.(json|ya?ml)$/i.test(base)) {
      const doc: { file: string; pathCount?: number } = { file: relPath };
      if (base.endsWith('.json')) {
        const text = readIfSmall(file);
        if (text) {
          try {
            const parsed = JSON.parse(text) as { paths?: Record<string, unknown> };
            if (parsed.paths) doc.pathCount = Object.keys(parsed.paths).length;
          } catch {
            /* not parseable — still worth reporting the file */
          }
        }
      }
      openApiDocs.push(doc);
      continue;
    }

    // Config / env files → base URL candidates
    if (ENV_FILE.test(base)) {
      const text = readIfSmall(file);
      if (text) urlCandidates.push(...extractUrlCandidates(text, relPath));
      continue;
    }

    // Route literals
    const patterns = ROUTE_PATTERNS.filter((p) => p.exts.includes(ext));
    if (patterns.length === 0) continue;
    const text = readIfSmall(file);
    if (!text) continue;
    for (const pattern of patterns) {
      routes.push(...extractRoutes(text, pattern.re, relPath));
    }
  }

  // Group routes by first path segment — the closest thing to a module list the
  // repo will give you for free.
  const byPrefix = new Map<string, { count: number; sampleFile: string }>();
  for (const hit of routes) {
    const prefix = hit.path.replace(/^\/+/, '').split('/')[0].split('?')[0];
    if (!prefix || prefix.startsWith('{') || prefix.startsWith(':')) continue;
    const existing = byPrefix.get(prefix);
    if (existing) existing.count++;
    else byPrefix.set(prefix, { count: 1, sampleFile: hit.file });
  }

  const routePrefixes = [...byPrefix.entries()]
    .map(([prefix, v]) => ({ prefix, count: v.count, sampleFile: v.sampleFile }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 30);

  const authRoutes = routes
    .filter((r) => /(login|auth|token|signin|sign-in|session|connect)/i.test(r.path))
    .slice(0, 25);

  // Top-level directories that look like source
  const sourceDirs: string[] = [];
  try {
    for (const entry of fs.readdirSync(REPO_ROOT, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      if (SKIP_DIRS.has(entry.name) || entry.name.startsWith('.')) continue;
      sourceDirs.push(entry.name);
    }
  } catch {
    /* ignore */
  }

  // Dedupe URL candidates by key+value
  const seenUrls = new Set<string>();
  const dedupedUrls = urlCandidates.filter((c) => {
    const id = `${c.key}=${c.value}`;
    if (seenUrls.has(id)) return false;
    seenUrls.add(id);
    return true;
  }).slice(0, 40);

  // A `graphql` route literal is as strong a signal as a .graphql file.
  if (routes.some((r) => /(^|\/)graphql\/?$/i.test(r.path))) protocols.add('GraphQL');

  return {
    repoRoot: REPO_ROOT,
    scannedFiles: files.length,
    stacks: [...stacks],
    protocols: [...protocols],
    openApiDocs,
    routeCount: routes.length,
    routePrefixes,
    authRoutes,
    urlCandidates: dedupedUrls,
    ci: [...ci],
    sourceDirs: sourceDirs.slice(0, 40),
    existingTestDirs: [...existingTestDirs].slice(0, 20),
  };
}

// ── Report ────────────────────────────────────────────────────────────────────

function toMarkdown(r: ScanResult): string {
  const L: string[] = [];
  const section = (title: string) => L.push('', `## ${title}`, '');

  L.push('# Backend scan', '');
  L.push(`Repo: \`${r.repoRoot}\``);
  L.push(`Files scanned: ${r.scannedFiles}`);
  L.push('');
  L.push('Read this alongside `AGENTS.md`, which says what to do with each finding.');

  section('Stack');
  L.push(r.stacks.length ? r.stacks.map((s) => `- ${s}`).join('\n') : '- Not detected — check the guide for where routes live in your stack.');

  section('Protocols');
  if (r.protocols.length) {
    L.push(r.protocols.map((p) => `- ${p}`).join('\n'));
    L.push('', 'The template assumes REST + JSON. These change how specs are written —');
    L.push('see "When the API is not REST + JSON" in `AGENTS.md` before');
    L.push('writing the first spec. GraphQL in particular returns 200 for business');
    L.push('errors, so a status-only assertion tests nothing.');
  } else {
    L.push('- REST + JSON assumed (no GraphQL schema, WSDL or protobuf found).');
  }

  section('OpenAPI / Swagger');
  if (r.openApiDocs.length) {
    for (const doc of r.openApiDocs) {
      L.push(`- \`${doc.file}\`${doc.pathCount !== undefined ? ` — ${doc.pathCount} paths` : ''}`);
    }
    L.push('', 'Use this as the route inventory. It is the most reliable source you have —');
    L.push('but still confirm status codes and validation against the handlers, because a');
    L.push('spec describes the intent and the code describes the behaviour.');
  } else {
    L.push('- None found. Routes below were extracted from source.');
  }

  section('Route prefixes → candidate modules');
  if (r.routePrefixes.length) {
    L.push(`${r.routeCount} route literals found. Top prefixes:`, '');
    L.push('| Prefix | Routes | Example file |');
    L.push('| --- | --- | --- |');
    for (const p of r.routePrefixes) {
      L.push(`| \`${p.prefix}\` | ${p.count} | \`${p.sampleFile}\` |`);
    }
    L.push('', 'Each meaningful prefix is a candidate `modules/<module>/`. Group by what the');
    L.push('product calls things, not by what the code calls them — QA and developers');
    L.push('should be able to name the same module.');
  } else {
    L.push('- No route literals matched. Your framework may build routes dynamically —');
    L.push('  read one controller by hand and add a pattern to `scripts/scan-backend.ts`.');
  }

  section('Auth endpoints');
  if (r.authRoutes.length) {
    for (const a of r.authRoutes) {
      L.push(`- ${a.method ?? 'ANY'} \`${a.path}\` — \`${a.file}\``);
    }
    L.push('', 'Open the handler for the login route. It gives you `AUTH_LOGIN_PATH`, the');
    L.push('request body field names (`AUTH_USERNAME_FIELD`, `AUTH_PASSWORD_FIELD`,');
    L.push('`AUTH_TENANT_FIELD`) and the response field holding the token');
    L.push('(`AUTH_TOKEN_FIELD`).');
  } else {
    L.push('- None matched. Log in through the app with DevTools open and read the');
    L.push('  request — see `guides/03-authentication.md`.');
  }

  section('Base URL candidates');
  if (r.urlCandidates.length) {
    L.push('From env/config files already in the repo (secrets excluded):', '');
    for (const c of r.urlCandidates) {
      L.push(`- \`${c.key}\` = ${c.value}  _(${c.file})_`);
    }
    L.push('', 'Each distinct host is one entry in `config/services.ts` and one key in `.env`.');
  } else {
    L.push('- None found. Get the test environment URL from the team.');
  }

  section('CI already in this repo');
  L.push(r.ci.length ? r.ci.map((c) => `- ${c}`).join('\n') : '- None detected.');
  L.push('', 'Keep the matching definition in `pipelines/` and delete the other. Register it');
  L.push('as a NEW pipeline — never edit the product build.');

  section('Existing test suites');
  L.push(r.existingTestDirs.length
    ? r.existingTestDirs.map((d) => `- \`${d}\``).join('\n')
    : '- None detected.');
  L.push('', 'Read them before writing your own. They encode fixtures, test accounts and');
  L.push('environment assumptions someone already worked out.');

  section('Top-level directories');
  L.push(r.sourceDirs.map((d) => `- \`${d}\``).join('\n'));
  L.push('', 'These become the `pathMap` keys in `resources/impact-map.json`.');

  section('Next');
  L.push('1. `config/services.ts` — one entry per distinct API host above');
  L.push('2. `.env` — the URLs, plus the four auth values from the login handler');
  L.push('3. `npm run verify:setup` — must be green before anything else');
  L.push('4. `resources/impact-map.json` — source dirs → `@module` tags');
  L.push('5. scaffold `modules/<first-module>/` (see `modules/README.md`) and follow');
  L.push('   the copy-ready examples in `AGENTS.md` §6');
  L.push('');

  return L.join('\n');
}

// ── Main ──────────────────────────────────────────────────────────────────────

function main(): void {
  console.log(`Scanning ${REPO_ROOT} …`);
  const result = scan();

  const reportsDir = path.join(AUTOMATION_ROOT, 'reports');
  fs.mkdirSync(reportsDir, { recursive: true });
  fs.writeFileSync(path.join(reportsDir, 'scan.json'), `${JSON.stringify(result, null, 2)}\n`);
  fs.writeFileSync(path.join(reportsDir, 'scan.md'), toMarkdown(result));

  console.log('');
  console.log(`  files scanned    ${result.scannedFiles}`);
  console.log(`  stack            ${result.stacks.join(', ') || 'not detected'}`);
  console.log(`  protocols        ${result.protocols.join(', ') || 'REST + JSON assumed'}`);
  console.log(`  OpenAPI docs     ${result.openApiDocs.length}`);
  console.log(`  route literals   ${result.routeCount}`);
  console.log(`  candidate modules ${result.routePrefixes.slice(0, 8).map((p) => p.prefix).join(', ') || '—'}`);
  console.log(`  auth endpoints   ${result.authRoutes.length}`);
  console.log(`  URL candidates   ${result.urlCandidates.length}`);
  console.log(`  CI in repo       ${result.ci.join(', ') || 'none'}`);
  console.log('');
  console.log('  reports/scan.md    ← read this');
  console.log('  reports/scan.json  ← same findings, machine-readable');
  console.log('');
  console.log('Then: config/services.ts, .env, and AGENTS.md §6 to scaffold the first module.');
  console.log('');
}

main();
