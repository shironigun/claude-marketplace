import { test } from 'node:test';
import assert from 'node:assert/strict';
import { collectFileFacts, normalizeSource, type FileFacts } from '../src/inventory/file-facts.ts';
import { detectFamilies, jaccard, shingles } from '../src/inventory/families.ts';
import { extractStyles } from '../src/adapters/react-mui/extract.ts';
import { DEFAULT_THEME } from '../src/adapters/react-mui/units.ts';
import type { StyleBlock } from '../src/adapters/react-mui/collector.ts';
import type { AppConfig } from '../src/config/config.ts';
import { readImports } from '../src/parse/imports.ts';
import { file } from './parse-helpers.ts';
import { graphOf, testConfig } from './pipeline-helpers.ts';

const INBOX = `import { List, ListItem, ListItemText } from '@mui/material';
export interface InboxItem { id: string; from: string; preview: string }
export function Inbox({ items }: { items: InboxItem[] }) {
  return (<List dense>{items.map((item) => (<ListItem key={item.id} divider><ListItemText primary={item.from} secondary={item.preview} /></ListItem>))}</List>);
}`;
const STYLE_USER = (name: string) => `const S = { p: 1, m: 2, gap: 1 };\nexport function ${name}() { return <div sx={S} />; }`;
const SOURCES: Record<string, string> = {
  'src/shared/dead.tsx': `export function Dead() { return <div>never used</div>; }`,
  'src/features/a/Chip.tsx': `export function StatusChip() { return <span />; }\n// copied from b/Chip.tsx\nconst TONES = { open: 'success', won: 'info', lost: 'error' };`,
  'src/features/b/Chip.tsx': `export function StatusChip() { return <b />; }\nconst MAP = { x: '#111', y: '#222', z: '#333' };`,
  'src/features/c/Inbox.tsx': INBOX,
  'src/features/d/Inbox.tsx': INBOX,
  'src/features/e/x.tsx': `import { StatusChip } from '../a/Chip';\n${STYLE_USER('X')}\nexport function X2() { return <StatusChip />; }`,
  'src/features/e/y.tsx': STYLE_USER('Y'),
  'src/features/f/z.tsx': STYLE_USER('Z'),
};

// Runs the whole pipeline over `sources`; `reverse` feeds every input in the opposite order.
function detect(sources: Record<string, string>, opts: { cfg?: AppConfig; reverse?: boolean } = {}) {
  const entries = Object.entries(sources);
  if (opts.reverse) entries.reverse();
  const { components, graph } = graphOf(Object.fromEntries(entries));
  const blocks = new Map<string, StyleBlock[]>();
  const facts = entries.map(([f, s]) => {
    const ast = file(s, f);
    const ex = extractStyles(ast, s, f, readImports(ast), DEFAULT_THEME);
    if (ex.blocks.length) blocks.set(f, ex.blocks);
    return collectFileFacts(ast, s, f);
  });
  return detectFamilies({ facts, sources: new Map(entries), blocks, components, graph, cfg: opts.cfg ?? testConfig });
}
const run = (sources: Record<string, string>, opts: { cfg?: AppConfig; reverse?: boolean } = {}) => detect(sources, opts).families;
const families = () => run(SOURCES);
const byKey = (fs: ReturnType<typeof families>, key: string) => fs.find((f) => f.key === key);

// Hand-made facts for cases the parser cannot produce (missing sources, equal lines).
const fact = (f: string, over: Partial<FileFacts> = {}): FileFacts => ({ file: f, normHash: f, normLength: 300, statusMaps: [], copyComments: [], ...over });
const bare = (facts: FileFacts[], sources = new Map<string, string>()) =>
  detectFamilies({ facts, sources, blocks: new Map(), components: [], graph: graphOf({}).graph, cfg: testConfig }).families;

test('same-name, identical files and dead shared components are found', () => {
  const fs = families();
  assert.equal(byKey(fs, 'same-name:StatusChip')?.size, 2);
  assert.equal(byKey(fs, 'same-name:Inbox')?.size, 2);
  const identical = fs.find((f) => f.kind === 'identical-files');
  assert.deepEqual(identical?.members.map((m) => m.file), ['src/features/c/Inbox.tsx', 'src/features/d/Inbox.tsx']);
  assert.deepEqual(byKey(fs, 'dead-shared:all')?.members.map((m) => m.name), ['Dead']);
});

