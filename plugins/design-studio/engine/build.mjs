import { build } from 'esbuild';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const result = await build({
  entryPoints: ['src/cli.ts'],
  outfile: 'dist/cli.mjs',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  legalComments: 'none',
  metafile: true,
  banner: { js: "import { createRequire as __dsCreateRequire } from 'node:module'; const require = __dsCreateRequire(import.meta.url);" },
  logLevel: 'info',
});

// The bundle strips legal comments, so the licence of every package it carries is shipped beside it instead.
// The packages come from esbuild's metafile; the output is sorted and uses LF, so the same lockfile gives the same bytes.
const NODE_MODULES = 'node_modules/';
const packageDirs = new Set();
for (const input of Object.keys(result.metafile.inputs)) {
  const path = input.replace(/\\/g, '/');
  const at = path.lastIndexOf(NODE_MODULES);
  if (at < 0) continue;
  const [first, second] = path.slice(at + NODE_MODULES.length).split('/');
  packageDirs.add(path.slice(0, at + NODE_MODULES.length) + (first.startsWith('@') ? `${first}/${second}` : first));
}
const readNormalised = (file) => readFileSync(file, 'utf8').replace(/^﻿/, '').replace(/\r\n?/g, '\n').replace(/[ \t]+$/gm, '').trimEnd();
const licenceOf = (pkg) => {
  if (typeof pkg.license === 'string') return pkg.license;
  if (pkg.license && typeof pkg.license.type === 'string') return pkg.license.type;
  if (Array.isArray(pkg.licenses)) return pkg.licenses.map((l) => l.type).join(' OR ');
  return 'UNKNOWN';
};
const byText = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const packages = [...packageDirs]
  .map((dir) => {
    const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
    const file = readdirSync(dir).filter((f) => /^(licen[cs]e|copying)(\.|$)/i.test(f)).sort(byText)[0];
    return { name: pkg.name, version: pkg.version, licence: licenceOf(pkg), text: file ? readNormalised(join(dir, file)) : null };
  })
  .sort((a, b) => byText(a.name, b.name) || byText(a.version, b.version));

const rule = '='.repeat(80);
const lines = [
  'Third-party notices for dist/cli.mjs',
  '',
  'dist/cli.mjs is a bundle that includes the packages below. Each one\'s licence notice is reproduced in full.',
  '',
  ...packages.map((p) => `${p.name} ${p.version} — ${p.licence}`),
];
for (const p of packages) {
  lines.push('', rule, `${p.name} ${p.version} (${p.licence})`, rule, '', p.text ?? `The package ships no licence file; its package.json declares ${p.licence}.`);
}
writeFileSync('dist/THIRD_PARTY_NOTICES.txt', lines.join('\n') + '\n', 'utf8');
console.log(`wrote dist/THIRD_PARTY_NOTICES.txt (${packages.length} packages)`);
