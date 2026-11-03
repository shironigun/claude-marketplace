'use strict';
const { loadWorkspace, withLock } = require('../workspace');
const { ingestFile, ingestAdo, ingestRepo } = require('../ingest');
const { numberFlag } = require('../args');
const { usageError } = require('../errors');

module.exports = {
  name: 'ingest',
  usage: 'ingest <slug> <file> | --ado <json> | --paste <file> [--by <name>] | --repo <dir> [--commit <sha>]',
  summary: 'Register a source and cache its chunks: Markdown, text, HTML, Word, PDF (--pages), image, ADO items, pasted text, a repository',
  flags: { ado: 'string', paste: 'string', repo: 'string', pages: 'string', by: 'string', title: 'string', commit: 'string' },
  run(ctx, args) {
    const [slug, file] = args._;
    const { paths } = loadWorkspace(ctx.root, slug);
    const f = args.flags;
    if ([file, f.ado, f.paste, f.repo].filter(Boolean).length !== 1) {
      throw usageError('give one of <file>, --ado <json>, --paste <file> or --repo <dir>');
    }
    const opts = {
      root: ctx.root, now: ctx.now, by: f.by, title: f.title, commit: f.commit,
      pages: numberFlag(f, 'pages', { min: 1, max: 100000, integer: true }),
    };
    const results = withLock(paths, () => {
      if (f.ado) return ingestAdo(paths, f.ado, opts);
      if (f.repo) return [ingestRepo(paths, f.repo, opts)];
      return [ingestFile(paths, f.paste || file, { ...opts, paste: Boolean(f.paste) })];
    });
    const lines = results.map(({ source: s, skipped }) => (skipped
      ? `Skipped ${s.id} ${s.title}: already registered and unchanged`
      : `Registered ${s.id} ${s.title}: ${s.status === 'ok' ? `${s.format}, ${s.chunks.length} chunks` : `unreadable (${s.error})`}${s.origin && s.origin.dirty ? '; the working tree has uncommitted changes, so read code with git show <commit>:<path> to match the anchors' : ''}`));
    const unreadable = results.some((r) => !r.skipped && r.source.status === 'unreadable');
    lines.push(unreadable
      ? 'Fix or replace the unreadable file, then ingest it again.'
      : `Next: extract claims from the new chunks, then fi claims add ${slug} <file>`);
    return {
      text: lines.join('\n'),
      json: {
        sources: results.map(({ source: s, skipped }) => ({
          id: s.id, kind: s.kind, title: s.title, status: s.status, chunkCount: s.chunks.length, skipped,
          ...(s.error ? { error: s.error } : {}), ...(s.origin && s.origin.dirty ? { dirty: true } : {}),
        })),
      },
      exitCode: unreadable ? 1 : 0,
    };
  },
};
