'use strict';
const fs = require('fs');
const path = require('path');
const { readText } = require('./text');
const { usageError } = require('./errors');

const GLOBAL_FLAGS = { json: 'boolean', root: 'string' };

// Splits argv into positionals and flags. `kinds` maps flag names to 'string' or 'boolean'; others are errors.
function parseArgs(argv, kinds = {}) {
  const known = { ...GLOBAL_FLAGS, ...kinds };
  const out = { _: [], flags: {} };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--') {
      out._.push(...argv.slice(i + 1));
      break;
    }
    if (!a.startsWith('--')) {
      out._.push(a);
      continue;
    }
    const eq = a.indexOf('=');
    const name = eq === -1 ? a.slice(2) : a.slice(2, eq);
    const kind = known[name];
    if (!kind) throw usageError(`unknown flag --${name}`);
    if (kind === 'boolean') {
      if (eq !== -1) throw usageError(`--${name} takes no value`);
      out.flags[name] = true;
    } else if (eq !== -1) {
      out.flags[name] = a.slice(eq + 1);
    } else {
      const value = argv[i + 1];
      if (value === undefined || value.startsWith('--')) throw usageError(`--${name} needs a value`);
      out.flags[name] = value;
      i += 1;
    }
  }
  return out;
}

function numberFlag(flags, name, { min = -Infinity, max = Infinity, integer = false, fallback } = {}) {
  if (flags[name] === undefined) return fallback;
  const n = Number(flags[name]);
  if (!Number.isFinite(n) || n < min || n > max || (integer && !Number.isInteger(n))) {
    throw usageError(`--${name} must be a ${integer ? 'whole number' : 'number'} from ${min} to ${max}`);
  }
  return n;
}

// A comma-separated flag, checked against the allowed values.
function listFlag(flags, name, allowed) {
  if (flags[name] === undefined) return undefined;
  const items = String(flags[name]).split(',').map((s) => s.trim()).filter(Boolean);
  const bad = allowed ? items.filter((i) => !allowed.has(i)) : [];
  if (bad.length) throw usageError(`--${name}: unknown ${bad.join(', ')}`);
  return items;
}

function readJsonFile(root, file) {
  if (!file) throw usageError('missing <file>');
  const abs = path.resolve(root, file);
  if (!fs.existsSync(abs)) throw usageError(`no such file: ${file}`);
  try {
    return JSON.parse(readText(fs.readFileSync(abs)));
  } catch (e) {
    throw usageError(`${file} is not valid JSON: ${e.message}`);
  }
}

module.exports = { parseArgs, numberFlag, listFlag, readJsonFile };
