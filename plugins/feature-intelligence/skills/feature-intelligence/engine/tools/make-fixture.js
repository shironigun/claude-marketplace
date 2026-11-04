'use strict';
// Writes frd.docx and frd.pdf from frd.md in the CSV importer fixture (spec 10.1), so the three formats carry the
// same text. Section numbers are typed into the headings, so Word and Markdown anchor the same way.
// Usage: node make-fixture.js            write both files
//        node make-fixture.js --check    exit 1 when a committed file no longer matches frd.md
const fs = require('fs');
const path = require('path');
const { markdownBlocks } = require('../lib/blocks');
const { writeDocx, readDocxBlocks } = require('../lib/docx');
const { writeSimplePdf } = require('../lib/pdf');

const DIR = path.resolve(__dirname, '..', '..', 'examples', 'csv-importer');
const LINES_PER_PAGE = 46;
const WIDTH = 90;

function wrap(text) {
  const lines = [];
  let line = '';
  for (const word of text.split(/\s+/).filter(Boolean)) {
    if (line && line.length + 1 + word.length > WIDTH) {
      lines.push(line);
      line = word;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

// Printed lines for each block: a table prints its header once; a blank line separates blocks except inside a
// list or a table; a heading never sits in the last three lines of a page.
function pdfPages(blocks) {
  const pages = [[]];
  const page = () => pages[pages.length - 1];
  const put = (line) => {
    if (page().length === LINES_PER_PAGE) pages.push([]);
    if (line || page().length) page().push(line);
  };
  blocks.forEach((b, i) => {
    const prev = blocks[i - 1];
    const run = prev && prev.kind === b.kind && (b.kind === 'item' || (b.kind === 'row' && prev.header === b.header));
    if (prev && !run) put('');
    if (b.kind === 'heading' && LINES_PER_PAGE - page().length < 4) pages.push([]);
    if (b.kind === 'row' && !run && b.header) wrap(b.header.join(' | ')).forEach(put);
    const text = b.kind === 'row' ? b.cells.join(' | ') : b.kind === 'item' ? `- ${b.text}` : b.text;
    wrap(text).forEach(put);
  });
  return pages;
}

function build() {
  const blocks = markdownBlocks(fs.readFileSync(path.join(DIR, 'frd.md'), 'utf8'));
  return { blocks, docx: writeDocx(blocks), pdf: writeSimplePdf(pdfPages(blocks)) };
}

// Word files are compared by their blocks, not their bytes: compression output can differ between zlib builds.
function check() {
  const { blocks, pdf } = build();
  const problems = [];
  const docx = path.join(DIR, 'frd.docx');
  const pdfFile = path.join(DIR, 'frd.pdf');
  if (!fs.existsSync(docx) || JSON.stringify(readDocxBlocks(fs.readFileSync(docx))) !== JSON.stringify(blocks)) {
    problems.push('frd.docx does not match frd.md');
  }
  if (!fs.existsSync(pdfFile) || !fs.readFileSync(pdfFile).equals(pdf)) problems.push('frd.pdf does not match frd.md');
  return problems;
}

if (require.main === module) {
  if (process.argv.includes('--check')) {
    const problems = check();
    for (const p of problems) console.error(`${p}; run node make-fixture.js`);
    process.exit(problems.length ? 1 : 0);
  }
  const { docx, pdf } = build();
  fs.writeFileSync(path.join(DIR, 'frd.docx'), docx);
  fs.writeFileSync(path.join(DIR, 'frd.pdf'), pdf);
  console.log(`wrote frd.docx and frd.pdf (${pdfPages(build().blocks).length} pages)`);
}

module.exports = { DIR, pdfPages, build, check };
