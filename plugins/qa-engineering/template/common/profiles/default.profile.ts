import { buildProfile } from './build-profile';

/**
 * The default profile. Reads the un-prefixed globals in `.env`
 * (`API_BASE_URL`, `AUTH_USERNAME`, …) — no prefix needed.
 *
 * To add a second environment, copy this file:
 *
 *   // common/profiles/staging.profile.ts
 *   export const stagingProfile = () =>
 *     buildProfile({ name: 'staging', envPrefix: 'STAGING' });
 *
 * then register it in config/profiles.index.ts and set the `STAGING_*` keys
 * you want to override in `.env`. Anything you do not override falls back to
 * the global value, so a staging profile that only changes the host is three
 * lines of `.env`.
 *
 * VARIANT profiles — when the product changes behaviour by a kind of
 * account/user/deployment (a dealer type, tenant type, tier, role), register one
 * profile per variant, each carrying the product's enum value as `variant` and
 * reading its own `<VARIANT>_AUTH_*` creds (global `AUTH_*` is the fallback):
 *
 *   // common/profiles/type-b.profile.ts
 *   export const typeBProfile = () =>
 *     buildProfile({ name: 'typeB', envPrefix: 'TYPEB', variant: 1, variantName: 'TypeB' });
 *
 * The SAME test body runs under every variant (shared behaviour); a test asserts
 * a variant-specific rule only via `onlyFor`/`skipFor`, citing the product branch.
 * See `knowledge/standards/variants-and-user-types.md`.
 */
export const defaultProfile = () => buildProfile({ name: 'default', envPrefix: 'DEFAULT' });
