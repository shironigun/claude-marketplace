import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractStyles } from '../src/adapters/react-mui/extract.ts';
import { extractCssFile } from '../src/adapters/react-mui/extract-nonjsx.ts';
import { DEFAULT_THEME } from '../src/adapters/react-mui/units.ts';
import { parseCssDeclarations } from '../src/parse/css.ts';
import { readImports } from '../src/parse/imports.ts';
import { file } from './parse-helpers.ts';

function run(src: string) {
  const ast = file(src);
  return extractStyles(ast, src, 'src/x.tsx', readImports(ast), DEFAULT_THEME);
}
const rows = (r: ReturnType<typeof run>) => r.samples.map((s) => `${s.ctx}:${s.property}=${s.px ?? s.raw}:${s.cls}`);

test('tss-react makeStyles classes use px semantics with theme.spacing as theme', () => {
  const r = run(`import { makeStyles } from 'tss-react/mui';\nconst useStyles = makeStyles()((theme) => ({ header: { marginTop: 12, padding: theme.spacing(2), borderRadius: 6 } }));`);
  assert.deepEqual(rows(r), ['makeStyles:marginTop=12:px', 'makeStyles:padding=16:theme', 'makeStyles:borderRadius=6:px']);
  assert.equal(r.samples[0].element, '.header');
});

test('styled() objects and styled tagged templates are sampled', () => {
  const r = run("import { styled } from '@mui/material/styles';\nimport Button from '@mui/material/Button';\nconst A = styled(Button)(({ theme }) => ({ padding: 6, color: '#333' }));\nconst B = styled.div`\n  margin: 10px;\n  font-size: 13px;\n`;");
  assert.deepEqual(rows(r), ['styled:padding=6:px', 'styled:color=#333333:raw-color', 'css:margin=10:px', 'css:fontSize=13:px']);
  assert.equal(r.samples[2].line, 5);
});

test('module-level style constants take their context from their type or their use', () => {
  const r = run(`import type { SxProps } from '@mui/material';\nconst HEAD: SxProps = { fontWeight: 600, py: 1 };\nconst ROW = { px: 2 };\nconst INLINE = { padding: 3 };\nconst UNUSED = { padding: 9 };\nexport const A = () => <div><span sx={ROW} /><span style={INLINE} /></div>;`);
  assert.deepEqual(rows(r), ['sx:fontWeight=600:unitless', 'sx:py=8:theme', 'sx:px=16:theme', 'style:padding=3:px']);
});

test('stray colour literals are kept with their property name', () => {
  const r = run(`const STATUS = { won: '#4CAF50', lost: 'rgb(244, 67, 54)' };\nexport const A = () => <i data-c="#000" sx={{ color: '#111' }} />;`);
  assert.deepEqual(r.samples.filter((s) => s.ctx === 'literal').map((s) => [s.property, s.raw]), [['won', '#4caf50'], ['lost', 'rgb(244,67,54)'], ['data-c', '#000000']]);
});

test('a colour literal on a namespaced JSX attribute keeps the attribute name', () => {
  const r = run(`export const A = () => <svg><use xlink:href="#abc" /></svg>;`);
  assert.deepEqual(r.samples.map((s) => [s.property, s.raw]), [['xlink:href', '#aabbcc']]);
});

test('a final declaration with no semicolon or closing brace is still read', () => {
  assert.deepEqual(parseCssDeclarations('gap: 4px'), [{ property: 'gap', value: '4px', line: 1 }]);
  assert.deepEqual(parseCssDeclarations('margin: 0;\n  padding: 2px  '), [{ property: 'margin', value: '0', line: 1 }, { property: 'padding', value: '2px', line: 2 }]);
  const r = run("import { css } from '@emotion/react';\nconst c = css`gap: 4px`;");
  assert.deepEqual(rows(r), ['css:gap=4:px']);
});

test('CSS files are parsed declaration by declaration', () => {
  const samples = extractCssFile('.page {\n  padding: 10px;\n  color: #333333;\n}\na:hover { margin: 0 }', 'src/a.css', DEFAULT_THEME);
  assert.deepEqual(samples.map((s) => [s.property, s.px ?? s.raw, s.line]), [['padding', 10, 2], ['color', '#333333', 3], ['margin', 0, 5]]);
});

test('parseCssDeclarations ignores selectors and comments', () => {
  assert.deepEqual(parseCssDeclarations('/* a: b; */ a:hover { font-size: 12px; }'), [{ property: 'fontSize', value: '12px', line: 1 }]);
});
