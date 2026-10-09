import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { basename } from 'node:path';
import { validateConfig } from '../src/config/config.ts';
import { readThemeFactsChecked } from '../src/adapters/react-mui/theme-static.ts';
import { DEFAULT_THEME } from '../src/adapters/react-mui/units.ts';
import { detectStack, proposeConfig } from '../src/detect/detect.ts';
import { main } from '../src/cli.ts';
import { tmpDir, withMocked, writeTree } from './helpers.ts';

test('readThemeFactsChecked reads spacing and shape.borderRadius from the theme entry', () => {
  const root = tmpDir();
  writeTree(root, { 'src/theme/index.ts': `import { createTheme } from '@mui/material/styles';\nexport default createTheme({ spacing: 4, shape: { borderRadius: 8 }, components: { MuiButton: { styleOverrides: { root: { borderRadius: 20 } } } } });` });
  assert.deepEqual(readThemeFactsChecked(root, 'src/theme/index.ts'), { facts: { spacingUnit: 4, radiusUnit: 8, source: 'static' }, problem: null });
});

test('readThemeFactsChecked falls back to MUI defaults', () => {
  const root = tmpDir();
  writeTree(root, { 'src/theme/index.ts': `export const theme = createTheme({ palette: { primary: { main: '#123456' } } });` });
  assert.deepEqual(readThemeFactsChecked(root, 'src/theme/index.ts'), { facts: DEFAULT_THEME, problem: null });
  assert.deepEqual(readThemeFactsChecked(root, null), { facts: DEFAULT_THEME, problem: null });
  assert.equal(readThemeFactsChecked(root, 'src/missing.ts').facts, DEFAULT_THEME);
});

function sampleApp(): string {
  const root = tmpDir();
  writeTree(root, {
    'package.json': JSON.stringify({ name: 'sample-app', dependencies: { react: '^19.2.0', '@mui/material': '^7.3.0', 'react-router-dom': '^7.0.0' }, devDependencies: { vitest: '^3.2.0' } }),
    'tsconfig.json': '{}',
    'src/theme/index.ts': `export const theme = createTheme({});`,
    'src/app.tsx': `export const App = () => <ThemeProvider theme={theme}><div /></ThemeProvider>;`,
    'src/components/leads/A.tsx': `export const A = () => <div sx={{ p: 1 }} style={{ margin: 2 }} />;`,
    'src/common/components/B.tsx': `const useStyles = makeStyles()(() => ({}));`,
    'src/routes/index.tsx': `export const R = 1;`,
    'src/x.css': `.a { padding: 1px; }`,
  });
  return root;
}

test('detectStack reads packages, styling mechanisms, entries and folders', () => {
  const root = sampleApp();
  const s = detectStack(root);
  assert.equal(s.packageName, 'sample-app');
  assert.equal(s.mui, '@mui/material@^7.3.0');
  assert.equal(s.router, 'react-router-dom@^7.0.0');
  assert.equal(s.testRunner, 'vitest@^3.2.0');
  assert.equal(s.typescript, true);
  assert.deepEqual(s.styling, { sx: 1, styled: 0, makeStyles: 1, styleProp: 1, cssFiles: 1 });
  assert.equal(s.themeEntry, 'src/theme/index.ts');
  assert.equal(s.providersEntry, 'src/app.tsx');
  assert.deepEqual(s.moduleRoots, ['src/components']);
  assert.deepEqual(s.sharedRoots, ['src/common/components']);
  const cfg = proposeConfig(s, root);
  assert.equal(cfg.libraryHome, 'src/common/components');
  assert.deepEqual(cfg.modules, { roots: ['src/components'], shared: ['src/common/components'] });
  assert.deepEqual(cfg.protectedPaths, ['src/routes/**']);
});

test('an empty package name falls back to the folder name and the proposed config is valid', () => {
  const root = tmpDir();
  writeTree(root, { 'package.json': '{"name":""}', 'src/a.tsx': 'export const A = 1;' });
  const cfg = proposeConfig(detectStack(root), root);
  assert.equal(cfg.product, basename(root));
  assert.deepEqual(validateConfig(cfg), []);
});

