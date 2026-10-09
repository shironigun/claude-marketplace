/**
 * `npm run install:agents` — wire this workspace's house rules into Claude Code and
 * GitHub Copilot.
 *
 * `AGENTS.md` at the workspace root is the single source of truth. This distributes
 * pointers to it into the fixed locations those tools read, so they all load the same
 * rules and can never drift:
 *
 *   CLAUDE.md                                      Claude Code — @import AGENTS.md
 *   .github/copilot-instructions.md                Copilot, repo-wide — pointer
 *   .github/instructions/automation.instructions.md
 *                                                  Copilot — the FULL rules, path-scoped
 *   .vscode/extensions.json                        recommended editor extensions
 *
 * The repo-wide files may already exist and belong to you, so they get a delimited
 * managed block that is replaced on re-run; everything outside that block survives.
 *
 * Idempotent. Safe to re-run after editing AGENTS.md.
 */
import * as fs from 'fs';
import * as path from 'path';

/** Workspace root — the folder holding package.json and AGENTS.md. */
const ROOT = path.resolve(__dirname, '..');
const AGENTS_FILE = path.join(ROOT, 'AGENTS.md');

const BEGIN = '<!-- BEGIN: test-automation workspace (managed by `npm run install:agents`) -->';
const END = '<!-- END: test-automation workspace -->';

const actions: string[] = [];
const problems: string[] = [];

const rel = (p: string): string => path.relative(ROOT, p).replace(/\\/g, '/') || '.';

/** Write `body` into `target` inside the managed block, preserving anything outside it. */
function upsertManagedBlock(target: string, body: string): void {
  const block = `${BEGIN}\n${body.trim()}\n${END}`;

  if (!fs.existsSync(target)) {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, `${block}\n`);
    actions.push(`created  ${rel(target)}`);
    return;
  }

  const current = fs.readFileSync(target, 'utf8');
  const start = current.indexOf(BEGIN);
  const end = current.indexOf(END);

  if (start !== -1 && end > start) {
    const next = current.slice(0, start) + block + current.slice(end + END.length);
    if (next === current) {
      actions.push(`unchanged ${rel(target)}`);
      return;
    }
    fs.writeFileSync(target, next);
    actions.push(`updated  ${rel(target)} (managed block)`);
    return;
  }

  fs.writeFileSync(target, `${current.trimEnd()}\n\n${block}\n`);
  actions.push(`appended ${rel(target)} (managed block; your content preserved)`);
}

/** Write a file only if it is absent. For things a team may already own. */
function writeIfAbsent(target: string, body: string): void {
  if (fs.existsSync(target)) {
    actions.push(`kept     ${rel(target)} (already present)`);
    return;
  }
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, body);
  actions.push(`created  ${rel(target)}`);
}

function main(): void {
  console.log(`Installing agent configuration into ${ROOT}\n`);

  if (!fs.existsSync(AGENTS_FILE)) {
    console.error(`Cannot find ${AGENTS_FILE}. Run this from the workspace root.\n`);
    process.exit(1);
    return;
  }

  const pointer =
    'The house rules for writing tests in this workspace live in `AGENTS.md`.\n' +
    'Read it before authoring or editing any test. It is the single source of truth —\n' +
    'fixture surface, import paths, copy-ready examples, commands and failure modes.';

  // ── Claude Code: @import the full file where supported, pointer everywhere else ──
  upsertManagedBlock(
    path.join(ROOT, 'CLAUDE.md'),
    `Full house rules — read this first:\n\n@AGENTS.md\n\n---\n\n${pointer}`,
  );

  // ── Copilot: repo-wide summary pointer ────────────────────────────────────
  upsertManagedBlock(path.join(ROOT, '.github', 'copilot-instructions.md'), pointer);

  // ── Copilot: path-scoped rules carrying the FULL AGENTS.md ─────────────────
  // Generated rather than shipped, so it can never drift from the source.
  const frontmatter = [
    '---',
    'applyTo: "**"',
    'description: Complete rules for this Playwright + TypeScript + Zod test-automation workspace.',
    '---',
    '',
    '<!-- Generated from AGENTS.md by `npm run install:agents`. Edit AGENTS.md, not this file. -->',
    '',
  ].join('\n');
  const scoped = path.join(ROOT, '.github', 'instructions', 'automation.instructions.md');
  fs.mkdirSync(path.dirname(scoped), { recursive: true });
  const existed = fs.existsSync(scoped);
  fs.writeFileSync(scoped, frontmatter + fs.readFileSync(AGENTS_FILE, 'utf8'));
  actions.push(`${existed ? 'replaced' : 'created '} ${rel(scoped)} (from AGENTS.md)`);

  // ── Editor: the Playwright extension is the fastest way to pick a locator ─
  // Written only if absent — a team that already curates recommendations keeps it.
  writeIfAbsent(
    path.join(ROOT, '.vscode', 'extensions.json'),
    `${JSON.stringify(
      {
        recommendations: [
          'ms-playwright.playwright',
          'dbaeumer.vscode-eslint',
          'editorconfig.editorconfig',
        ],
      },
      null,
      2,
    )}\n`,
  );

  for (const line of actions) console.log(`  ${line}`);
  if (problems.length) {
    console.log('');
    for (const p of problems) console.log(`  ! ${p}`);
  }

  console.log('');
  console.log('Claude Code   CLAUDE.md (@import AGENTS.md)');
  console.log('Copilot       .github/copilot-instructions.md · .github/instructions/');
  console.log('Source        AGENTS.md — edit THAT, then re-run this');
  console.log('');
  console.log('Idempotent: only the managed block changes in files you also own.');

  if (problems.length) process.exit(1);
}

main();
