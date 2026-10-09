import AjvModule from 'ajv/dist/2020.js';

type ValidateFn = ((data: unknown) => boolean) & { errors?: Array<{ instancePath: string; message?: string }> | null };
type AjvInstance = { compile: (schema: object) => ValidateFn };
type AjvCtor = new (opts: Record<string, unknown>) => AjvInstance;

const Ajv2020 = ((AjvModule as unknown as { default?: AjvCtor }).default ?? (AjvModule as unknown as AjvCtor));
const ajv = new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true });
const cache = new WeakMap<object, ValidateFn>();

export function makeValidator(schema: object): (data: unknown) => string[] {
  let fn = cache.get(schema);
  if (!fn) { fn = ajv.compile(schema); cache.set(schema, fn); }
  const validate = fn;
  return (data) => (validate(data) ? [] : (validate.errors ?? []).map((e) => `${e.instancePath || '(root)'} ${e.message ?? 'is invalid'}`));
}