test('repeated style blocks, status maps, cross-feature imports and copy comments are found', () => {
  const fs = families();
  const block = fs.find((f) => f.kind === 'repeated-style-block');
  // A block held by a module-level const is named after it.
  assert.deepEqual(block?.members.map((m) => [m.file, m.name]), [['src/features/e/x.tsx', 'S'], ['src/features/e/y.tsx', 'S'], ['src/features/f/z.tsx', 'S']]);
  assert.equal(byKey(fs, 'status-color-map:all')?.size, 2);
  assert.equal(byKey(fs, 'cross-feature-import:e->a')?.size, 1);
  assert.deepEqual(byKey(fs, 'copy-comment:all')?.members.map((m) => [m.file, m.line]), [['src/features/a/Chip.tsx', 2]]);
});

test('families are sorted by key', () => {
  const keys = families().map((f) => f.key);
  assert.deepEqual(keys, [...keys].sort());
});

test('shingles and jaccard measure similarity', () => {
  assert.equal(shingles('a b c d e f').size, 2);
  assert.equal(jaccard(new Set(['a', 'b']), new Set(['b', 'c'])), 1 / 3);
});

const NEAR = (extra: string) => `${INBOX}\nexport const PAD = { a: 1, b: 2, c: 3, d: 4, e: 5, f: 6, g: 7 };${extra}`;
const NEAR_PAIR: Record<string, string> = {
  'src/features/c/Inbox.tsx': NEAR(''),
  'src/features/d/Inbox.tsx': NEAR('\nexport const EXTRA = 1;'),
};

test('near-duplicates are found by shingle similarity, and a partly alike file stays below the threshold', () => {
  const fs = run({
    ...NEAR_PAIR,
    // Same basename but only partly alike, so it stays below the 0.85 similarity threshold.
    'src/features/g/Inbox.tsx': `${NEAR('')}\nexport const ONLY_HERE = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30];`,
  });
  assert.deepEqual(fs.filter((f) => f.kind === 'near-duplicate-files').map((f) => f.key), ['near-duplicate-files:src/features/c/Inbox.tsx|src/features/d/Inbox.tsx']);
});

test('shared components used through a namespace import, a lazy import or a route are not dead', () => {
  const fs = run({
    'src/shared/ns.tsx': `export function NsUsed() { return <i />; }`,
    'src/shared/lz.tsx': `export default function LzUsed() { return <i />; }`,
    'src/shared/Home.tsx': `export function Home() { return <i />; }\nexport const routes = [{ path: '/', element: <Home /> }];`,
    'src/shared/dead.tsx': `export function Dead() { return <i />; }`,
    'src/features/h/use.tsx': `import * as Ns from '../../shared/ns';\nimport { lazy } from 'react';\nconst Lz = lazy(() => import('../../shared/lz'));\nexport function H() { return <><Ns.NsUsed /><Lz /></>; }`,
  });
  assert.deepEqual(byKey(fs, 'dead-shared:all')?.members.map((m) => m.name), ['Dead']);
});

// A shared file whose exported `CalendarField` is used elsewhere; `body` is the rest of the file, which holds the helper under test.
const FIELD_USER = { 'src/features/h/use.tsx': `import { CalendarField } from '../../shared/CalendarField';\nexport function H() { return <CalendarField />; }` };
const deadIn = (body: string) => byKey(run({ ...FIELD_USER, 'src/shared/CalendarField.tsx': `import { Calendar } from 'calendar-lib';\n${body}` }), 'dead-shared:all')?.members.map((m) => m.name);
const CELL = `function DayCell() { return <i />; }`;

test('a file-private helper used as a value in its own file is not dead, whatever form the use takes', () => {
  const uses: Record<string, string> = {
    'a slots prop': `${CELL}\nexport function CalendarField() { return <Calendar slots={{ day: DayCell }} />; }`,
    'a components prop': `${CELL}\nexport function CalendarField() { return <Calendar components={{ Row: DayCell }} />; }`,
    'a call argument': `${CELL}\nexport function CalendarField() { register(DayCell); return <Calendar />; }`,
    'a module-level map': `${CELL}\nconst CELLS = { day: DayCell };\nexport function CalendarField() { return <Calendar cells={CELLS} />; }`,
    'a sibling helper': `${CELL}\nfunction Grid() { return <Calendar slots={{ day: DayCell }} />; }\nexport function CalendarField() { return <Grid />; }`,
    'a memo alias of it': `import { memo } from 'react';\nfunction Inner() { return <i />; }\nconst Cell = memo(Inner);\nexport function CalendarField() { return <Calendar slots={{ day: Cell }} />; }`,
  };
  for (const [label, body] of Object.entries(uses)) assert.equal(deadIn(body), undefined, label);
});

