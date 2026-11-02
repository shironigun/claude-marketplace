'use strict';
const path = require('path');
const { usageError } = require('./errors');

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function checkSlug(slug) {
  if (!slug) throw usageError('missing <slug>');
  if (!SLUG_RE.test(slug) || slug.length > 64) {
    throw usageError(`bad slug "${slug}": use lowercase letters, digits and single hyphens`);
  }
  return slug;
}

// The footprint in the user's repository (spec 4.2): knowledge-base/ is committed; .feature-intelligence/ is not.
function workspacePaths(root, slug) {
  checkSlug(slug);
  const ws = path.join(root, 'knowledge-base', 'features', slug);
  const local = path.join(root, '.feature-intelligence');
  const cache = path.join(local, 'cache', slug);
  return {
    root, slug, ws, local, cache,
    manifest: path.join(ws, 'workspace.json'),
    sources: path.join(ws, 'sources.json'),
    nodes: path.join(ws, 'model', 'nodes.jsonl'),
    links: path.join(ws, 'model', 'links.jsonl'),
    decisions: path.join(ws, 'decisions.jsonl'),
    tickets: path.join(ws, 'tickets.json'),
    profile: path.join(local, 'profile.json'),
    chunks: path.join(cache, 'chunks'),
    claims: path.join(cache, 'claims'),
    proposals: path.join(cache, 'proposals.json'),
    consolidated: path.join(cache, 'consolidated.json'),
    lock: path.join(cache, '.lock'),
    gitignore: path.join(root, '.gitignore'),
  };
}

const relPath = (root, file) => path.relative(root, file).split(path.sep).join('/');

module.exports = { SLUG_RE, checkSlug, workspacePaths, relPath };
