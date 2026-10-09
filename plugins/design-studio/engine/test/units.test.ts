import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_THEME as T, kindOf, toAtoms, type Atom } from '../src/adapters/react-mui/units.ts';
import type { SV } from '../src/parse/literal.ts';

const num = (v: number): SV => ({ k: 'num', v });
const str = (v: string): SV => ({ k: 'str', v });
const pick = (atoms: Atom[]) => atoms.map((a) => [a.cls, a.px, a.raw]);

test('sx spacing numbers are theme units', () => {
  assert.deepEqual(pick(toAtoms('sx', 'p', num(2), T)), [['theme', 16, '2']]);
  assert.deepEqual(pick(toAtoms('sx', 'mt', num(0.6), T)), [['theme', 4.8, '0.6']]);
});

test('style, makeStyles and styled numbers are px', () => {
  for (const ctx of ['style', 'makeStyles', 'styled'] as const) assert.deepEqual(pick(toAtoms(ctx, 'padding', num(5), T)), [['px', 5, '5']]);
});

test('sx borderRadius multiplies by the theme radius unit', () => {
  assert.deepEqual(pick(toAtoms('sx', 'borderRadius', num(2), T)), [['theme', 8, '2']]);
  assert.deepEqual(pick(toAtoms('style', 'borderRadius', num(2), T)), [['px', 2, '2']]);
});

test('sx sizes at or below 1 are percentages', () => {
  assert.deepEqual(pick(toAtoms('sx', 'width', num(0.5), T)), [['pct', null, '0.5']]);
  assert.deepEqual(pick(toAtoms('sx', 'width', num(300), T)), [['px', 300, '300']]);
});

test('strings split into one atom per token', () => {
  assert.deepEqual(pick(toAtoms('sx', 'padding', str('8px 1rem'), T)), [['px', 8, '8px'], ['rem', 16, '1rem']]);
  assert.deepEqual(pick(toAtoms('sx', 'm', str('0 auto'), T)), [['zero', 0, '0'], ['keyword', null, 'auto']]);
});

test('responsive and conditional values keep their flags', () => {
  const resp = toAtoms('sx', 'mt', { k: 'resp', items: [num(1), num(2)] }, T);
  assert.deepEqual(resp.map((a) => [a.px, a.responsive]), [[8, true], [16, true]]);
  assert.equal(toAtoms('sx', 'p', { k: 'cond', items: [num(1)] }, T)[0].conditional, true);
});

test('theme.spacing calls are theme values in any context', () => {
  assert.deepEqual(pick(toAtoms('makeStyles', 'padding', { k: 'spacing', args: [num(1), num(2)] }, T)), [['theme', 8, 'spacing(1)'], ['theme', 16, 'spacing(2)']]);
});

test('template literals keep spacing parts and px statics', () => {
  assert.deepEqual(pick(toAtoms('sx', 'padding', { k: 'tpl', parts: [{ k: 'spacing', args: [num(2)] }], statics: '  4px' }, T)), [['theme', 16, 'spacing(2)'], ['px', 4, '4px']]);
});

test('colours: literals are raw, palette paths in sx are theme references', () => {
  assert.deepEqual(pick(toAtoms('sx', 'color', str('#FFF'), T)), [['raw-color', null, '#ffffff']]);
  assert.deepEqual(pick(toAtoms('sx', 'bgcolor', str('primary.main'), T)), [['theme-ref', null, 'primary.main']]);
  assert.deepEqual(pick(toAtoms('style', 'color', str('rgba(0, 0, 0, .5)'), T)), [['raw-color', null, 'rgba(0,0,0,.5)']]);
  assert.deepEqual(pick(toAtoms('sx', 'color', str('inherit'), T)), [['keyword', null, 'inherit']]);
});

test('type, shadow and calc values', () => {
  assert.deepEqual(pick(toAtoms('sx', 'fontSize', num(11.5), T)), [['px', 11.5, '11.5']]);
  assert.deepEqual(pick(toAtoms('sx', 'fontSize', str('0.75rem'), T)), [['rem', 12, '0.75rem']]);
  assert.deepEqual(pick(toAtoms('sx', 'fontWeight', str('fontWeightBold'), T)), [['theme-ref', null, 'fontWeightBold']]);
  assert.deepEqual(pick(toAtoms('sx', 'boxShadow', num(2), T)), [['theme-ref', null, 'shadows[2]']]);
  assert.deepEqual(pick(toAtoms('sx', 'boxShadow', str('0 1px  2px rgba(0,0,0,.2)'), T)), [['literal', null, '0 1px 2px rgba(0,0,0,.2)']]);
  assert.deepEqual(pick(toAtoms('sx', 'height', str('calc(100vh - 48px)'), T)), [['calc', null, 'calc(100vh - 48px)']]);
});

test('properties that are not style values produce nothing', () => {
  assert.deepEqual(toAtoms('sx', 'display', str('flex'), T), []);
});

test('kindOf classifies style properties', () => {
  assert.equal(kindOf('px'), 'spacing');
  assert.equal(kindOf('borderTopLeftRadius'), 'radius');
  assert.equal(kindOf('bgcolor'), 'color');
  assert.equal(kindOf('display'), 'other');
});

test('divider is a palette token in sx but not in style', () => {
  assert.deepEqual(pick(toAtoms('sx', 'borderColor', str('divider'), T)), [['theme-ref', null, 'divider']]);
  assert.deepEqual(pick(toAtoms('style', 'borderColor', str('divider'), T)), [['unknown', null, 'divider']]);
});

test('only borderRadius is multiplied by the radius unit; corner radii are px', () => {
  assert.deepEqual(pick(toAtoms('sx', 'borderTopLeftRadius', num(2), T)), [['px', 2, '2']]);
  assert.deepEqual(pick(toAtoms('sx', 'borderRadius', num(2), { spacingUnit: 8, radiusUnit: 6, source: 'static' })), [['theme', 12, '2']]);
});
