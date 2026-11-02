'use strict';
const { htmlBlocks } = require('./html');
const { rowText } = require('./blocks');

// Rich-text fields that carry requirements, and the anchor label each one gets.
const FIELDS = [
  ['System.Description', 'description'],
  ['Microsoft.VSTS.Common.AcceptanceCriteria', 'AC'],
  ['Microsoft.VSTS.TCM.ReproSteps', 'repro'],
];

// The texts of an HTML field: one per paragraph, list item or table row; headings are labels and are skipped.
const fieldTexts = (html) => htmlBlocks(html || '')
  .filter((b) => b.kind !== 'heading')
  .map((b) => (b.kind === 'row' ? rowText(b) : b.text))
  .filter(Boolean);

function adoChunks(entry) {
  const item = entry && entry.workItem ? entry.workItem : entry;
  if (!item || !Number.isInteger(item.id) || !item.fields) throw new Error('an ADO entry needs a work item with an id and fields');
  const listed = entry.comments && !Array.isArray(entry.comments) ? entry.comments.comments : entry.comments;
  const chunks = [];
  for (const [field, label] of FIELDS) {
    const texts = fieldTexts(item.fields[field]);
    texts.forEach((text, i) => {
      const anchor = label === 'AC' ? `AC-${i + 1}` : texts.length === 1 ? label : `${label} ¶${i + 1}`;
      chunks.push({ anchor, text });
    });
  }
  const comments = [...(Array.isArray(listed) ? listed : [])]
    .sort((a, b) => String(a.createdDate || '').localeCompare(String(b.createdDate || '')));
  comments.forEach((c, i) => {
    const text = fieldTexts(c.text).join(' ');
    if (text) chunks.push({ anchor: `comment ${i + 1}`, text });
  });
  return {
    origin: { workItem: item.id, rev: item.rev ?? null, type: item.fields['System.WorkItemType'] || null },
    title: item.fields['System.Title'] || `Work item ${item.id}`,
    chunks,
  };
}

module.exports = { adoChunks };
