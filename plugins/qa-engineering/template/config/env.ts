/**
 * Single source of env truth. Loaded once, read everywhere through the Profile.
 *
 * Nothing in here validates — `getProfile()` in config/profiles.index.ts does that,
 * lazily, so authoring-time scripts can run without a populated `.env`.
 */
import * as dotenv from 'dotenv';
import * as path from 'path';
import { SERVICES, serviceKeys, type ServiceKey } from './services';
import type { AuthConfig, AuthStrategy } from '../common/profiles/profile.types';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

/** Read an env var, treating whitespace-only as unset. */
export function str(key: string): string | undefined {
  const value = process.env[key];
  return value && value.trim() !== '' ? value.trim() : undefined;
}

/** Read `<PREFIX>_<KEY>` if set, else fall back to the un-prefixed global `<KEY>`. */
export function scoped(prefix: string, key: string): string | undefined {
  return str(`${prefix}_${key}`) ?? str(key);
}

/** Base URL per registered service for one profile. Unset services stay `undefined`. */
export function readServiceUrls(prefix: string): Record<ServiceKey, string | undefined> {
  const urls = {} as Record<ServiceKey, string | undefined>;
  for (const key of serviceKeys()) {
    urls[key] = scoped(prefix, (SERVICES[key] as { envKey: string }).envKey);
  }
  return urls;
}

/** Parse an env var holding a JSON object. Fails loudly — a silent `{}` here is a 401 later. */
function readJsonObject(prefix: string, key: string): Record<string, unknown> {
  const raw = scoped(prefix, key);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    throw new Error('not a JSON object');
  } catch (err) {
    throw new Error(`${key} must be a JSON object (got: ${raw}). ${(err as Error).message}`);
  }
}

/**
 * Headers sent on every request — gateway subscription key, static API key,
 * API-version header. Whatever the real client sends on every call.
 */
export function readDefaultHeaders(prefix: string): Record<string, string> {
  const raw = readJsonObject(prefix, 'DEFAULT_HEADERS');
  const headers: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === 'string' || typeof value === 'number') headers[key] = String(value);
    else throw new Error(`DEFAULT_HEADERS['${key}'] must be a string or a number.`);
  }
  return headers;
}

/** How this profile obtains and attaches its token. */
export function readAuthConfig(prefix: string): AuthConfig {
  return {
    strategy: (scoped(prefix, 'AUTH_STRATEGY') ?? 'password') as AuthStrategy,
    baseUrl: scoped(prefix, 'AUTH_BASE_URL') ?? '',
    loginPath: scoped(prefix, 'AUTH_LOGIN_PATH') ?? 'auth/login',
    tokenField: scoped(prefix, 'AUTH_TOKEN_FIELD') ?? 'access_token',
    usernameField: scoped(prefix, 'AUTH_USERNAME_FIELD') ?? 'username',
    passwordField: scoped(prefix, 'AUTH_PASSWORD_FIELD') ?? 'password',
    tenantField: scoped(prefix, 'AUTH_TENANT_FIELD'),
    extraBody: readJsonObject(prefix, 'AUTH_EXTRA_BODY'),
    identityTenantField: scoped(prefix, 'AUTH_IDENTITY_TENANT_FIELD'),
    identityUserField: scoped(prefix, 'AUTH_IDENTITY_USER_FIELD'),
    headerName: scoped(prefix, 'AUTH_HEADER_NAME') ?? 'Authorization',
    scheme: scoped(prefix, 'AUTH_SCHEME') ?? 'Bearer',
    staticToken: scoped(prefix, 'AUTH_STATIC_TOKEN'),
    clientId: scoped(prefix, 'AUTH_CLIENT_ID'),
    clientSecret: scoped(prefix, 'AUTH_CLIENT_SECRET'),
    scope: scoped(prefix, 'AUTH_SCOPE'),
    audience: scoped(prefix, 'AUTH_AUDIENCE'),
    grantType: scoped(prefix, 'AUTH_GRANT_TYPE') ?? 'client_credentials',
  };
}

/** Credentials for one profile. `<PREFIX>_AUTH_*` first, global `AUTH_*` as fallback. */
export function readCredentials(prefix: string) {
  const tenantId = scoped(prefix, 'AUTH_TENANT_ID') ?? '';
  const crossTenantId = scoped(prefix, 'CROSS_TENANT_ID');
  return {
    tenantId,
    userName: scoped(prefix, 'AUTH_USERNAME') ?? '',
    password: scoped(prefix, 'AUTH_PASSWORD') ?? '',
    testTenantId: tenantId ? Number(tenantId) : 0,
    crossTenantId: crossTenantId ? Number(crossTenantId) : undefined,
  };
}

/** Web app URLs for the UI tier. Blank while the workspace is API-only. */
export function readWebAppConfig(prefix: string) {
  return {
    webAppUrl: scoped(prefix, 'WEB_APP_URL') ?? '',
    webAppLoginUrl: scoped(prefix, 'WEB_APP_LOGIN_URL'),
    postLoginHeading: scoped(prefix, 'WEB_APP_POST_LOGIN_HEADING') ?? 'Dashboard',
  };
}

/** Globals that are not profile-specific. */
export const env = {
  profile: str('AUTOMATION_PROFILE') ?? 'default',
  responseTimeThresholdMs: Number(str('RESPONSE_TIME_THRESHOLD_MS') ?? '2000'),
  verifyPath: str('VERIFY_PATH') ?? 'health',
  notifyWebhookUrl: str('NOTIFY_WEBHOOK_URL'),
  ci: !!process.env.CI,
};
