/**
 * A Profile is plain config consumed by the fixtures — never behaviour.
 *
 * The SAME test body runs under every profile. Add a profile-specific test only
 * where the business logic genuinely differs, never to work around configuration.
 *
 * Typical profiles: one per environment (qa / staging), one per tenant type,
 * one per deployment variant. Register them in config/profiles.index.ts.
 */
import type { ServiceKey } from '../../config/services';

export type AuthStrategy = 'password' | 'client-credentials' | 'static' | 'none';

/** How a profile obtains a token and attaches it to every request. */
export interface AuthConfig {
  strategy: AuthStrategy;
  /** Host that mints the token. */
  baseUrl: string;
  /** Path appended to `baseUrl` (leading slash optional). */
  loginPath: string;
  /** Dot-path to the token inside the login response, e.g. `data.accessToken`. */
  tokenField: string;
  /** Body field NAMES the login endpoint expects. */
  usernameField: string;
  passwordField: string;
  /** Optional body field carrying the tenant/account id. */
  tenantField?: string;
  /** Constant fields merged into the login body. */
  extraBody: Record<string, unknown>;
  /** Dot-path to an account/tenant id in the LOGIN RESPONSE — applied as `testTenantId`. */
  identityTenantField?: string;
  /** Dot-path to the user id in the LOGIN RESPONSE, when it is not in the token's claims. */
  identityUserField?: string;
  /** Header the token is sent in, and its scheme prefix. */
  headerName: string;
  scheme: string;
  /** strategy: static */
  staticToken?: string;
  /** strategy: client-credentials */
  clientId?: string;
  clientSecret?: string;
  scope?: string;
  audience?: string;
  grantType?: string;
}

export interface ProfileCredentials {
  /** Tenant/account id sent at login, when the API needs one. */
  tenantId: string;
  userName: string;
  password: string;
}

export interface Profile {
  /** Profile key as used by AUTOMATION_PROFILE, e.g. 'default' | 'staging'. */
  name: string;
  /** Uppercased env-var prefix for per-profile overrides, e.g. 'STAGING'. */
  envPrefix: string;
  /**
   * Optional discriminator when one deployment serves several variants
   * (tenant type, product tier, backend flavour). Branch on this only when the
   * API contract genuinely differs — never for configuration differences.
   */
  variant?: number;

  /** Base URL per registered service. Unset services are `undefined`. */
  services: Record<ServiceKey, string | undefined>;

  /**
   * Headers sent on EVERY request, before the auth header and before any
   * per-call override. This is where a gateway subscription key, a static API
   * key alongside the bearer, or an API-version header belongs — anything the
   * real client sends on every call.
   *
   * Set via `DEFAULT_HEADERS` (JSON) in `.env`. Empty for most backends.
   */
  defaultHeaders: Record<string, string>;

  /** Token minting + attachment. */
  auth: AuthConfig;
  credentials: ProfileCredentials;

  /** Tenant/account the tests operate inside. */
  tenantId: string;
  testTenantId: number;
  /** A DIFFERENT tenant, used by isolation tests. Undefined → those tests skip. */
  crossTenantId?: number;

  /** Web app URL — Playwright `baseURL` for UI projects. Empty while API-only. */
  webAppUrl: string;
  /** Login page URL, when it differs from `webAppUrl`. */
  webAppLoginUrl?: string;
  /** Heading that proves a browser login succeeded. */
  postLoginHeading: string;
}
