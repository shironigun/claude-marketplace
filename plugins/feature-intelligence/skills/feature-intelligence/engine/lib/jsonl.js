'use strict';
const fs = require('fs');
const path = require('path');
const { readText } = require('./text');
const { checkError } = require('./errors');

// Writes through a temp file and a rename, so a crash never leaves half a file.
function writeFileAtomic(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, content);
  fs.renameSync(tmp, file);
}

function readJsonl(file) {
  if (!fs.existsSync(file)) return [];
  return readText(fs.readFileSync(file))
    .split('\n')
    .map((line, i) => [line, i])
    .filter(([line]) => line.trim())
    .map(([line, i]) => {
      let row;
      try {
        row = JSON.parse(line);
      } catch (e) {
        throw checkError(`${file}:${i + 1}: invalid JSON (${e.message})`);
      }
      if (row === null || typeof row !== 'object' || Array.isArray(row)) {
        throw checkError(`${file}:${i + 1}: expected a JSON object`);
      }
      return row;
    });
}

function writeJsonl(file, rows) {
  writeFileAtomic(file, rows.map((r) => JSON.stringify(r)).join('\n') + (rows.length ? '\n' : ''));
}

function readJson(file, fallback) {
  if (!fs.existsSync(file)) return fallback;
  const text = readText(fs.readFileSync(file));
  try {
    return JSON.parse(text);
  } catch (e) {
    throw checkError(`${file}: invalid JSON (${e.message})`);
  }
}

function writeJson(file, value) {
  writeFileAtomic(file, `${JSON.stringify(value, null, 2)}\n`);
}

module.exports = { writeFileAtomic, readJsonl, writeJsonl, readJson, writeJson };
