const strArr = { type: 'array', items: { type: 'string' } } as const;

export const configSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://github.com/shironigun/ai-marketplace/plugins/design-studio/schemas/config.schema.json',
  title: 'design-studio product config',
  type: 'object',
  additionalProperties: false,
  required: ['product', 'appRoot', 'adapter', 'sources', 'libraryHome', 'modules'],
  properties: {
    $schema: { type: 'string' },
    product: { type: 'string', minLength: 1 },
    appRoot: { type: 'string', minLength: 1 },
    adapter: { enum: ['react-mui'] },
    sources: { type: 'array', items: { type: 'string' }, minItems: 1 },
    exclude: strArr,
    legacy: strArr,
    libraryHome: { type: 'string', minLength: 1 },
    themeEntry: { type: ['string', 'null'] },
    providersEntry: { type: ['string', 'null'] },
    locales: strArr,
    density: { type: 'object', additionalProperties: false, properties: { default: { enum: ['compact', 'comfortable'] } } },
    enforcement: { enum: ['advisory', 'ratchet'] },
    protectedPaths: strArr,
    modules: {
      type: 'object',
      additionalProperties: false,
      required: ['roots', 'shared'],
      properties: { roots: strArr, shared: strArr },
    },
    storybook: {
      type: 'object',
      additionalProperties: false,
      properties: {
        port: { type: 'integer', minimum: 1, maximum: 65535 },
        enableManifests: { type: 'boolean' },
        enableMcp: { type: 'boolean' },
      },
    },
  },
} as const;
