'use strict';
const fs = require('fs');
const path = require('path');
const { readText } = require('./text');

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
      try {
        return JSON.parse(line);
      } catch (e) {
        throw new Error(`${file}:${i + 1}: invalid JSON (${e.message})`);
      }
    });
}

function writeJsonl(file, rows) {
  writeFileAtomic(file, rows.map((r) => JSON.stringify(r)).join('\n') + (rows.length ? '\n' : ''));
}

function appendJsonl(file, rows) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.appendFileSync(file, rows.map((r) => `${JSON.stringify(r)}\n`).join(''));
}

function readJson(file, fallback) {
  if (!fs.existsSync(file)) return fallback;
  return JSON.parse(readText(fs.readFileSync(file)));
}

function writeJson(file, value) {
  writeFileAtomic(file, `${JSON.stringify(value, null, 2)}\n`);
}

module.exports = { writeFileAtomic, readJsonl, writeJsonl, appendJsonl, readJson, writeJson };
