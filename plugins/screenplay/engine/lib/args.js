'use strict';
const fs = require('fs');
const path = require('path');
const { readText } = require('./text');
const { usageError } = require('./errors');

const GLOBAL_FLAGS = { json: 'boolean', home: 'string' };

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

// An input file the caller names, as text. Missing or a folder: the command was used wrongly (exit 2).
function readTextFile(cwd, file) {
  if (!file) throw usageError('missing <file>');
  const abs = path.resolve(cwd, file);
  if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) throw usageError(`no such file: ${file}`);
  return readText(fs.readFileSync(abs));
}

// An input file the caller names, as JSON. Not valid JSON is a usage error too.
function readJsonFile(cwd, file) {
  const text = readTextFile(cwd, file);
  try {
    return JSON.parse(text);
  } catch (e) {
    throw usageError(`${file} is not valid JSON: ${e.message}`);
  }
}

module.exports = { parseArgs, readTextFile, readJsonFile };
