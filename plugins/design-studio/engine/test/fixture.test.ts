import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig } from '../src/config/config.ts';
import { runInventory } from '../src/inventory/run.ts';
import { registrySchema } from '../src/schemas/registry.ts';
import { makeValidator } from '../src/schemas/validate.ts';
import { stableStringify } from '../src/util/write.ts';
import { readText } from '../src/util/read.ts';
import { FIXTURE, tmpDir } from './helpers.ts';

const GOLDEN = fileURLToPath(new URL('./golden/mini-crm.registry.json', import.meta.url));
const loaded = loadConfig(join(FIXTURE, 'design-system', 'design-studio.config.json'));
const run = () => runInventory({ appRootAbs: loaded.appRootAbs, cfg: loaded.config, git: false });
const result = run();
const reg = result.registry;

function comp(id: string) {
  const c = reg.components.find((x) => x.id === id);
  assert.ok(c, `missing component ${id}`);
  return c;
}
function fam(key: string) {
  const f = reg.families.find((x) => x.key === key);
  assert.ok(f, `missing family ${key}`);
  return f;
}
const values = (file: string, property: string) => result.samples.filter((s) => s.file === file && s.property === property).map((s) => [s.ctx, s.px ?? s.raw, s.cls]);

test('the registry is schema-valid and reads the theme', () => {
  assert.deepEqual(makeValidator(registrySchema)(reg), []);
  assert.deepEqual(reg.theme, { spacingUnit: 8, radiusUnit: 4, source: 'static' });
});

test('the planted components get the expected levels and layers', () => {
  const expect: Array<[string, string, string]> = [
    ['src/common/components/status-tag.tsx#StatusTag', 'atom', 'core'],
    ['src/common/components/page-title.tsx#PageTitle', 'atom', 'core'],
    ['src/common/components/panel-toolbar.tsx#PanelToolbar', 'molecule', 'core'],
    ['src/common/components/unused-card.tsx#UnusedCard', 'atom', 'core'],
    ['src/components/leads/LeadRow.tsx#LeadRow', 'molecule', 'snowflake'],
    ['src/components/deals/DealsPanel.tsx#DealsPanel', 'organism', 'snowflake'],
    ['src/components/messenger/Inbox.tsx#Inbox', 'molecule', 'snowflake'],
    ['src/components/settings/StatusChip.tsx#StatusChip', 'atom', 'recipe'],
    ['src/components/deals/StatusChip.tsx#StatusChip', 'atom', 'snowflake'],
  ];
  for (const [id, level, layer] of expect) assert.deepEqual([comp(id).level, comp(id).layer], [level, layer], id);
  const leads = comp('src/components/leads/LeadsPage.tsx#LeadsPage');
  assert.deepEqual([leads.level, leads.logic], ['page', 'smart']);
  assert.deepEqual(leads.signals.dataHooks, ['fetchLeads', 'useQuery']);
  assert.equal(comp('src/components/settings/SettingsPage.tsx#SettingsPage').level, 'page');
});

test('reach is resolved through barrels, default re-exports, baseUrl and lazy routes', () => {
  assert.equal(comp('src/common/components/status-tag.tsx#StatusTag').importers.files, 1);
  assert.equal(comp('src/common/components/page-title.tsx#PageTitle').importers.files, 1);
  assert.equal(comp('src/common/components/panel-toolbar.tsx#PanelToolbar').importers.files, 1);
  const chip = comp('src/components/settings/StatusChip.tsx#StatusChip');
  assert.deepEqual(chip.importers, { files: 2, modules: ['deals', 'settings'] });
  assert.equal(chip.promotionCandidate, true);
});

test('the planted duplicate families are found', () => {
  assert.equal(fam('same-name:StatusChip').size, 2);
  assert.equal(fam('same-name:Inbox').size, 2);
  assert.deepEqual(reg.families.find((f) => f.kind === 'identical-files')?.members.map((m) => m.file), ['src/components/messenger-v2/Inbox.tsx', 'src/components/messenger/Inbox.tsx']);
  assert.deepEqual(reg.families.find((f) => f.kind === 'repeated-style-block')?.members.map((m) => m.file), ['src/components/deals/DealsPanel.tsx', 'src/components/leads/LeadsPage.tsx', 'src/components/settings/SettingsPage.tsx']);
  assert.equal(fam('status-color-map:all').size, 3);
  assert.equal(fam('cross-feature-import:deals->settings').size, 1);
  assert.deepEqual(fam('dead-shared:all').members.map((m) => m.name), ['UnusedCard']);
  assert.deepEqual(fam('copy-comment:all').members.map((m) => m.file), ['src/components/deals/StatusChip.tsx']);
});

