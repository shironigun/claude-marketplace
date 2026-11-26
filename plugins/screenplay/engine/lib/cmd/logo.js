'use strict';
const fs = require('fs');
const path = require('path');
const { usageError, checkError } = require('../errors');
const { readJson, writeJson, writeFileAtomic } = require('../files');
const { repoInfo, checkHome, repoPaths, workspaceKey } = require('../paths');
const { check } = require('../schema');
const { LOGO_VARIANTS, LOGO_TYPES, logoProblems } = require('../logos');

module.exports = {
  name: 'logo',
  usage: 'logo <brand id> <variant> <file> [--repo <dir>]',
  summary: "Add a logo the repository does not hold (spec 5.3, D23): copies the user's file into the brand profile as that brand's logo, which the user then confirms again.",
  flags: { repo: 'string' },
  run(ctx, args) {
    const repo = repoInfo(args.flags.repo || ctx.cwd);
    checkHome(ctx.home, repo);
    const rp = repoPaths(ctx.home, workspaceKey(ctx.home, repo));
    const [id, variant, file] = args._;
    if (!id || !variant || !file) throw usageError('usage: sp logo <brand id> <variant> <file>');
    const profile = readJson(rp.brands, null);
    if (!profile) throw usageError('save the brand profile first (sp save brands)');
    const brand = profile.brands.find((b) => b.id === id);
    if (!brand) throw usageError(`no brand "${id}" in the profile; it has ${profile.brands.map((b) => b.id).join(', ')}`);
    if (!LOGO_VARIANTS.includes(variant)) throw usageError(`a logo variant is one of ${LOGO_VARIANTS.join(', ')}`);
    const source = path.resolve(ctx.cwd, file);
    if (!fs.existsSync(source) || !fs.statSync(source).isFile()) throw usageError(`no file ${file}`);
    const format = path.extname(source).slice(1).toLowerCase().replace(/^jpeg$/, 'jpg');
    if (!Object.hasOwn(LOGO_TYPES, format)) throw checkError(`${file}: a logo is a ${Object.keys(LOGO_TYPES).join(', ')} file`);
    const data = fs.readFileSync(source);
    const problems = logoProblems(data.length, format, file, format === 'svg' ? data.toString('utf8') : null);
    if (problems.length) throw checkError(problems.join('\n'));
    // The file goes in the profile, outside the app's repository (spec P2), and the profile names it as the user's.
    const name = `logos/${id}-${variant}.${format}`;
    brand.logos[variant] = { file: name, format };
    delete brand.evidence[`logos.${variant}`];
    const errors = check('brands', profile);
    if (errors.length) throw checkError(`the brand profile would have ${errors.length} problem${errors.length === 1 ? '' : 's'}:\n  ${errors.join('\n  ')}`);
    writeFileAtomic(path.join(rp.profile, name), data);
    writeJson(rp.brands, profile);
    // A changed profile is not confirmed yet (spec 5.3).
    const claim = readJson(rp.repository, {});
    if (Object.hasOwn(claim, 'brandsConfirmedAt')) {
      delete claim.brandsConfirmedAt;
      writeJson(rp.repository, claim);
    }
    return {
      json: { brand: id, variant, logo: brand.logos[variant], saved: path.join(rp.profile, name) },
      text: `Saved ${file} as ${brand.name}'s ${variant} logo, ${name} in the profile; show the brand board and confirm it again`,
    };
  },
};
