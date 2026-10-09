import { configSchema } from './config.ts';
import { registrySchema } from './registry.ts';

export const SCHEMAS: Record<string, object> = { config: configSchema, registry: registrySchema };
