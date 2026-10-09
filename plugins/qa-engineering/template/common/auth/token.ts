/**
 * Token minting — the one place the framework talks to your identity provider.
 *
 * Four strategies cover nearly every backend; pick yours with `AUTH_STRATEGY`:
 *
 *   password           POST credentials to a login endpoint, read a token out of the body
 *   client-credentials OAuth2 form POST (client_id / client_secret / scope)
 *   static             use AUTH_STATIC_TOKEN verbatim
 *   none               send no Authorization header
 *
 * If your provider does something none of these cover (mTLS, SAML, a signed assertion,
 * a two-step challenge), add a case to `mintFor()` below. That is the only file that
 * should ever change — every fixture, service and spec keeps working.
 *
 * Identity from the login response: many APIs scope every route to an account/tenant id
 * that the LOGIN RESPONSE returns — which can differ from what the user typed. Set
 * AUTH_IDENTITY_TENANT_FIELD (and optionally AUTH_IDENTITY_USER_FIELD) to a dot-path and
 * `resolveProfile()` reads those ids from the login body, exactly like a real client.
 * Leave them unset and the profile keeps its env-configured ids.
 *
 * Tokens are cached per profile and re-minted once on an unexpected 401 (see ApiClient).
 */
import { request as pwRequest } from '@playwright/test';
import type { AuthConfig, Profile } from '../profiles/profile.types';

const tokenCache = new Map<string, string>();
const userIdCache = new Map<string, string>();
/** The parsed login response body per profile (password strategy), for identity resolution. */
const loginBodyCache = new Map<string, Record<string, unknown>>();

