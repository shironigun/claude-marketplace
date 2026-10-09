/**
 * Service registry — the list of API hosts your backend exposes.
 *
 * THIS IS THE FIRST FILE YOU EDIT.
 *
 * One entry per base URL. Most backends start with a single `api` entry; add more
 * when the product is split across hosts (a gateway per bounded context, a separate
 * auth host, a legacy host still in service).
 *
 * Adding a service takes two edits and nothing else:
 *   1. add an entry here
 *   2. add its `envKey` to `.env` (and `.env.example`)
 *
 * Every registered service is then reachable in any spec:
 *
 *     test('...', async ({ api }) => { ... });          // the primary service
 *     test('...', async ({ apis }) => apis.orders.get('orders/1'));
 */

export interface ServiceDefinition {
  /** Env var holding the base URL, e.g. `ORDERS_API_BASE_URL`. */
  envKey: string;
  /** Shown by `npm run verify:setup`. Say what lives behind this host. */
  description: string;
  /** Exactly one service is primary — it backs the `api` fixture. */
  primary?: boolean;
}

export const SERVICES = {
  api: {
    envKey: 'API_BASE_URL',
    description: 'Primary backend API',
    primary: true,
  },

  // Add hosts as your surface grows. The key is what tests type (`apis.orders`).
  //
  // orders: {
  //   envKey: 'ORDERS_API_BASE_URL',
  //   description: 'Orders + fulfilment service',
  // },
} satisfies Record<string, ServiceDefinition>;

export type ServiceKey = keyof typeof SERVICES;

/** All registered service keys, in declaration order. */
export function serviceKeys(): ServiceKey[] {
  return Object.keys(SERVICES) as ServiceKey[];
}

/** The service backing the `api` fixture. Throws when the registry is misconfigured. */
export function primaryServiceKey(): ServiceKey {
  const primary = serviceKeys().filter((k) => (SERVICES[k] as ServiceDefinition).primary);
  if (primary.length !== 1) {
    throw new Error(
      `config/services.ts: exactly one service must be marked \`primary: true\` (found ${primary.length}).`,
    );
  }
  return primary[0];
}
