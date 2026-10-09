import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyAll, ecosystemOf, type Classification } from '../src/inventory/classify.ts';
import { libLevel } from '../src/adapters/react-mui/primitives.ts';
import { RANK } from '../src/inventory/levels.ts';
import type { ComponentDef, ComponentSignals } from '../src/inventory/components.ts';
import type { Graph } from '../src/inventory/graph.ts';
import { testConfig } from './pipeline-helpers.ts';

function def(id: string, over: Partial<ComponentSignals> = {}, rendered = 1): ComponentDef {
  const [file, name] = id.split('#');
  return {
    id, name, local: name, file, line: 1, loc: 10, exportNames: [],
    rendered: Array.from({ length: rendered }, () => ({ name: 'X', line: 1, props: {} })),
    signals: { data: false, dataHooks: [], slots: 0, region: false, primaryActions: 0, pageArea: false, domainProps: false, styledTarget: null, ...over },
    refs: [],
  };
}
function graph(parts: { library?: Record<string, string[]>; renders?: Record<string, string[]>; routes?: string[] } = {}): Graph {
  const toMap = (o: Record<string, string[]> = {}) => new Map(Object.entries(o).map(([k, v]) => [k, new Set(v)]));
  return { importers: new Map(), library: toMap(parts.library), renders: toMap(parts.renders), routes: new Set(parts.routes ?? []), valueRefs: new Set(), crossFeature: [] };
}
const one = (c: ComponentDef, g: Graph) => classifyAll([c], g).get(c.id);
const levelsOf = (m: Map<string, Classification>) => Object.fromEntries([...m].map(([id, c]) => [id, c.level]).sort(([a], [b]) => (a < b ? -1 : 1)));

// Ready-made in-house children for the parent tests; kidLibs gives them their level.
const search = () => def('k/Search.tsx#Search'); // wraps Autocomplete -> molecule
const status = () => def('k/Status.tsx#Status'); // wraps Chip -> atom
const kidLibs = { 'k/Search.tsx#Search': ['mui:Autocomplete'], 'k/Status.tsx#Status': ['mui:Chip'] };

test('single primitive wrappers are atoms', () => {
  assert.deepEqual(one(def('a.tsx#A'), graph({ library: { 'a.tsx#A': ['mui:Chip', 'icon:Close'] } })), { level: 'atom', reason: 'wraps a single primitive', confidence: 'high', smells: [] });
});

test('two atoms for one job are a molecule; four are an organism', () => {
  assert.equal(one(def('m.tsx#M'), graph({ library: { 'm.tsx#M': ['mui:Typography', 'mui:Button', 'mui:Box'] } }))?.level, 'molecule');
  assert.equal(one(def('o.tsx#O'), graph({ library: { 'o.tsx#O': ['mui:Typography', 'mui:Button', 'mui:IconButton', 'mui:Avatar'] } }))?.level, 'organism');
});

test('regions and data make organisms; routes make pages; layout-only is layout', () => {
  assert.deepEqual(one(def('r.tsx#R', { region: true }), graph({ library: { 'r.tsx#R': ['mui:Dialog'] } })), { level: 'organism', reason: 'renders a region (dialog, drawer, table, nav…)', confidence: 'high', smells: [] });
  assert.deepEqual(one(def('d.tsx#D', { data: true, dataHooks: ['useQuery'] }), graph()), { level: 'organism', reason: 'binds data (useQuery)', confidence: 'high', smells: [] });
  assert.equal(one(def('p.tsx#P'), graph({ routes: ['p.tsx#P'] }))?.level, 'page');
  assert.equal(one(def('l.tsx#L'), graph({ library: { 'l.tsx#L': ['mui:Box', 'dom:div'] } }))?.level, 'layout');
});

test('page-level areas with two slots are templates; with data they smell', () => {
  assert.equal(one(def('t.tsx#T', { pageArea: true, slots: 2 }), graph({ library: { 't.tsx#T': ['mui:Container'] } }))?.level, 'template');
  assert.deepEqual(one(def('u.tsx#U', { pageArea: true, slots: 2, data: true, dataHooks: ['useQuery'] }), graph())?.smells, ['template-with-logic']);
});

