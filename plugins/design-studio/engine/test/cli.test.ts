import { test } from 'node:test';
import assert from 'node:assert/strict';
import { main, parseArgs } from '../src/cli.ts';

function capture() {
  const out: string[] = [];
  const err: string[] = [];
  return { out, err, io: { out: (s: string) => { out.push(s); }, err: (s: string) => { err.push(s); } } };
}

test('--version prints the engine version', async () => {
  const c = capture();
  assert.equal(await main(['--version'], c.io), 0);
  assert.deepEqual(c.out, ['0.1.0']);
});

test('no command prints usage and exits 2', async () => {
  const c = capture();
  assert.equal(await main([], c.io), 2);
  assert.match(c.out[0], /Usage:/);
});

test('an unknown command exits 2 with a message', async () => {
  const c = capture();
  assert.equal(await main(['nope'], c.io), 2);
  assert.equal(c.err[0], 'Unknown command: nope');
});

test('names inherited from Object.prototype are unknown commands', async () => {
  for (const name of ['constructor', 'toString', '__proto__', 'hasOwnProperty']) {
    const c = capture();
    assert.equal(await main([name], c.io), 2, name);
    assert.equal(c.err[0], `Unknown command: ${name}`);
  }
});

test('parseArgs reads values and boolean flags', () => {
  assert.deepEqual(parseArgs(['--app', 'x', '--no-git', '--out', 'y']), { app: 'x', 'no-git': true, out: 'y' });
  assert.throws(() => parseArgs(['stray']), /Unexpected argument: stray/);
});
