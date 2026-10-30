#!/usr/bin/env node
// Writes a test copy of a built page wrapped in the same head the Artifact tool adds when it publishes
// (charset + viewport meta), so a phone-width check in the browser matches the published page.
//   node phone-copy.js <built.html> <test-copy.html>
// Without the viewport meta the browser lays the page out at desktop width, and phone checks lie.
// Delete the copy after testing; never publish it.
'use strict';
const fs = require('fs');
const [, , src, out] = process.argv;
if (!src || !out) { console.error('usage: node phone-copy.js <built.html> <test-copy.html>'); process.exit(2); }
const head = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">' +
  '<style>:root{color-scheme:light;box-sizing:border-box}body{margin:0;padding:0;font:14px -apple-system,BlinkMacSystemFont,sans-serif}img{max-width:100%}[hidden]{display:none!important}</style></head><body>\n';
fs.writeFileSync(out, head + fs.readFileSync(src, 'utf8') + '\n</body></html>', 'utf8');
console.log('wrote', out);