test('styled wrappers take their target level', () => {
  const styled = (name: string, target: string, lib: string[], kids: ComponentDef[] = []) => {
    const c = def(`s/${name}.tsx#${name}`, { styledTarget: target });
    const g = graph({ library: { [c.id]: lib, ...kidLibs }, renders: kids.length ? { [c.id]: kids.map((k) => k.id) } : {} });
    return classifyAll([c, ...kids], g).get(c.id);
  };
  assert.equal(one(def('s.tsx#S', { styledTarget: 'Button' }), graph({ library: { 's.tsx#S': ['mui:Button'] } }))?.reason, 'styled wrapper of Button');
  assert.deepEqual(styled('Pill', 'Button', ['mui:Button']), { level: 'atom', reason: 'styled wrapper of Button', confidence: 'high', smells: [] });
  assert.deepEqual(styled('Surface', 'Box', ['mui:Box']), { level: 'layout', reason: 'styled wrapper of Box', confidence: 'high', smells: [] });
  assert.deepEqual(styled('Popup', 'Dialog', ['mui:Dialog']), { level: 'organism', reason: 'styled wrapper of Dialog', confidence: 'high', smells: [] });
  assert.deepEqual(styled('Skin', 'Search', [], [search()]), { level: 'molecule', reason: 'styled wrapper of Search', confidence: 'high', smells: [] });
  // The target resolved to nothing usable: still an atom, but only a guess.
  assert.deepEqual(styled('Ghost', 'Missing', ['unknown:Missing']), { level: 'atom', reason: 'styled wrapper of Missing', confidence: 'low', smells: [] });
});

test('a parent is raised to its highest child', () => {
  const parent = def('p.tsx#Parent');
  const child = def('c.tsx#Child', { region: true });
  const g = graph({ library: { 'p.tsx#Parent': ['mui:Typography'], 'c.tsx#Child': ['mui:Drawer'] }, renders: { 'p.tsx#Parent': ['c.tsx#Child'] } });
  const out = classifyAll([parent, child], g).get('p.tsx#Parent');
  assert.equal(out?.level, 'organism');
  assert.match(out?.reason ?? '', /raised to organism by its children/);
  assert.equal(out?.confidence, 'medium');
});

test('molecule-level primitives, name smells and empty components', () => {
  assert.equal(one(def('a.tsx#Auto'), graph({ library: { 'a.tsx#Auto': ['mui:Autocomplete'] } }))?.level, 'molecule');
  assert.deepEqual(one(def('x.tsx#LeadsPage'), graph({ library: { 'x.tsx#LeadsPage': ['mui:Chip'] } }))?.smells, ['name-suggests-page']);
  assert.equal(one(def('e.tsx#Empty', {}, 0), graph())?.confidence, 'low');
});

test('ecosystemOf assigns layer, logic and promotion candidates', () => {
  const g = graph();
  g.importers.set('src/features/a/Card.tsx#Card', new Set(['src/features/a/x.tsx', 'src/features/b/y.tsx']));
  assert.deepEqual(ecosystemOf(def('src/features/a/Card.tsx#Card'), g, testConfig), { layer: 'recipe', logic: 'presentational', importerFiles: 2, importerModules: ['a', 'b'], promotionCandidate: true });
  assert.equal(ecosystemOf(def('src/shared/Tag.tsx#Tag'), graph(), testConfig).layer, 'core');
  assert.deepEqual(ecosystemOf(def('src/features/a/Solo.tsx#Solo', { data: true }), graph(), testConfig), { layer: 'snowflake', logic: 'smart', importerFiles: 0, importerModules: [], promotionCandidate: false });
});

test('icon-only and unrecognised components are not confirmed layout', () => {
  assert.deepEqual(one(def('i.tsx#StatusIcon'), graph({ library: { 'i.tsx#StatusIcon': ['icon:CheckCircle'] } })), { level: 'atom', reason: 'renders an icon', confidence: 'high', smells: [] });
  assert.deepEqual(one(def('v.tsx#Picker'), graph({ library: { 'v.tsx#Picker': ['react-select:Select'] } })), { level: 'atom', reason: 'renders no recognised primitives', confidence: 'low', smells: [] });
  // A layout primitive next to an icon still reads as layout; the icon never counts as an atom.
  assert.deepEqual(one(def('w.tsx#Wrap'), graph({ library: { 'w.tsx#Wrap': ['mui:Box', 'icon:Check'] } })), { level: 'layout', reason: 'renders only layout primitives', confidence: 'high', smells: [] });
});