/** Join a base URL and a path with exactly one slash between them. */
function joinUrl(base: string, path: string): string {
  return `${base.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
}

/** Read a dot-path out of a parsed JSON body — `data.accessToken` → body.data.accessToken. */
function pickPath(body: unknown, dotPath: string): unknown {
  return dotPath
    .split('.')
    .reduce<unknown>(
      (acc, key) => (acc && typeof acc === 'object' ? (acc as Record<string, unknown>)[key] : undefined),
      body,
    );
}

/** Decode a JWT payload without verifying it. Returns null for opaque tokens. */
export function decodeJwtClaims(token: string): Record<string, unknown> | null {
  const parts = token.split('.');
  if (parts.length < 2) return null;
  try {
    const json = Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** First claim in `keys` that holds a usable scalar. Empty string if none do. */
function firstScalarClaim(claims: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = claims[key];
    if (typeof value === 'string' && value !== '') return value;
    if (typeof value === 'number') return String(value);
  }
  return '';
}

/** The subject/user id carried by a JWT, across the common claim spellings. */
export function subjectFromClaims(claims: Record<string, unknown>): string {
  return firstScalarClaim(claims, ['sub', 'nameid', 'oid', 'user_id', 'uid']);
}

/** The authenticated user's id, when the token or login response carries one. '' otherwise. */
export function getCachedUserId(cacheKey: string): string {
  return userIdCache.get(cacheKey) ?? '';
}

/** The cached login response body for a profile (password strategy), if it has logged in. */
export function getLoginBody(cacheKey: string): Record<string, unknown> | undefined {
  return loginBodyCache.get(cacheKey);
}

/** Headers that authenticate a request for this profile. Empty for `strategy: none`. */
export function authHeaders(auth: AuthConfig, token: string): Record<string, string> {
  if (auth.strategy === 'none' || !token) return {};
  const value = auth.scheme ? `${auth.scheme} ${token}` : token;
  return { [auth.headerName]: value };
}

/**
 * Mint (or return the cached) token for a profile.
 * @param force skip the cache — used by the 401 retry path.
 */
export async function mintToken(profile: Profile, force = false): Promise<string> {
  const cacheKey = profile.name;
  if (!force) {
    const cached = tokenCache.get(cacheKey);
    if (cached !== undefined) return cached;
  }

  const token = await mintFor(profile);
  tokenCache.set(cacheKey, token);

  // User id: prefer the JWT subject; fall back to a configured identity field in the body.
  const claims = token ? decodeJwtClaims(token) : null;
  let userId = claims ? subjectFromClaims(claims) : '';
  if (!userId && profile.auth.identityUserField) {
    const body = loginBodyCache.get(cacheKey);
    const fromBody = body ? pickPath(body, profile.auth.identityUserField) : undefined;
    if (typeof fromBody === 'string' || typeof fromBody === 'number') userId = String(fromBody);
  }
  if (userId) userIdCache.set(cacheKey, userId);

  return token;
}

async function mintFor(profile: Profile): Promise<string> {
  const { auth, credentials } = profile;

  switch (auth.strategy) {
    case 'none':
      return '';

    case 'static':
      if (!auth.staticToken) {
        throw new Error(`AUTH_STRATEGY=static but AUTH_STATIC_TOKEN is empty (profile '${profile.name}').`);
      }
      return auth.staticToken;

    case 'password': {
      const url = joinUrl(auth.baseUrl, auth.loginPath);
      const data: Record<string, unknown> = {
        [auth.usernameField]: credentials.userName,
        [auth.passwordField]: credentials.password,
        ...auth.extraBody,
      };
      if (auth.tenantField) data[auth.tenantField] = credentials.tenantId;
      return postForToken(url, { data }, auth, profile.name);
    }

    case 'client-credentials': {
      const url = joinUrl(auth.baseUrl, auth.loginPath);
      const form: Record<string, string> = {
        grant_type: auth.grantType ?? 'client_credentials',
        client_id: auth.clientId ?? '',
        client_secret: auth.clientSecret ?? '',
      };
      if (auth.scope) form.scope = auth.scope;
      if (auth.audience) form.audience = auth.audience;
      return postForToken(url, { form }, auth, profile.name);
    }

    default:
      throw new Error(
        `Unknown AUTH_STRATEGY '${String(auth.strategy)}'. ` +
          `Valid values: password, client-credentials, static, none. ` +
          `Add a case to common/auth/token.ts if your provider needs a new one.`,
      );
  }
}

async function postForToken(
  url: string,
  payload: { data: Record<string, unknown> } | { form: Record<string, string> },
  auth: AuthConfig,
  profileName: string,
): Promise<string> {
  const ctx = await pwRequest.newContext();
  try {
    const res = await ctx.post(url, payload);
    const text = await res.text();

    if (!res.ok()) {
      throw new Error(
        `Token mint failed for profile '${profileName}': ${res.status()} ${res.statusText()}\n` +
          `  POST ${url}\n  ${text.slice(0, 500)}`,
      );
    }

    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      throw new Error(
        `Token mint returned non-JSON for profile '${profileName}'.\n  POST ${url}\n  ${text.slice(0, 500)}`,
      );
    }

    // Cache the body so resolveProfile() can read identity ids the response returned.
    if (body && typeof body === 'object' && !Array.isArray(body)) {
      loginBodyCache.set(profileName, body as Record<string, unknown>);
    }

    const token = pickPath(body, auth.tokenField);
    if (typeof token !== 'string' || token === '') {
      throw new Error(
        `Token mint succeeded but AUTH_TOKEN_FIELD='${auth.tokenField}' did not resolve to a token ` +
          `for profile '${profileName}'.\n  Response keys: ${
            body && typeof body === 'object' ? Object.keys(body).join(', ') : typeof body
          }\n  Set AUTH_TOKEN_FIELD to the right path (dot-paths like 'data.token' are supported).`,
      );
    }
    return token;
  } finally {
    await ctx.dispose();
  }
}

/**
 * Resolve the profile's identity from the login response, generically.
 *
 * Logs in once (cached) and, when AUTH_IDENTITY_TENANT_FIELD is set, reads the
 * account/tenant id from the response body and applies it as `testTenantId` — the id
 * every route is scoped to, exactly as a real client uses the id the server returned
 * rather than the one typed at login. Unset → the profile keeps its env-configured ids.
 *
 * This is what the `auth-check` project and the `profile` fixture call, so a broken
 * login fails once here with the cause, before any test runs.
 */
export async function resolveProfile(profile: Profile): Promise<Profile> {
  await mintToken(profile); // ensures login happened and populated the caches
  const body = getLoginBody(profile.name);

  let testTenantId = profile.testTenantId;
  let tenantId = profile.tenantId;
  const field = profile.auth.identityTenantField;
  if (body && field) {
    const raw = pickPath(body, field);
    if (typeof raw === 'string' || typeof raw === 'number') {
      const n = Number(raw);
      if (Number.isFinite(n) && n > 0) {
        testTenantId = n;
        tenantId = String(raw);
      }
    }
  }

  return { ...profile, testTenantId, tenantId };
}
