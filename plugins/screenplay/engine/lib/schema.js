'use strict';
const fs = require('fs');
const path = require('path');
const { readText } = require('./text');
const { checkError } = require('./errors');

const SCHEMA_DIR = path.join(__dirname, '..', 'schemas');
const SCHEMA_KINDS = ['stack', 'brands', 'theme', 'screens', 'api-calls', 'truth', 'mods', 'beats', 'demo-data', 'screen', 'review'];
// The JSON Schema subset this validator understands. A schema using anything else fails its test, so no check
// can silently not happen.
const KEYWORDS = new Set(['$schema', '$id', 'title', 'description', '$defs', '$ref', 'type', 'required', 'properties',
  'additionalProperties', 'enum', 'const', 'pattern', 'minLength', 'maxLength', 'minimum', 'maximum', 'items',
  'minItems', 'maxItems']);

const typeOf = (v) => (v === null ? 'null' : Array.isArray(v) ? 'array' : Number.isInteger(v) ? 'integer' : typeof v);
const isType = (v, t) => t === typeOf(v) || (t === 'number' && typeof v === 'number');
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

function unsupportedKeywords(schema, at = '#') {
  if (schema === null || typeof schema !== 'object' || Array.isArray(schema)) return [];
  const out = [];
  for (const [k, v] of Object.entries(schema)) {
    if (!KEYWORDS.has(k)) out.push(`${at}: unsupported keyword "${k}"`);
    if (k === 'properties' || k === '$defs') {
      for (const [name, sub] of Object.entries(v)) out.push(...unsupportedKeywords(sub, `${at}/${k}/${name}`));
    } else if (k === 'items' || k === 'additionalProperties') {
      out.push(...unsupportedKeywords(v, `${at}/${k}`));
    }
  }
  return out;
}

function validate(schema, value, root = schema, at = '') {
  const here = at || '/';
  if (schema.$ref) {
    const m = /^#\/\$defs\/([\w-]+)$/.exec(schema.$ref);
    const target = m && root.$defs && Object.hasOwn(root.$defs, m[1]) && root.$defs[m[1]];
    return target ? validate(target, value, root, at) : [`${here}: unknown $ref ${schema.$ref}`];
  }
  if (schema.type !== undefined) {
    const types = [].concat(schema.type);
    if (!types.some((t) => isType(value, t))) return [`${here}: must be ${types.join(' or ')}`];
  }
  const errors = [];
  if (schema.const !== undefined && !same(value, schema.const)) errors.push(`${here}: must be ${JSON.stringify(schema.const)}`);
  if (schema.enum && !schema.enum.some((e) => same(e, value))) {
    errors.push(`${here}: must be one of ${schema.enum.map((e) => JSON.stringify(e)).join(', ')}`);
  }
  if (typeof value === 'string') {
    if (schema.minLength !== undefined && value.length < schema.minLength) errors.push(`${here}: is too short (minimum ${schema.minLength})`);
    if (schema.maxLength !== undefined && value.length > schema.maxLength) errors.push(`${here}: is too long (maximum ${schema.maxLength})`);
    if (schema.pattern && !new RegExp(schema.pattern, 'u').test(value)) errors.push(`${here}: must match ${schema.pattern}`);
  }
  if (typeof value === 'number') {
    if (schema.minimum !== undefined && value < schema.minimum) errors.push(`${here}: must be at least ${schema.minimum}`);
    if (schema.maximum !== undefined && value > schema.maximum) errors.push(`${here}: must be at most ${schema.maximum}`);
  }
  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) errors.push(`${here}: needs at least ${plural(schema.minItems, 'item')}`);
    if (schema.maxItems !== undefined && value.length > schema.maxItems) errors.push(`${here}: allows at most ${plural(schema.maxItems, 'item')}`);
    if (schema.items) value.forEach((v, i) => errors.push(...validate(schema.items, v, root, `${at}/${i}`)));
  }
  if (typeOf(value) === 'object') {
    for (const k of schema.required || []) if (!Object.hasOwn(value, k)) errors.push(`${here}: missing "${k}"`);
    const props = schema.properties || {};
    for (const [k, v] of Object.entries(value)) {
      if (Object.hasOwn(props, k)) errors.push(...validate(props[k], v, root, `${at}/${k}`));
      else if (schema.additionalProperties === false) errors.push(`${here}: unknown field "${k}"`);
      else if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
        errors.push(...validate(schema.additionalProperties, v, root, `${at}/${k}`));
      }
    }
  }
  return errors;
}