test('a molecule child makes its parent an organism when it brings a second in-house child', () => {
  const composer = def('k/Composer.tsx#Composer');
  const g = graph({ library: kidLibs, renders: { [composer.id]: [search().id, status().id] } });
  assert.deepEqual(classifyAll([composer, search(), status()], g).get(composer.id), { level: 'organism', reason: 'composes 2+ in-house components including a molecule or higher', confidence: 'high', smells: [] });
});

test('four parts form a section, whether they are primitives, kids or both', () => {
  const kids = ['Alpha', 'Beta', 'Gamma', 'Delta'].map((n) => def(`k/${n}.tsx#${n}`));
  const strip = def('k/Strip.tsx#Strip');
  const kidGraph = graph({ library: Object.fromEntries(kids.map((k) => [k.id, ['mui:Chip']])), renders: { [strip.id]: kids.map((k) => k.id) } });
  assert.deepEqual(classifyAll([strip, ...kids], kidGraph).get(strip.id), { level: 'organism', reason: '4+ parts form a section', confidence: 'high', smells: [] });
  // Three primitives plus one molecule child is four parts: a molecule child must never make it smaller than an atom child would.
  const summary = def('k/Summary.tsx#Summary');
  const mixed = graph({ library: { ...kidLibs, [summary.id]: ['mui:Typography', 'mui:Button', 'mui:Avatar'] }, renders: { [summary.id]: [search().id] } });
  assert.deepEqual(classifyAll([summary, search()], mixed).get(summary.id), { level: 'organism', reason: '4+ parts form a section', confidence: 'high', smells: [] });
});

test('more than one primary action makes an organism', () => {
  const actions = def('k/Actions.tsx#Actions', { primaryActions: 2 });
  assert.deepEqual(one(actions, graph({ library: { [actions.id]: ['mui:Typography', 'mui:Button'] } })), { level: 'organism', reason: 'more than one primary action', confidence: 'high', smells: [] });
});

test('a wrapped molecule stays a molecule unless it carries several actions', () => {
  const wrapper = def('k/Wrapper.tsx#Wrapper');
  const wrapped = graph({ library: kidLibs, renders: { [wrapper.id]: [search().id] } });
  assert.deepEqual(classifyAll([wrapper, search()], wrapped).get(wrapper.id), { level: 'molecule', reason: 'wraps a molecule-level component', confidence: 'high', smells: [] });
  const toolset = def('k/Toolset.tsx#Toolset', { primaryActions: 2 });
  const busy = graph({ library: kidLibs, renders: { [toolset.id]: [search().id] } });
  assert.deepEqual(classifyAll([toolset, search()], busy).get(toolset.id), { level: 'organism', reason: 'wraps a molecule-level component; raised to organism by more than one primary action', confidence: 'medium', smells: [] });
});

test('template and page children raise their parent to organism, never above', () => {
  const layout = def('k/DashboardLayout.tsx#DashboardLayout', { pageArea: true, slots: 2 });
  const reports = def('k/ReportsPage.tsx#ReportsPage');
  const frame = def('k/Frame.tsx#Frame');
  const routes = def('k/Routes.tsx#Routes');
  const g = graph({ library: { [layout.id]: ['mui:Container'] }, renders: { [frame.id]: [layout.id], [routes.id]: [reports.id] }, routes: [reports.id] });
  const out = classifyAll([frame, routes, layout, reports], g);
  assert.equal(out.get(layout.id)?.level, 'template');
  assert.equal(out.get(reports.id)?.level, 'page');
  assert.deepEqual(out.get(frame.id), { level: 'organism', reason: 'wraps a molecule-level component; raised to organism by its children', confidence: 'medium', smells: [] });
  assert.deepEqual(out.get(routes.id), { level: 'organism', reason: 'wraps a molecule-level component; raised to organism by its children', confidence: 'medium', smells: [] });
});

test('a render cycle settles on the same levels whatever order components arrive in', () => {
  const outer = def('o.tsx#Outer');
  const inner = def('i.tsx#Inner');
  const g = graph({
    library: { [outer.id]: ['mui:Typography', 'mui:Button', 'mui:Avatar'], [inner.id]: ['mui:Autocomplete'] },
    renders: { [outer.id]: [inner.id], [inner.id]: [outer.id] },
  });
  const forward = classifyAll([outer, inner], g);
  const backward = classifyAll([inner, outer], g);
  assert.deepEqual(levelsOf(forward), { [inner.id]: 'organism', [outer.id]: 'organism' });
  assert.deepEqual(levelsOf(backward), levelsOf(forward));
  for (const m of [forward, backward]) {
    const [o, i] = [m.get(outer.id)!, m.get(inner.id)!];
    assert.ok(RANK[o.level] >= RANK[i.level], 'outer is never below inner');
    assert.ok(RANK[i.level] >= RANK[o.level], 'inner is never below outer');
  }
});