test('components carry their duplicate families and style quality', () => {
  assert.ok(comp('src/components/settings/StatusChip.tsx#StatusChip').families.includes('same-name:StatusChip'));
  const inbox = comp('src/components/messenger/Inbox.tsx#Inbox').families;
  assert.ok(inbox.includes('same-name:Inbox') && inbox.some((k) => k.startsWith('identical-files:')));
  assert.deepEqual(comp('src/common/components/unused-card.tsx#UnusedCard').families, ['dead-shared:all']);
  assert.deepEqual(comp('src/common/components/status-tag.tsx#StatusTag').quality, { rawValues: 2, themeValues: 1 });
  // Module-level maps, style objects and the copy comment above a component belong to the components that use them (I1).
  const block = reg.families.find((f) => f.kind === 'repeated-style-block')?.key ?? '';
  assert.deepEqual(comp('src/components/deals/StatusChip.tsx#StatusChip').families, ['copy-comment:all', 'same-name:StatusChip', 'status-color-map:all']);
  assert.deepEqual(comp('src/components/leads/LeadRow.tsx#LeadRow').families, ['status-color-map:all']);
  assert.deepEqual(comp('src/components/deals/DealsPanel.tsx#DealsPanel').families, ['cross-feature-import:deals->settings', block]);
  assert.deepEqual(comp('src/components/deals/DealsPanel.tsx#DealsPanel').quality, { rawValues: 3, themeValues: 2 });
  assert.deepEqual(comp('src/components/settings/SettingsPage.tsx#SettingsPage').quality, { rawValues: 7, themeValues: 3 });
});

test('the theme file\'s palette is not counted as raw values, but its samples are kept (I3)', () => {
  assert.equal(result.samples.filter((s) => s.file === 'src/theme/index.ts').length, 3);
  assert.equal(reg.metrics.distinct.colors, 8);
  assert.equal(reg.modules.find((m) => m.module === '(other)')?.samples, 2);
});

test('style values are converted with their unit context', () => {
  assert.deepEqual(values('src/common/components/unused-card.tsx', 'p'), [['sx', 4.8, 'theme']]);
  assert.deepEqual(values('src/components/settings/SettingsPage.tsx', 'padding'), [['makeStyles', 16, 'theme'], ['style', 5, 'px']]);
  assert.deepEqual(values('src/components/settings/SettingsPage.tsx', 'marginTop'), [['makeStyles', 12, 'px']]);
  assert.deepEqual(values('src/common/components/status-tag.tsx', 'borderRadius'), [['sx', 8, 'theme']]);
  assert.deepEqual(values('src/common/components/status-tag.tsx', 'color'), [['sx', '#ffffff', 'raw-color']]);
  assert.deepEqual(values('src/styles/global.css', 'padding'), [['css', 10, 'px']]);
  assert.deepEqual(values('src/components/leads/LeadRow.tsx', 'new'), [['literal', '#2196f3', 'raw-color']]);
  assert.deepEqual(values('src/components/leads/LeadsPage.tsx', 'minHeight'), [['sx', 'calc(100vh - 48px)', 'calc']]);
});

test('modules are scored', () => {
  assert.deepEqual(reg.modules.map((m) => m.module), ['(other)', 'deals', 'leads', 'messenger', 'messenger-v2', 'settings', 'shared']);
  const leads = reg.modules.find((m) => m.module === 'leads');
  assert.deepEqual([leads?.files, leads?.i18nCoverage, leads?.testRatio], [2, 0.5, 0.5]);
  assert.equal(reg.modules.find((m) => m.module === 'settings')?.i18nCoverage, 0);
});

test('two runs are byte-identical', () => {
  const again = run();
  assert.equal(stableStringify(again.registry), stableStringify(reg));
  assert.equal(stableStringify(again.samples), stableStringify(result.samples));
});

test('a copy of the fixture elsewhere gives the same registry, samples and report', () => {
  const copy = join(tmpDir(), 'relocated', 'mini-crm');
  cpSync(FIXTURE, copy, { recursive: true });
  const moved = loadConfig(join(copy, 'design-system', 'design-studio.config.json'));
  assert.notEqual(moved.appRootAbs, loaded.appRootAbs);
  const there = runInventory({ appRootAbs: moved.appRootAbs, cfg: moved.config, git: false });
  assert.equal(stableStringify(there.registry), stableStringify(reg));
  assert.equal(stableStringify(there.samples), stableStringify(result.samples));
  assert.equal(there.report, result.report);
});

test('the registry matches the committed golden file', () => {
  assert.equal(stableStringify(reg), readText(GOLDEN), 'golden is stale — run npm run golden and review the diff');
});
