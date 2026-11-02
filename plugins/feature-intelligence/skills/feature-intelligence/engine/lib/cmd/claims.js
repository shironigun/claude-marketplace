'use strict';
const fs = require('fs');
const path = require('path');
const { loadWorkspace, withLock } = require('../workspace');
const { readClaimsFile, addClaims } = require('../claims');
const { FiError, usageError } = require('../errors');

module.exports = {
  name: 'claims',
  usage: 'claims add <slug> <file>',
  summary: 'Check extracted claims against their chunks (anchor and quote) and store them as a batch',
  flags: {},
  run(ctx, args) {
    const [sub, slug, file] = args._;
    if (sub !== 'add' || !file) throw usageError('usage: fi claims add <slug> <file>');
    const { paths } = loadWorkspace(ctx.root, slug);
    const abs = path.resolve(ctx.root, file);
    if (!fs.existsSync(abs)) throw usageError(`no such file: ${file}`);
    let input;
    try {
      input = readClaimsFile(abs);
    } catch (e) {
      if (e instanceof FiError) throw e;
      throw usageError(`${file}: ${e.message}`);
    }
    if (!Array.isArray(input) || !input.length) throw usageError(`${file} holds no claims`);
    const r = withLock(paths, () => addClaims(paths, input));
    if (r.errors.length) {
      return {
        text: `Rejected ${file}; nothing was stored:\n${r.errors.map((e) => `  ${e}`).join('\n')}`,
        json: { added: 0, errors: r.errors },
        exitCode: 1,
      };
    }
    const first = r.added[0].id;
    const last = r.added[r.added.length - 1].id;
    const unverified = r.added.filter((c) => !c.quoteVerified).length;
    const chunks = new Set(r.added.map((c) => c.chunk)).size;
    return {
      text: `Added ${r.added.length} claims (${first}..${last}) from ${chunks} chunks as ${r.batch}`
        + `${unverified ? `; ${unverified} quotes could not be checked (PDF page, image or code)` : ''}`,
      json: { added: r.added.length, first, last, batch: r.batch, unverified, errors: [] },
    };
  },
};