test('a file-private helper that nothing refers to is still dead', () => {
  assert.deepEqual(deadIn(`${CELL}\nexport function CalendarField() { return <Calendar />; }`), ['DayCell']);
});

test('a helper that is referenced only in a type position is still dead', () => {
  const uses: Record<string, string> = {
    'a type alias': `${CELL}\ntype DayProps = React.ComponentProps<typeof DayCell>;\nexport function CalendarField(props: DayProps) { return <Calendar />; }`,
    'a props annotation': `${CELL}\nexport function CalendarField(props: { cell: typeof DayCell }) { return <Calendar />; }`,
    'an assertion': `${CELL}\nexport function CalendarField() { const c = null as unknown as typeof DayCell; return <Calendar />; }`,
  };
  for (const [label, body] of Object.entries(uses)) assert.deepEqual(deadIn(body), ['DayCell'], label);
});

test('a helper that refers only to itself, or is only re-exported by its own file, is still dead', () => {
  const uses: Record<string, string[]> = {
    'a self reference': [`function DayCell(): any { const again = DayCell; return <i />; }\nexport function CalendarField() { return <Calendar />; }`, 'DayCell'],
    'a memo alias that nothing uses': [`import { memo } from 'react';\nfunction Inner() { return <i />; }\nconst Cell = memo(Inner);\nexport function CalendarField() { return <Calendar />; }`, 'Inner'],
    'a default export wrapper': [`import { memo } from 'react';\nfunction Inner() { return <i />; }\nexport default memo(Inner);\nexport function CalendarField() { return <Calendar />; }`, 'Inner'],
    'an export list': [`${CELL}\nexport { DayCell as Cell };\nexport function CalendarField() { return <Calendar />; }`, 'DayCell'],
  };
  for (const [label, [body, name]] of Object.entries(uses)) assert.deepEqual(deadIn(body), [name], label);
});

test('static members, Object.assign targets, plain aliases and shadowing bindings do not make a component used', () => {
  const FORWARD = `import { forwardRef } from 'react';\nconst DayCell = forwardRef((props, ref) => <i ref={ref} />);`;
  const FIELD = `export function CalendarField() { return <Calendar />; }`;
  const uses: Record<string, string> = {
    'displayName': `${FORWARD}\nDayCell.displayName = 'DayCell';\n${FIELD}`,
    'propTypes': `${FORWARD}\nDayCell.propTypes = {};\n${FIELD}`,
    'defaultProps': `${FORWARD}\nDayCell.defaultProps = {};\n${FIELD}`,
    'Object.assign': `${FORWARD}\nObject.assign(DayCell, { extra: 1 });\n${FIELD}`,
    'an exported alias': `${CELL}\nexport const Alias = DayCell;\n${FIELD}`,
    'a destructured parameter of the same name': `${CELL}\nconst render = ({ DayCell }: { DayCell: unknown }) => <i />;\n${FIELD}`,
  };
  for (const [label, body] of Object.entries(uses)) assert.deepEqual(deadIn(body), ['DayCell'], label);
});

test('family keys and output do not depend on input order', () => {
  const sources = { ...SOURCES, 'src/features/p/Card.tsx': NEAR(''), 'src/features/q/Card.tsx': NEAR('\nexport const EXTRA = 1;') };
  const forward = run(sources);
  assert.ok(byKey(forward, 'near-duplicate-files:src/features/p/Card.tsx|src/features/q/Card.tsx'));
  assert.deepEqual(run(sources, { reverse: true }), forward);
  assert.deepEqual(run(NEAR_PAIR, { reverse: true }), run(NEAR_PAIR));
});

test('a pair with no source text is never reported as a near-duplicate', () => {
  const fs = bare([fact('src/a/Same.tsx'), fact('src/b/Same.tsx')]);
  assert.deepEqual(fs.filter((f) => f.kind === 'near-duplicate-files'), []);
});

