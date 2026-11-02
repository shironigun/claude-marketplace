'use strict';

const ID_RE = /^([A-Z]+)-(\d+)$/;

function parseId(id) {
  const m = ID_RE.exec(String(id));
  return m ? { prefix: m[1], num: Number(m[2]) } : null;
}

function formatId(prefix, num) {
  return `${prefix}-${String(num).padStart(3, '0')}`;
}

// The next free id for a prefix, one above the highest in use.
function nextId(prefix, existingIds) {
  let max = 0;
  for (const id of existingIds) {
    const p = parseId(id);
    if (p && p.prefix === prefix && p.num > max) max = p.num;
  }
  return formatId(prefix, max + 1);
}

// Natural order: by prefix, then by number, so RULE-002 sorts before RULE-010.
function compareIds(a, b) {
  const pa = parseId(a);
  const pb = parseId(b);
  if (pa && pb) {
    if (pa.prefix !== pb.prefix) return pa.prefix < pb.prefix ? -1 : 1;
    return pa.num - pb.num;
  }
  const sa = String(a);
  const sb = String(b);
  return sa < sb ? -1 : sa > sb ? 1 : 0;
}

module.exports = { parseId, formatId, nextId, compareIds };