function loadSchema(kind) {
  if (!SCHEMA_KINDS.includes(kind)) throw checkError(`no schema for "${kind}"`);
  return JSON.parse(readText(fs.readFileSync(path.join(SCHEMA_DIR, `${kind}.schema.json`))));
}

// A brand's values, as the dotted paths its evidence is keyed by (spec 5.3): one per logo variant, not per field, but
// none for a logo the user supplied, which the repository does not hold.
function brandValues(brand) {
  const under = (prefix, obj) => Object.keys(obj || {}).map((k) => `${prefix}.${k}`);
  const names = brand.names || {};
  return [
    'when',
    ...under('logos', brand.logos).filter((v) => !brand.logos[v.slice('logos.'.length)].file),
    ...under('chrome', brand.chrome),
    ...under('palette', brand.palette),
    ...under('type', brand.type),
    ...(Object.hasOwn(names, 'product') ? ['names.product'] : []),
    ...under('names.modules', names.modules),
  ];
}

// What a schema cannot say: ids are unique within the file; a logo has one source, a place a name, and every brand
// value its evidence; and the ledger's rules (spec 5.3, 5.5). A place may show a logo the repository does not hold:
// `sp confirm brands` waits for the user's file.
function crossChecks(kind, value) {
  const errors = [];
  const unique = (list, at) => {
    const seen = new Set();
    for (const x of list) {
      if (seen.has(x.id)) errors.push(`${at}: duplicate id ${x.id}`);
      seen.add(x.id);
    }
  };
  if (kind === 'brands') {
    unique(value.brands, '/brands');
    value.brands.forEach((b, i) => {
      for (const [k, logo] of Object.entries(b.logos)) {
        if (['path', 'svg', 'file'].filter((s) => Object.hasOwn(logo, s)).length !== 1) {
          errors.push(`/brands/${i}/logos/${k}: a logo has one of path (a file in the repository), svg (drawn in code) or file (the user's)`);
        }
      }
      for (const [place, p] of Object.entries(b.chrome || {})) {
        if (!/^[a-z][a-z0-9-]*$/.test(place)) errors.push(`/brands/${i}/chrome: "${place}" is not a place name (lower-case letters, digits and hyphens)`);
      }
      const values = brandValues(b);
      for (const v of values) if (!Object.hasOwn(b.evidence, v)) errors.push(`/brands/${i}/evidence: missing "${v}"`);
      for (const k of Object.keys(b.evidence)) if (!values.includes(k)) errors.push(`/brands/${i}/evidence: "${k}" names no value`);
    });
  }
  if (kind === 'screens') unique(value.screens, '/screens');
  if (kind === 'beats') {
    unique(value.personas, '/personas');
    unique(value.scenes, '/scenes');
  }
  if (kind === 'api-calls') {
    unique(value.calls, '/calls');
    value.calls.forEach((c, i) => {
      if (c.style === 'graphql' && !c.operation) errors.push(`/calls/${i}: a GraphQL call needs its operation name`);
    });
  }
  if (kind === 'truth') {
    unique(value.entries, '/entries');
    value.entries.forEach((e, i) => {
      const article = e.confidence === 'inferred' ? 'an' : 'a';
      if (e.confidence !== 'open' && !e.evidence.length) errors.push(`/entries/${i}: ${article} ${e.confidence} entry needs evidence`);
      if (e.confidence === 'open' && !e.boundary) errors.push(`/entries/${i}: an open entry names the boundary it stops at`);
    });
  }
  return errors;
}

// Schema errors first; the cross-checks run only on a value of the right shape.
function check(kind, value) {
  const errors = validate(loadSchema(kind), value);
  return errors.length ? errors : crossChecks(kind, value);
}

module.exports = { SCHEMA_DIR, SCHEMA_KINDS, KEYWORDS, validate, unsupportedKeywords, loadSchema, check };