test('same-basename groups of more than 25 files are not compared, and are listed as skipped', () => {
  const group = (n: number) => Object.fromEntries(Array.from({ length: n }, (_, i) => [`src/features/m${String(i + 1).padStart(2, '0')}/Inbox.tsx`, NEAR(`\nexport const EXTRA_${i + 1} = ${i + 1};`)]));
  const near = (n: number) => run(group(n)).filter((f) => f.kind === 'near-duplicate-files').length;
  assert.equal(near(25), (25 * 24) / 2);
  assert.equal(near(26), 0);
  assert.deepEqual(detect(group(25)).skipped, []);
  assert.deepEqual(detect(group(26)).skipped, [{ check: 'near-duplicate-files', name: 'Inbox.tsx', count: 26 }]);
});

test('an index file is compared under its folder name, so Foo/index.tsx and Bar/index.tsx are not one group', () => {
  const fs = run({
    'src/features/a/Foo/index.tsx': NEAR(''),
    'src/features/b/Foo/index.tsx': NEAR('\nexport const EXTRA = 1;'),
    'src/features/c/Bar/index.tsx': NEAR('\nexport const OTHER = 2;'),
  });
  assert.deepEqual(fs.filter((f) => f.kind === 'near-duplicate-files').map((f) => f.key), ['near-duplicate-files:src/features/a/Foo/index.tsx|src/features/b/Foo/index.tsx']);
});

test('same-name needs exported components in at least two modules', () => {
  const chip = (tag: string) => `export function StatusChip() { return <${tag} />; }`;
  const sameName = (sources: Record<string, string>) => run(sources).filter((f) => f.kind === 'same-name').map((f) => [f.key, f.members.map((m) => m.file), f.note]);
  assert.deepEqual(sameName({ 'src/features/a/StatusChip.tsx': chip('i'), 'src/features/b/StatusChip.tsx': chip('b') }), [
    ['same-name:StatusChip', ['src/features/a/StatusChip.tsx', 'src/features/b/StatusChip.tsx'], 'StatusChip is exported from 2 modules'],
  ]);
  assert.deepEqual(sameName({ 'src/features/a/one/StatusChip.tsx': chip('i'), 'src/features/a/two/StatusChip.tsx': chip('b') }), [], 'one module');
  assert.deepEqual(sameName({ 'src/features/a/x.tsx': 'function Row() { return <i />; }\nexport function X() { return <Row />; }', 'src/features/b/y.tsx': 'function Row() { return <b />; }\nexport function Y() { return <Row />; }' }), [], 'unexported helpers');
  // Only the exported definitions are members; files outside every module each count as their own.
  assert.deepEqual(sameName({ 'src/features/a/x.tsx': chip('i'), 'src/features/b/y.tsx': 'function StatusChip() { return <b />; }\nexport const Y = () => <StatusChip />;', 'src/loose/z.tsx': chip('u') }), [
    ['same-name:StatusChip', ['src/features/a/x.tsx', 'src/loose/z.tsx'], 'StatusChip is exported from 2 modules'],
  ]);
});

test('files under 200 normalised characters never form identical-files', () => {
  const ofLength = (n: number) => { const head = "export const A = '"; const tail = "';"; return head + 'x'.repeat(n - head.length - tail.length) + tail; };
  assert.equal(normalizeSource(ofLength(200)).length, 200);
  const pair = (n: number) => ({ 'src/features/a/Same.tsx': ofLength(n), 'src/features/b/Same.tsx': ofLength(n) });
  assert.deepEqual(run(pair(199)).filter((f) => f.kind === 'identical-files'), []);
  assert.equal(run(pair(200)).filter((f) => f.kind === 'identical-files').length, 1);
});

test('a style block shared by only two files is not a family', () => {
  const fs = run({ 'src/features/e/y.tsx': STYLE_USER('Y'), 'src/features/f/z.tsx': STYLE_USER('Z') });
  assert.deepEqual(fs.filter((f) => f.kind === 'repeated-style-block'), []);
});

test('members that share a file and line are ordered by name', () => {
  const fs = bare([fact('src/a.ts', { copyComments: [{ line: 1, text: 'copied from y' }, { line: 1, text: 'copied from x' }] })]);
  assert.deepEqual(byKey(fs, 'copy-comment:all')?.members.map((m) => m.name), ['copied from x', 'copied from y']);
});

const maps = (src: string) => collectFileFacts(file(src, 'x.tsx'), src, 'x.tsx').statusMaps;

