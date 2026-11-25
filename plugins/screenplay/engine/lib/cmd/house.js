'use strict';
const { usageError, checkError } = require('../errors');
const { writeJson } = require('../files');
const { repoInfo, checkHome, repoPaths, workspaceKey, claimWorkspace } = require('../paths');
const { check } = require('../schema');
const { housePaths, houseStyle, houseRules, houseModProblems, nextId } = require('../house');

// --mods pacing=calm,look=full-bleed: the mods a rule sets.
function parseMods(text) {
  const mods = {};
  for (const pair of text.split(',').map((s) => s.trim()).filter(Boolean)) {
    const [id, value, more] = pair.split('=');
    if (!id || !value || more !== undefined) throw usageError(`--mods takes <mod>=<option> pairs, separated by commas; "${pair}" is not one`);
    mods[id.trim()] = value.trim();
  }
  return mods;
}

const line = (r) => `${r.id} (${r.layer || 'repository'}, ${r.scope}): ${r.text}${r.mods ? ` [sets ${Object.entries(r.mods).map(([k, v]) => `${k} ${v}`).join(', ')}]` : ''}`;

module.exports = {
  name: 'house',
  usage: 'house [add --text "<rule>" --scope <generic|product> [--mods <mod>=<option>,...] | promote <id> | remove <id>] [--repo <dir>]',
  summary: "Read and update house style (spec 10): the rules learned from review rounds, the repository's in its profile and the user's own for every repository, and the mods a new film starts from. A generic rule is promoted to the user's own only when the user agrees; a product rule never leaves its repository.",
  flags: { text: 'string', scope: 'string', mods: 'string', repo: 'string' },
  run(ctx, args) {
    const repo = repoInfo(args.flags.repo || ctx.cwd);
    checkHome(ctx.home, repo);
    const key = workspaceKey(ctx.home, repo);
    const rp = repoPaths(ctx.home, key);
    const p = housePaths(rp);
    const [verb, id] = args._;
    const save = (file, value) => {
      const errors = check('house-style', value);
      if (errors.length) throw checkError(`house style has ${errors.length} problem${errors.length === 1 ? '' : 's'}:\n  ${errors.join('\n  ')}`);
      writeJson(file, value);
    };
    if (!verb) {
      const h = houseStyle(rp);
      return { json: h, text: h.rules.length ? h.rules.map(line).join('\n') : 'No house rules yet.' };
    }
    if (verb === 'add') {
      const { text, scope } = args.flags;
      if (!text) throw usageError('house add needs --text "<rule>"');
      if (!['generic', 'product'].includes(scope)) throw usageError('house add needs --scope generic or --scope product');
      const mods = args.flags.mods ? parseMods(args.flags.mods) : null;
      const problems = houseModProblems(mods);
      if (problems.length) throw checkError(`the rule's mods have ${problems.length} problem${problems.length === 1 ? '' : 's'}:\n  ${problems.join('\n  ')}`);
      const current = { rules: houseRules(p.repository) };
      const rule = { id: nextId(current.rules, 'H'), text, scope, ...(mods ? { mods } : {}) };
      claimWorkspace(ctx.home, repo, key);
      save(p.repository, { rules: [...current.rules, rule] });
      return { json: rule, text: `House rule ${rule.id} saved in the repository's profile: ${text}` };
    }
    if (verb === 'promote') {
      const rule = houseRules(p.repository).find((r) => r.id === id);
      if (!rule) throw usageError(`the repository has no house rule ${id || ''}`.trim());
      if (rule.scope === 'product') throw checkError(`${id} is about this product; a product rule never leaves its repository`);
      const user = { rules: houseRules(p.user) };
      if (user.rules.some((r) => r.text === rule.text)) throw checkError(`the user's house style already has "${rule.text}"`);
      const copy = { ...rule, id: nextId(user.rules, 'U') };
      save(p.user, { rules: [...user.rules, copy] });
      return { json: copy, text: `House rule ${id} promoted to the user's own house style as ${copy.id}` };
    }
    if (verb === 'remove') {
      const file = /^U-/.test(id || '') ? p.user : p.repository;
      const current = { rules: houseRules(file) };
      if (!current.rules.some((r) => r.id === id)) throw usageError(`no house rule ${id || ''}`.trim());
      save(file, { rules: current.rules.filter((r) => r.id !== id) });
      return { json: { removed: id }, text: `House rule ${id} removed` };
    }
    throw usageError('house what? use: house; house add --text "<rule>" --scope <generic|product>; house promote <id>; or house remove <id>');
  },
};
