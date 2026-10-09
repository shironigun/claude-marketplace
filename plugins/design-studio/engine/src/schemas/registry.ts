import { LEVELS } from '../inventory/levels.ts';
import { FAMILY_KINDS } from '../inventory/families.ts';

const str = { type: 'string' } as const;
const strArr = { type: 'array', items: { type: 'string' } } as const;
const bool = { type: 'boolean' } as const;
const count = { type: 'integer', minimum: 0 } as const;
const ratio = { type: ['number', 'null'], minimum: 0, maximum: 1 } as const;

export const registrySchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://github.com/shironigun/ai-marketplace/plugins/design-studio/schemas/registry.schema.json',
  title: 'design-studio inventory registry',
  type: 'object',
  additionalProperties: false,
  required: ['schemaVersion', 'engine', 'app', 'inputs', 'theme', 'metrics', 'components', 'families', 'modules', 'primitives', 'parseErrors'],
  properties: {
    schemaVersion: { const: 1 },
    engine: str,
    app: { type: 'object', additionalProperties: false, required: ['product', 'appRoot', 'adapter'], properties: { product: str, appRoot: str, adapter: str } },
    inputs: { type: 'object', additionalProperties: false, required: ['files', 'hash'], properties: { files: count, hash: { type: 'string', pattern: '^[0-9a-f]{40}$' } } },
    theme: {
      type: 'object', additionalProperties: false, required: ['spacingUnit', 'radiusUnit', 'source'],
      properties: { spacingUnit: { type: 'number' }, radiusUnit: { type: 'number' }, source: { enum: ['static', 'default'] } },
    },
    metrics: {
      type: 'object', additionalProperties: false, required: ['files', 'components', 'byLevel', 'samples', 'tokenCoverage', 'distinct', 'families'],
      properties: {
        files: count, components: count, samples: count, families: count, tokenCoverage: ratio,
        byLevel: { type: 'object', additionalProperties: false, required: [...LEVELS], properties: Object.fromEntries(LEVELS.map((l) => [l, count])) },
        distinct: { type: 'object', additionalProperties: false, required: ['colors', 'fontSizes', 'radii', 'spacing', 'shadows'], properties: { colors: count, fontSizes: count, radii: count, spacing: count, shadows: count } },
      },
    },
    components: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false,
        required: ['id', 'name', 'file', 'line', 'loc', 'exportNames', 'module', 'shared', 'level', 'levelReason', 'confidence', 'evidence', 'smells', 'layer', 'logic', 'wraps', 'uses', 'importers', 'promotionCandidate', 'families', 'quality', 'signals'],
        properties: {
          id: str, name: str, file: str, line: count, loc: count, exportNames: strArr, module: { type: ['string', 'null'] }, shared: bool,
          level: { enum: [...LEVELS] }, levelReason: str, confidence: { enum: ['high', 'medium', 'low'] }, evidence: { enum: ['CONFIRMED', 'INFERRED'] },
          smells: strArr, layer: { enum: ['core', 'recipe', 'snowflake'] }, logic: { enum: ['presentational', 'smart'] }, wraps: strArr, uses: strArr,
          importers: { type: 'object', additionalProperties: false, required: ['files', 'modules'], properties: { files: count, modules: strArr } },
          promotionCandidate: bool,
          families: strArr,
          quality: { type: 'object', additionalProperties: false, required: ['rawValues', 'themeValues'], properties: { rawValues: count, themeValues: count } },
          signals: {
            type: 'object', additionalProperties: false,
            required: ['data', 'dataHooks', 'slots', 'region', 'primaryActions', 'pageArea', 'domainProps', 'styledTarget'],
            properties: {
              data: bool, dataHooks: strArr, slots: count, region: bool, primaryActions: count, pageArea: bool, domainProps: bool, styledTarget: { type: ['string', 'null'] },
            },
          },
        },
      },
    },
    families: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false, required: ['key', 'kind', 'size', 'members', 'note'],
        properties: {
          key: str, kind: { enum: [...FAMILY_KINDS] }, size: count, note: str,
          members: { type: 'array', minItems: 1, items: { type: 'object', additionalProperties: false, required: ['file', 'line', 'name'], properties: { file: str, line: { type: ['integer', 'null'] }, name: { type: ['string', 'null'] } } } },
        },
      },
    },
    modules: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false,
        required: ['module', 'files', 'loc', 'components', 'samples', 'rawPerKloc', 'tokenDiscipline', 'i18nCoverage', 'testRatio', 'lastCommit'],
        properties: { module: str, files: count, loc: count, components: count, samples: count, rawPerKloc: { type: 'number', minimum: 0 }, tokenDiscipline: ratio, i18nCoverage: ratio, testRatio: { type: 'number', minimum: 0 }, lastCommit: { type: ['string', 'null'] } },
      },
    },
    primitives: {
      type: 'object',
      additionalProperties: { type: 'object', additionalProperties: false, required: ['count', 'props'], properties: { count, props: { type: 'object', additionalProperties: { type: 'object', additionalProperties: count } } } },
    },
    parseErrors: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['file', 'message'], properties: { file: str, message: str } } },
  },
} as const;