test('status-to-colour lookup tables are status maps', () => {
  assert.deepEqual(maps(`const STATUS_COLORS = { open: 'success', closed: 'error', pending: 'warning' };`).map((m) => [m.name, m.entries]), [['STATUS_COLORS', 3]]);
  assert.deepEqual(maps(`const COLORS = { active: '#4caf50', inactive: '#9e9e9e', blocked: '#f44336' };`).map((m) => [m.name, m.entries]), [['COLORS', 3]]);
  assert.deepEqual(maps(`const TONE = { open: 'success', closed: 'error', pending: 'warning' } as Record<string, string>;`).map((m) => m.name), ['TONE']);
  // Entries may be colour objects; the inner objects are not reported on top of the table.
  assert.deepEqual(maps(`const CHIP = { open: { bg: '#e8f5e9', color: '#1b5e20' }, closed: { bg: '#ffebee', color: '#b71c1c' }, pending: { bg: '#fff8e1', color: '#e65100' } };`).map((m) => [m.name, m.entries]), [['CHIP', 3]]);
});

test('style objects, palette fragments and one-colour objects are not status maps', () => {
  const cases: Array<[string, string]> = [
    ['sx probe', `export function A() { return <Box sx={{ color: '#fff', bgcolor: '#000', borderColor: '#ccc', p: 1 }} />; }`],
    ['styled(Box) probe', `const Root = styled(Box)({ color: '#fff', bgcolor: '#000', borderColor: '#ccc' });`],
    ['style attribute', `export function A() { return <div style={{ a: '#111', b: '#222', c: '#333' }} />; }`],
    ['sx with a type assertion', `export function A() { return <Box sx={{ a: '#111', b: '#222', c: '#333' } as SxProps} />; }`],
    ['sx function', `export function A() { return <Box sx={(t) => ({ a: '#111', b: '#222', c: '#333' })} />; }`],
    ['styled(Box) object', `const R = styled(Box)({ a: '#111', b: '#222', c: '#333' });`],
    ['styled(Box) function', `const R = styled(Box)(({ theme }) => ({ a: '#111', b: '#222', c: '#333' }));`],
    ['styled(Box) block body', `const R = styled(Box)(({ theme }) => { return { a: '#111', b: '#222', c: '#333' }; });`],
    ['styled.div', `const R = styled.div({ a: '#111', b: '#222', c: '#333' });`],
    ['makeStyles', `const useStyles = makeStyles({ a: '#111', b: '#222', c: '#333' });`],
    ['css', `const c = css({ a: '#111', b: '#222', c: '#333' });`],
    ['colour property key', `const X = { open: 'success', closed: 'error', stroke: '#111' };`],
    ['backgroundColor key', `const X = { open: 'success', closed: 'error', backgroundColor: '#111' };`],
    ['palette fragment', `const P = { main: '#111', light: '#222', dark: '#333' };`],
    ['palette with contrastText', `const P = { main: '#111', light: '#222', dark: '#333', contrastText: '#444' };`],
    ['palette shades', `const P = { 50: '#111', 100: '#222', 200: '#333', 900: '#444' };`],
    ['accent shades', `const P = { A100: '#111', A200: '#222', A700: '#333' };`],
    ['one colour value', `const X = { a: 'success', b: 'success', c: 'success' };`],
    ['one colour in two spellings', `const X = { a: '#FFF', b: '#fff', c: ' #fff' };`],
  ];
  for (const [label, src] of cases) assert.deepEqual(maps(src), [], label);
});

test('a map with some palette-shaped keys is still a status map when other keys are not', () => {
  assert.equal(maps(`const X = { main: 'success', open: 'error', closed: 'warning' };`).length, 1);
});

test('repeated inline style objects do not create a status-color-map family', () => {
  const probe = (name: string) => `export function ${name}() { return <Box sx={{ color: '#fff', bgcolor: '#000', borderColor: '#ccc', p: 1 }} />; }`;
  const fs = run({ 'src/features/a/A.tsx': probe('A'), 'src/features/b/B.tsx': probe('B') });
  assert.equal(byKey(fs, 'status-color-map:all'), undefined);
});

test('status maps in the theme entry and in theme folders are excluded', () => {
  const MAP = `export const STATUS = { a: 'success', b: 'error', c: 'warning' };`;
  const fs = run({
    'src/app/mui-theme.ts': MAP,
    'src/theme/status.ts': MAP,
    'src/features/a/theme/tones.ts': MAP,
    'src/features/a/one.ts': MAP,
    'src/features/b/two.ts': MAP,
  }, { cfg: { ...testConfig, themeEntry: 'src/app/mui-theme.ts' } });
  assert.deepEqual(byKey(fs, 'status-color-map:all')?.members.map((m) => m.file), ['src/features/a/one.ts', 'src/features/b/two.ts']);
});
