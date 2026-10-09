import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { isRawSample, isThemeSample, scoreModules } from '../src/inventory/scorecard.ts';
import type { Sample } from '../src/adapters/react-mui/collector.ts';
import type { Kind, ValueClass } from '../src/adapters/react-mui/units.ts';
import { testConfig } from './pipeline-helpers.ts';
import { tmpDir, writeTree } from './helpers.ts';

const s = (file: string, cls: ValueClass, kind: Kind = 'spacing'): Sample => ({ file, line: 1, ctx: 'sx', kind, property: 'p', raw: '1', cls, px: 8, element: null, conditional: false, responsive: false, selector: false });

test('raw and theme samples are told apart', () => {
  assert.equal(isRawSample(s('a', 'px')), true);
  assert.equal(isRawSample(s('a', 'unitless', 'fontWeight')), true);
  assert.equal(isRawSample(s('a', 'px', 'size')), false);
  assert.equal(isThemeSample(s('a', 'theme-ref', 'color')), true);
});

test('scoreModules reports size, token discipline, i18n and tests per module', () => {
  const files = [
    { file: 'src/features/a/x.tsx', src: "const { t } = useTranslation();\nline2\nline3" },
    { file: 'src/features/a/y.tsx', src: 'no i18n' },
    { file: 'src/shared/z.tsx', src: 'z' },
  ];
  const samples = [s('src/features/a/x.tsx', 'theme'), s('src/features/a/x.tsx', 'px'), s('src/features/a/y.tsx', 'raw-color', 'color'), s('src/shared/z.tsx', 'theme')];
  const out = scoreModules({ files, samples, components: [], testFiles: ['src/features/a/x.test.tsx'], cfg: testConfig, appRootAbs: tmpDir(), git: false });
  assert.deepEqual(out.map((m) => m.module), ['a', 'shared']);
  assert.deepEqual(out[0], { module: 'a', files: 2, loc: 4, components: 0, samples: 3, rawPerKloc: 500, tokenDiscipline: 0.333, i18nCoverage: 0.5, testRatio: 0.5, lastCommit: null });
});

const score = (files: Array<{ file: string; src: string }>, extra: { samples?: Sample[]; testFiles?: string[] } = {}) =>
  scoreModules({ files, samples: extra.samples ?? [], components: [], testFiles: extra.testFiles ?? [], cfg: testConfig, appRootAbs: tmpDir(), git: false });

test('isThemeSample is false for raw, zero and var values and for non-focus kinds', () => {
  assert.equal(isThemeSample(s('a', 'px')), false);
  assert.equal(isThemeSample(s('a', 'zero')), false);
  assert.equal(isThemeSample(s('a', 'var')), false);
  assert.equal(isThemeSample(s('a', 'theme', 'size')), false);
});

test('files outside the module and shared roots are grouped as (other)', () => {
  const out = score([
    { file: 'src/features/a/x.tsx', src: 'x' },
    { file: 'src/features/loose.tsx', src: 'y' },
    { file: 'src/elsewhere/z.tsx', src: 'z' },
  ]);
  assert.deepEqual(out.map((m) => [m.module, m.files]), [['(other)', 2], ['a', 1]]);
  assert.equal(out[0].lastCommit, null);
});

test('a module with no focus samples has a null token discipline', () => {
  const out = score([{ file: 'src/features/a/x.tsx', src: 'x' }], { samples: [s('src/features/a/x.tsx', 'px', 'size')] });
  assert.equal(out[0].samples, 1);
  assert.equal(out[0].rawPerKloc, 0);
  assert.equal(out[0].tokenDiscipline, null);
});

test('a module with no tsx or jsx files has a null i18n coverage', () => {
  const out = score([{ file: 'src/features/a/x.ts', src: "useTranslation()" }]);
  assert.equal(out[0].i18nCoverage, null);
});

test('loc does not count the empty segment after a trailing newline', () => {
  const loc = (src: string): number => score([{ file: 'src/features/a/x.ts', src }])[0].loc;
  assert.equal(loc(''), 0);
  assert.equal(loc('a'), 1);
  assert.equal(loc('a\n'), 1);
  assert.equal(loc('a\nb\n'), 2);
  assert.equal(loc('a\n\n'), 2);
});