test('a deep chain ending in a drawer is raised all the way up', () => {
  const depth = 15;
  const chain = Array.from({ length: depth }, (_, i) => def(`n/Node${i}.tsx#Node${i}`));
  const library: Record<string, string[]> = {};
  const renders: Record<string, string[]> = {};
  chain.forEach((c, i) => {
    const last = i === depth - 1;
    library[c.id] = [last ? 'mui:Drawer' : 'mui:Typography'];
    if (!last) renders[c.id] = [chain[i + 1].id];
  });
  const g = graph({ library, renders });
  for (const order of [chain, [...chain].reverse()]) {
    const out = classifyAll(order, g);
    assert.deepEqual([...out.values()].map((c) => c.level), order.map(() => 'organism'));
  }
  assert.match(classifyAll(chain, g).get(chain[0].id)?.reason ?? '', /raised to organism by its children/);
});

test('name hints: a Layout that is only layout is fine, and a molecule may be named for its atom', () => {
  assert.deepEqual(one(def('k/TwoColumnLayout.tsx#TwoColumnLayout'), graph({ library: { 'k/TwoColumnLayout.tsx#TwoColumnLayout': ['mui:Box', 'mui:Stack'] } })), { level: 'layout', reason: 'renders only layout primitives', confidence: 'high', smells: [] });
  assert.deepEqual(one(def('k/FooButton.tsx#FooButton'), graph({ library: { 'k/FooButton.tsx#FooButton': ['mui:Typography', 'mui:Button'] } })), { level: 'molecule', reason: '2+ atoms combined for one job', confidence: 'high', smells: [] });
  // The exemption stops at molecules: an organism named for a single atom is still suspicious.
  assert.deepEqual(one(def('k/BigButton.tsx#BigButton'), graph({ library: { 'k/BigButton.tsx#BigButton': ['mui:Typography', 'mui:Button', 'mui:IconButton', 'mui:Avatar'] } }))?.smells, ['name-suggests-atom']);
});

test('ecosystemOf counts shared importers as a module and drops files outside every module', () => {
  const card = def('src/features/a/Card.tsx#Card');
  const withImporters = (...files: string[]) => { const g = graph(); g.importers.set(card.id, new Set(files)); return g; };
  assert.deepEqual(ecosystemOf(card, withImporters('src/features/a/x.tsx', 'src/shared/y.tsx'), testConfig), { layer: 'recipe', logic: 'presentational', importerFiles: 2, importerModules: ['a', 'shared'], promotionCandidate: true });
  assert.deepEqual(ecosystemOf(card, withImporters('src/features/a/x.tsx', 'src/App.tsx'), testConfig), { layer: 'recipe', logic: 'presentational', importerFiles: 2, importerModules: ['a'], promotionCandidate: false });
  assert.deepEqual(ecosystemOf(card, withImporters('src/features/a/x.tsx', 'src/features/a/y.tsx'), testConfig), { layer: 'recipe', logic: 'presentational', importerFiles: 2, importerModules: ['a'], promotionCandidate: false });
});

test('libLevel knows modals, picker variants, ignored providers and foreign libraries', () => {
  assert.equal(libLevel('mui:Modal'), 'organism');
  for (const n of ['DesktopDatePicker', 'MobileDatePicker', 'StaticDatePicker', 'DateCalendar', 'DesktopTimePicker', 'MobileTimePicker', 'StaticTimePicker']) assert.equal(libLevel(`mui:${n}`), 'molecule', n);
  assert.equal(libLevel('mui:ThemeProvider'), null);
  assert.equal(libLevel('mui:SomethingNew'), 'atom');
  assert.equal(libLevel('icon:Close'), 'icon');
  assert.equal(libLevel('dom:section'), 'layout');
  assert.equal(libLevel('router:Routes'), null);
  assert.equal(libLevel('unknown:Missing'), null);
  assert.equal(libLevel('react-select:Select'), null);
});