test('detectStack never throws on a null or malformed package.json; it says what was wrong', () => {
  for (const [body, problem] of [['null', /^package\.json: not a JSON object$/], ['{"name": "x",', /^package\.json: /], ['["a"]', /^package\.json: not a JSON object$/]] as const) {
    const root = tmpDir();
    writeTree(root, { 'package.json': body, 'src/a.tsx': 'export const A = () => <div sx={{ p: 1 }} />;' });
    const s = detectStack(root);
    assert.equal(s.packageName, null, body);
    assert.equal(s.react, null);
    assert.equal(s.styling.sx, 1);
    assert.equal(s.problems.length, 1, body);
    assert.match(s.problems[0], problem);
    assert.deepEqual(validateConfig(proposeConfig(s, root)), []);
  }
});

test('detectStack ignores dependency maps of the wrong shape', () => {
  const root = tmpDir();
  writeTree(root, { 'package.json': '{"name":"odd","dependencies":["react"],"devDependencies":{"vitest":1}}' });
  const s = detectStack(root);
  assert.deepEqual([s.packageName, s.react, s.testRunner], ['odd', null, null]);
});

test('detectStack skips a source file it cannot read, or a folder it cannot list, and says so', () => {
  const root = sampleApp();
  const real = fs.readFileSync as (...a: unknown[]) => unknown;
  withMocked(fs, 'readFileSync', (p, ...rest) => {
    if (String(p).endsWith('A.tsx')) throw new Error(`EACCES: permission denied, open '${String(p)}'`);
    return real(p, ...rest);
  }, () => {
    const s = detectStack(root);
    assert.equal(s.styling.sx, 0);
    assert.deepEqual(s.problems, ["read: EACCES: permission denied, open 'src/components/leads/A.tsx'"]);
  });
  const realDir = fs.readdirSync as (...a: unknown[]) => unknown;
  withMocked(fs, 'readdirSync', (p, ...rest) => {
    if (String(p).endsWith('leads')) throw new Error(`EACCES: permission denied, scandir '${String(p)}'`);
    return realDir(p, ...rest);
  }, () => {
    assert.deepEqual(detectStack(root).problems, ["read: EACCES: permission denied, scandir 'src/components/leads'"]);
  });
});

test('the detect command prints the stack and a proposed config as JSON', async () => {
  const out: string[] = [];
  const code = await main(['detect', '--app', sampleApp()], { out: (s) => { out.push(s); }, err: () => {} });
  assert.equal(code, 0);
  const parsed = JSON.parse(out.join('\n'));
  assert.equal(parsed.stack.packageName, 'sample-app');
  assert.equal(parsed.proposedConfig.adapter, 'react-mui');
});

test('readThemeFactsChecked says why a configured theme entry fell back to the defaults', () => {
  const root = tmpDir();
  writeTree(root, { 'src/theme/index.ts': `export const theme = createTheme({ palette: {} });`, 'src/theme/broken.ts': `export const theme = createTheme({ spacing: ;` });
  assert.deepEqual(readThemeFactsChecked(root, null), { facts: DEFAULT_THEME, problem: null });
  assert.deepEqual(readThemeFactsChecked(root, 'src/theme/index.ts'), { facts: DEFAULT_THEME, problem: null });
  assert.deepEqual(readThemeFactsChecked(root, 'src/missing.ts'), { facts: DEFAULT_THEME, problem: 'read: file not found; library defaults used' });
  assert.match(readThemeFactsChecked(root, 'src/theme').problem ?? '', /^read: EISDIR/);
  assert.match(readThemeFactsChecked(root, 'src/theme/broken.ts').problem ?? '', /^parse: /);
  assert.equal(readThemeFactsChecked(root, 'src/theme/broken.ts').facts, DEFAULT_THEME);
  writeTree(root, { 'src/theme/set.ts': `export const theme = createTheme({ spacing: 4 });` });
  assert.deepEqual(readThemeFactsChecked(root, 'src/theme/set.ts'), { facts: { spacingUnit: 4, radiusUnit: 4, source: 'static' }, problem: null });
});

