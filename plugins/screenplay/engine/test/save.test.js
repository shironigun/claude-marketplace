'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { runSp, tempDir, shopRepo, validJson, inputFile } = require('./helpers');

function setup(options) {
  const repo = shopRepo(options);
  const home = tempDir('sp-home-');
  const env = { SCREENPLAY_HOME: home };
  assert.equal(runSp(repo, ['init', 'Orders', '--json'], env).code, 0);
  return { repo, home, env };
}

test('save: a valid result is written to its place in the workspace', () => {
  const { repo, home, env } = setup();
  const brands = inputFile(validJson('brands'), repo);
  const r = runSp(repo, ['save', 'brands', brands, '--json'], env);
  assert.equal(r.code, 0, r.stderr);
  assert.equal(r.json.items, 1);
  const saved = path.join(home, 'shop', 'profile', 'brands.json');
  assert.deepEqual(JSON.parse(fs.readFileSync(saved, 'utf8')), JSON.parse(fs.readFileSync(brands, 'utf8')));
  for (const kind of ['screens', 'api-calls', 'truth']) {
    const s = runSp(repo, ['save', kind, inputFile(validJson(kind), repo), '--subject', 'orders'], env);
    assert.equal(s.code, 0, `${kind}: ${s.stderr}`);
  }
  const status = runSp(repo, ['status', 'orders', '--json'], env);
  assert.equal(status.json.next, 'bootstrap'); // stack.json comes from sp detect, not from save
  assert.equal(status.json.files['truth.json'], true);
  assert.deepEqual(fs.readdirSync(repo).sort(), ['.git', 'src']);
});

test('save: a result that fails a check writes nothing and lists every problem', () => {
  const { repo, home, env } = setup();
  const bad = validJson('brands');
  bad.brands[0].palette.primary = 'blue';
  bad.brands[0].mood = 'calm';
  const r = runSp(repo, ['save', 'brands', inputFile(bad, repo)], env);
  assert.equal(r.code, 1);
  assert.match(r.stderr, /brands has 2 problems/);
  assert.match(r.stderr, /\/brands\/0\/palette\/primary: must match/);
  assert.match(r.stderr, /\/brands\/0: unknown field "mood"/);
  assert.equal(fs.existsSync(path.join(home, 'shop', 'profile', 'brands.json')), false);
});

test('save: a citation the repository does not hold is refused, and nothing is written', () => {
  const { repo, home, env } = setup();
  const truth = validJson('truth');
  truth.entries[0].evidence[0].quote = "router.post('/orders/:id/cancel', cancelOrder);";
  truth.entries[0].evidence.push({ path: 'src/routes/missing.js', line: 1, quote: 'x' });
  const r = runSp(repo, ['save', 'truth', inputFile(truth, repo), '--subject', 'orders'], env);
  assert.equal(r.code, 1);
  assert.match(r.stderr, /truth has 2 problems:\n {2}T-01 evidence 1: src\/routes\/orders\.js:18@[0-9a-f]{7,}: the line does not hold the quote/);
  assert.match(r.stderr, /\n {2}T-01 evidence 2: src\/routes\/missing\.js:1@[0-9a-f]{7,}: no such file/);
  assert.equal(fs.existsSync(path.join(home, 'shop', 'subjects', 'orders', 'map', 'truth.json')), false);
  const brands = validJson('brands');
  brands.brands[0].logos.full.path = 'src/theme/missing.svg';
  const b = runSp(repo, ['save', 'brands', inputFile(brands, repo)], env);
  assert.equal(b.code, 1);
  assert.match(b.stderr, /sample logos\.full: src\/theme\/missing\.svg: no such file/);
});

test('save: in a git repository every truth citation names its commit; in a plain folder it may not', () => {
  const truth = validJson('truth');
  delete truth.entries[0].evidence[0].commit;
  const file = path.join(tempDir(), 'truth.json');
  fs.writeFileSync(file, JSON.stringify(truth));
  const { repo, home, env } = setup();
  const r = runSp(repo, ['save', 'truth', file, '--subject', 'orders'], env);
  assert.equal(r.code, 1);
  assert.match(r.stderr, /truth has 1 problem:\n {2}\/entries\/0\/evidence\/0: missing "commit"/);
  assert.equal(fs.existsSync(path.join(home, 'shop', 'subjects', 'orders', 'map', 'truth.json')), false);
  const plain = setup({ git: false });
  const s = runSp(plain.repo, ['save', 'truth', file, '--subject', 'orders'], plain.env);
  assert.equal(s.code, 0, s.stderr);
});

test('save: the result is written last, so an unreadable state.md leaves nothing saved', () => {
  const { repo, home, env } = setup();
  const subject = path.join(home, 'shop', 'subjects', 'orders');
  fs.writeFileSync(path.join(subject, 'state.md'), 'garbage\n');
  const r = runSp(repo, ['save', 'screens', inputFile(validJson('screens'), repo), '--subject', 'orders'], env);
  assert.equal(r.code, 1);
  assert.match(r.stderr, /state\.md is not a Working State file/);
  assert.equal(fs.existsSync(path.join(subject, 'map', 'screens.json')), false);
});

test('save: misuse is exit 2', () => {
  const { repo, env } = setup();
  const brands = inputFile(validJson('brands'), repo);
  assert.equal(runSp(repo, ['save', 'palette', brands], env).code, 2);
  assert.equal(runSp(repo, ['save', 'truth', inputFile(validJson('truth'), repo)], env).code, 2); // needs --subject
  assert.equal(runSp(repo, ['save', 'truth', inputFile(validJson('truth'), repo), '--subject', 'nope'], env).code, 2);
  assert.equal(runSp(repo, ['save', 'brands', path.join(tempDir(), 'missing.json')], env).code, 2);
});
