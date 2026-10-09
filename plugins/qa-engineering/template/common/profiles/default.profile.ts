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
 */
export const defaultProfile = () => buildProfile({ name: 'default', envPrefix: 'DEFAULT' });
