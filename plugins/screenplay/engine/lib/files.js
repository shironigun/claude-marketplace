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

function readJson(file, fallback) {
  if (!fs.existsSync(file)) return fallback;
  try {
    return JSON.parse(readText(fs.readFileSync(file)));
  } catch (e) {
    throw checkError(`${file}: invalid JSON (${e.message})`);
  }
}

function writeJson(file, value) {
  writeFileAtomic(file, `${JSON.stringify(value, null, 2)}\n`);
}

module.exports = { writeFileAtomic, readJson, writeJson };
