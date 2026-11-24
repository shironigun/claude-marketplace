'use strict';
const fs = require('fs');
const { usageError } = require('../errors');
const { repoInfo, checkHome, workspaceKey, subjectPaths, filmPaths, checkSlug } = require('../paths');
const {
  readState, writeState, checkPhase, phaseLabel, checkDecision, decisionKey, setDecision, SUBJECT_PHASES, FILM_PHASES,
} = require('../state');

// Each entry is one line of state.md, so a value may not hold a line break.
function oneLine(flag, value) {
  if (/[\r\n]/.test(value)) throw usageError(`--${flag} must be one line`);
  return value.trim();
}

module.exports = {
  name: 'state',
  usage: 'state <subject slug> [--film <film slug>] [--phase <id>] [--decision <text>] [--pending <text>] [--done <text>] [--repo <dir>]',
  summary: "Record progress in a subject's Working State, or a film's with --film: the phase, a decision, a pending item, or an item done.",
  flags: { film: 'string', phase: 'string', decision: 'string', pending: 'string', done: 'string', repo: 'string' },
  run(ctx, args) {
    const slug = checkSlug(args._[0]);
    const f = args.flags;
    if (!f.phase && !f.decision && !f.pending && !f.done) {
      throw usageError('nothing to record: give --phase, --decision, --pending or --done');
    }
    const repo = repoInfo(f.repo || ctx.cwd);
    checkHome(ctx.home, repo);
    const key = workspaceKey(ctx.home, repo);
    const subj = subjectPaths(ctx.home, key, slug);
    if (!fs.existsSync(subj.state)) throw usageError(`no subject "${slug}" for ${key}; run sp init first`);
    const fp = f.film ? filmPaths(ctx.home, key, slug, f.film) : null;
    if (fp && !fs.existsSync(fp.state)) throw usageError(`no film "${f.film}" of ${slug}; run sp film first`);
    const file = fp ? fp.state : subj.state;
    const s = readState(file);
    if (f.phase) s.phase = checkPhase(f.phase, fp ? FILM_PHASES : SUBJECT_PHASES);
    if (f.decision) {
      const text = checkDecision(oneLine('decision', f.decision));
      // A keyed decision belongs to the subject, where its films read it (spec 5.7).
      if (fp && decisionKey(text)) {
        throw usageError(`${decisionKey(text)} is a decision of the subject: sp state ${slug} --decision "${text}"`);
      }
      s.decisions = setDecision(s.decisions, text);
    }
    if (f.pending) {
      const item = oneLine('pending', f.pending);
      if (!s.pending.includes(item)) s.pending.push(item);
    }
    if (f.done) {
      const item = oneLine('done', f.done);
      if (!s.pending.includes(item)) throw usageError(`"${item}" is not pending`);
      s.pending = s.pending.filter((p) => p !== item);
    }
    s.updated = ctx.now;
    writeState(file, s);
    return {
      json: s,
      text: `${fp ? `${slug}/${f.film}` : slug}: phase ${phaseLabel(s.phase)}, ${s.decisions.length} decisions, ${s.pending.length} pending`,
    };
  },
};
