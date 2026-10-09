/**
 * `npm run impacted` — changed files → module tags → a Playwright `--grep` expression.
 *
 * Running the whole suite on every commit is how a suite becomes something people
 * skip. This maps the diff to the tags it can possibly affect and prints only
 * those, so a one-line controller change runs one module instead of forty.
 *
 * Two inputs, both in resources/impact-map.json:
 *   pathMap         source path prefix → the tags that cover it
 *   contractSources paths whose change cascades through
 *                   type → schema → contract → endpoint → workflow
 *
 * With no match it falls back to `smokeTag` — never to "everything", and never
 * to nothing.
 *
 * stdout is JUST the grep expression, so CI can capture it directly.
 * Diagnostics go to stderr.
 *
 * Pass `--run` to execute the selected tests instead of only printing the
 * expression. That is what `npm run test:impacted` does — spawning the runner
 * from here rather than interpolating in the npm script keeps it working on
 * Windows, where `$(...)` is not a thing.
 */
import { execSync, spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const AUTOMATION_ROOT = path.resolve(__dirname, '..');

// The git repo root — this workspace folder itself in a standalone repo, or an ancestor
// when the workspace is nested inside a bigger repo. Ask git rather than assuming "the
// parent folder": that is only right for the nested case, and in a standalone repo it
// points outside the repo, so the diff is empty and every run falls back to the smoke tag.
const REPO_ROOT = ((): string => {
  try {
    const top = execSync('git rev-parse --show-toplevel', {
      cwd: AUTOMATION_ROOT,
      stdio: ['ignore', 'pipe', 'ignore'],
    }).toString().trim();
    return top || AUTOMATION_ROOT;
  } catch {
    return AUTOMATION_ROOT;
  }
})();

interface ImpactMap {
  pathMap: Record<string, string[]>;
  contractSources: string[];
  smokeTag: string;
}

function loadMap(): ImpactMap {
  const mapPath = path.join(AUTOMATION_ROOT, 'resources', 'impact-map.json');
  return JSON.parse(fs.readFileSync(mapPath, 'utf8')) as ImpactMap;
}

function changedFiles(): string[] {
  // CI can hand the list in directly — more reliable than guessing a base ref
  // on a shallow clone.
  if (process.env.CHANGED_FILES) {
    return process.env.CHANGED_FILES.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean);
  }

  const base = process.env.IMPACT_BASE_REF ?? 'HEAD~1';
  const tryGit = (cmd: string): string[] | null => {
    try {
      return execSync(cmd, { cwd: REPO_ROOT }).toString().split('\n').map((s) => s.trim()).filter(Boolean);
    } catch {
      return null;
    }
  };

  return tryGit(`git diff --name-only ${base}...HEAD`) ?? tryGit('git diff --name-only HEAD') ?? [];
}

function main(): void {
  const map = loadMap();
  const files = changedFiles().map((f) => f.replace(/\\/g, '/'));

  const tags = new Set<string>();
  const matched: string[] = [];
  let contractAffecting = false;

  for (const file of files) {
    for (const [prefix, prefixTags] of Object.entries(map.pathMap)) {
      if (file.startsWith(prefix) || file.includes(`/${prefix}`)) {
        prefixTags.forEach((t) => tags.add(t));
        matched.push(file);
      }
    }
    if (map.contractSources.some((src) => file.includes(src))) contractAffecting = true;
  }

  const grep = tags.size ? [...tags].join('|') : map.smokeTag;

  const reportsDir = path.join(AUTOMATION_ROOT, 'reports');
  fs.mkdirSync(reportsDir, { recursive: true });
  fs.writeFileSync(path.join(reportsDir, 'impacted.txt'), grep);

  console.error(`Impact analysis: ${files.length} changed file(s), ${matched.length} mapped.`);
  if (contractAffecting) {
    console.error('Contract-affecting change detected — schema → contract → endpoint → workflow all impacted.');
  }
  console.error(`Selected grep: ${grep}`);

  if (process.argv.includes('--run')) {
    const args = [
      'playwright', 'test',
      '--project=contracts', '--project=endpoints', '--project=workflows',
      '--grep', grep,
    ];
    console.error(`Running: npx ${args.join(' ')}`);
    const result = spawnSync('npx', args, {
      cwd: AUTOMATION_ROOT,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });
    process.exit(result.status ?? 1);
  }

  console.log(grep);
}

main();
