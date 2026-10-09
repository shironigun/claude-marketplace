import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractStyles } from '../src/adapters/react-mui/extract.ts';
import { DEFAULT_THEME } from '../src/adapters/react-mui/units.ts';
import { readImports } from '../src/parse/imports.ts';
import { file } from './parse-helpers.ts';

function run(src: string) {
  const ast = file(src);
  return extractStyles(ast, src, 'src/x.tsx', readImports(ast), DEFAULT_THEME);
}
const rows = (r: ReturnType<typeof run>) => r.samples.map((s) => `${s.ctx}:${s.property}=${s.px ?? s.raw}:${s.cls}`);

test('inline sx objects become samples with px values', () => {
  const r = run(`import { Box } from '@mui/material';\nexport const A = () => <Box sx={{ p: 2, mt: 0.5, color: '#FFF', '&:hover': { bgcolor: 'primary.main' } }} />;`);
  assert.deepEqual(rows(r), ['sx:p=16:theme', 'sx:mt=4:theme', 'sx:color=#ffffff:raw-color', 'sx:bgcolor=primary.main:theme-ref']);
  assert.equal(r.samples[3].selector, true);
});

test('sx arrays, conditionals and theme callbacks are followed', () => {
  const r = run(`export const A = ({ on }) => <div><span sx={[{ p: 1 }, on && { m: 2 }]} /><span sx={(t) => ({ gap: t.spacing(1) })} /></div>;`);
  assert.deepEqual(rows(r), ['sx:p=8:theme', 'sx:m=16:theme', 'sx:gap=8:theme']);
  assert.equal(r.samples[1].conditional, true);
});

test('style attributes use px semantics', () => {
  assert.deepEqual(rows(run(`export const A = () => <div style={{ padding: 5, margin: '4px 8px' }} />;`)), ['style:padding=5:px', 'style:margin=4:px', 'style:margin=8:px']);
});

test('system props on MUI layout hosts are sampled; on other components they are not', () => {
  const r = run(`import { Stack, Typography } from '@mui/material';\nimport { Card } from './card';\nexport const A = () => <Stack spacing={2} p={1}><Typography fontSize={12} color="text.secondary" /><Card p={3} /></Stack>;`);
  assert.deepEqual(rows(r), ['system-prop:spacing=16:theme', 'system-prop:p=8:theme', 'system-prop:fontSize=12:px', 'system-prop:color=text.secondary:theme-ref']);
});

test('sx and style inside *Props objects are followed', () => {
  assert.deepEqual(rows(run(`import { Drawer } from '@mui/material';\nexport const A = () => <Drawer PaperProps={{ sx: { width: 420 } }} slotProps={{ paper: { style: { padding: 8 } } }} />;`)), ['sx:width=420:px', 'style:padding=8:px']);
});

test('MUI primitives are counted with their variant, size and color', () => {
  const r = run(`import { Button, Chip } from '@mui/material';\nexport const A = () => <><Button variant="contained" size="small">Go</Button><Chip color="success" /></>;`);
  assert.deepEqual(r.primitives, [{ name: 'Button', props: { variant: 'contained', size: 'small' } }, { name: 'Chip', props: { color: 'success' } }]);
});

test('objects with three or more style props are recorded as blocks', () => {
  const r = run(`export const A = () => <div sx={{ p: 1, m: 1, gap: 1 }} />;`);
  assert.equal(r.blocks.length, 1);
  assert.equal(r.blocks[0].props, 3);
});

test('Container maxWidth is a breakpoint keyword, not a size sample', () => {
  const r = run(`import { Box, Container } from '@mui/material';\nexport const A = () => <Container maxWidth="lg"><Container maxWidth={false} /><Box maxWidth={600} /></Container>;`);
  assert.deepEqual(rows(r), ['system-prop:maxWidth=600:px']);
});