test('an empty module yields finite numbers', () => {
  const [m] = score([{ file: 'src/features/a/x.ts', src: '' }], { samples: [s('src/features/a/x.ts', 'px')] });
  assert.equal(Number.isFinite(m.rawPerKloc), true);
  assert.equal(Number.isFinite(m.testRatio), true);
});

test('translation hooks of i18next, next-intl and react-intl all count as i18n', () => {
  const out = score([
    { file: 'src/features/a/1.tsx', src: 'const { t } = useTranslation();' },
    { file: 'src/features/a/2.tsx', src: 'const t = useTranslations("a");' },
    { file: 'src/features/a/3.tsx', src: 'const intl = useIntl();' },
    { file: 'src/features/a/4.tsx', src: '<FormattedMessage id="x" />' },
    { file: 'src/features/a/5.tsx', src: "const label = t('save');" },
    { file: 'src/features/a/6.tsx', src: 'const label = format(x);' },
  ]);
  assert.equal(out[0].i18nCoverage, 0.833);
});

test('files that are also test files are not counted as sources', () => {
  const out = score(
    [
      { file: 'src/features/a/x.tsx', src: 'x' },
      { file: 'src/features/a/x.test.tsx', src: 'it()\nit()' },
    ],
    { testFiles: ['src/features/a/x.test.tsx'] },
  );
  assert.deepEqual([out[0].files, out[0].loc, out[0].testRatio], [1, 1, 1]);
});

test('fifty thousand samples in one module are all counted', () => {
  const f = 'src/features/a/x.tsx';
  const samples = Array.from({ length: 50_000 }, (_, i) => s(f, i % 2 ? 'px' : 'theme'));
  const [m] = score([{ file: f, src: 'x' }], { samples });
  assert.equal(m.samples, 50_000);
  assert.equal(m.tokenDiscipline, 0.5);
});

const hasGit = spawnSync('git', ['--version']).status === 0;

test('lastCommit comes from git log for the module directory and degrades to null', (t) => {
  if (!hasGit) return t.skip('git is not on PATH');
  const repo = tmpDir();
  writeTree(repo, { 'src/features/a/x.tsx': 'x' });
  const date = '2020-01-02T12:00:00+0000';
  // The temp repo must be the one git works on, even when the tests run inside a git hook or worktree: drop every
  // variable that points git elsewhere, and run no hooks (an empty core.hooksPath disables them).
  const env: NodeJS.ProcessEnv = { ...process.env, GIT_AUTHOR_DATE: date, GIT_COMMITTER_DATE: date };
  for (const k of ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_OBJECT_DIRECTORY', 'GIT_ALTERNATE_OBJECT_DIRECTORIES', 'GIT_COMMON_DIR']) delete env[k];
  const git = (...args: string[]): void => {
    execFileSync('git', ['-c', 'user.name=T', '-c', 'user.email=t@example.com', '-c', 'commit.gpgsign=false', '-c', 'core.hooksPath=', ...args], { cwd: repo, stdio: 'ignore', env });
  };
  git('init', '-q');
  git('add', '.');
  git('commit', '-q', '-m', 'init');
  const files = [
    { file: 'src/features/a/x.tsx', src: 'x' },
    { file: 'src/features/b/y.tsx', src: 'y' },
    { file: 'src/elsewhere/z.tsx', src: 'z' },
  ];
  const run = (appRootAbs: string) => scoreModules({ files, samples: [], components: [], testFiles: [], cfg: testConfig, appRootAbs, git: true }).map((m) => [m.module, m.lastCommit]);
  assert.deepEqual(run(repo), [['(other)', null], ['a', '2020-01-02'], ['b', null]]);
  assert.deepEqual(run(tmpDir()), [['(other)', null], ['a', null], ['b', null]]);
  assert.deepEqual(run(`${repo}/does-not-exist`), [['(other)', null], ['a', null], ['b', null]]);
});