// The facts and problem for a theme entry holding `body`.
const themeOf = (body: string) => {
  const root = tmpDir();
  writeTree(root, { 'src/theme/index.ts': body });
  return readThemeFactsChecked(root, 'src/theme/index.ts');
};
const SPACING_UNREADABLE = 'parse: spacing is set but not statically readable; library default used';

test('a spacing set in a form that cannot be read statically is never silent', () => {
  const forms: Record<string, string> = {
    'a function': `export default createTheme({ spacing: (f: number) => f * 4 });`,
    'an array': `export default createTheme({ spacing: [0, 4, 8] });`,
    'a string': `export default createTheme({ spacing: '4px' });`,
    'an imported identifier': `import { SPACING } from './tokens';\nexport default createTheme({ spacing: SPACING });`,
    'a shorthand of an import': `import { spacing } from './tokens';\nexport default createTheme({ spacing });`,
    'a non-numeric const': `const SPACING = '4px';\nexport default createTheme({ spacing: SPACING });`,
  };
  for (const [label, body] of Object.entries(forms)) assert.deepEqual(themeOf(body), { facts: DEFAULT_THEME, problem: SPACING_UNREADABLE }, label);
});

test('a shape.borderRadius that cannot be read statically is reported, and a readable unit beside it is still used', () => {
  assert.deepEqual(themeOf(`import { RADIUS } from './tokens';\nexport default createTheme({ spacing: 4, shape: { borderRadius: RADIUS } });`), {
    facts: { spacingUnit: 4, radiusUnit: 4, source: 'static' },
    problem: 'parse: shape.borderRadius is set but not statically readable; library default used',
  });
  assert.deepEqual(themeOf(`export default createTheme({ spacing: (f: number) => f * 2, shape: { borderRadius: theme.radius } });`), {
    facts: DEFAULT_THEME,
    problem: 'parse: spacing and shape.borderRadius are set but not statically readable; library defaults used',
  });
});

test('same-file numeric consts are resolved, by name and by shorthand', () => {
  assert.deepEqual(themeOf(`const SPACING = 4;\nexport const RADIUS = 6 as const;\nexport default createTheme({ spacing: SPACING, shape: { borderRadius: RADIUS } });`), { facts: { spacingUnit: 4, radiusUnit: 6, source: 'static' }, problem: null });
  assert.deepEqual(themeOf(`const spacing = 5;\nexport default createTheme({ spacing } as ThemeOptions);`), { facts: { spacingUnit: 5, radiusUnit: 4, source: 'static' }, problem: null });
});

test('only the theme object\'s own spacing and shape.borderRadius count, not keys nested deeper', () => {
  assert.deepEqual(themeOf(`export default createTheme({ layout: { spacing: (f: number) => f, shape: { borderRadius: 'x' } }, spacing: 6 });`), { facts: { spacingUnit: 6, radiusUnit: 4, source: 'static' }, problem: null });
});

test('the detect command requires --app', async () => {
  const err: string[] = [];
  assert.equal(await main(['detect'], { out: () => {}, err: (s) => { err.push(s); } }), 2);
  assert.match(err[0], /--app/);
});

test('readThemeFactsChecked ignores spacing and radius inside component overrides', () => {
  const root = tmpDir();
  writeTree(root, { 'src/theme/index.ts': `export default createTheme({ components: { MuiStack: { defaultProps: { spacing: 2 } }, MuiCard: { styleOverrides: { root: { shape: { borderRadius: 30 } } } } }, shape: { borderRadius: 6 } });` });
  assert.deepEqual(readThemeFactsChecked(root, 'src/theme/index.ts'), { facts: { spacingUnit: 8, radiusUnit: 6, source: 'static' }, problem: null });
  const root2 = tmpDir();
  writeTree(root2, { 'src/theme/index.ts': `export default createTheme({ components: { MuiGrid: { defaultProps: { spacing: 3 } } }, spacing: 4 });` });
  assert.deepEqual(readThemeFactsChecked(root2, 'src/theme/index.ts'), { facts: { spacingUnit: 4, radiusUnit: 4, source: 'static' }, problem: null });
});
