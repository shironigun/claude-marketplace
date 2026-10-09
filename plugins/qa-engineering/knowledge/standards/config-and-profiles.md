# Config and profiles

> One profile per environment/tenant, selected by a single env var, with every secret in a git-ignored `.env`.

## Purpose
A profile is plain configuration — never behaviour — that tells the suite which environment, which
tenant/account, and which credentials a run uses. The same test body runs under every profile; only the
config changes. This keeps "run the suite against staging as tenant B" a one-variable change and keeps
every URL, id, and credential out of the test code and out of git.

## When to use it (and when NOT)
- **Use a profile** for anything that differs per environment or per tenant: base URLs, login
  credentials, the tenant id tests operate inside, a second tenant for isolation tests, the web-app URL.
- **Add a new profile** for a genuinely new environment or tenant type — one per environment (qa /
  staging), one per tenant type, one per deployment variant.
- **Do NOT** branch test *logic* on a profile to work around configuration. A profile-specific test is
  justified only when the business contract genuinely differs, not to paper over a missing env value.
- **Do NOT** put a secret, URL, or org name in a profile factory or any committed file — those come from
  the git-ignored `.env`, by key name.

## Official guidance
- Control the data and test against a stable environment; "make sure you control the data" and prefer a
  staging environment that does not change under the test — https://playwright.dev/docs/best-practices
- Playwright reads `baseURL` and default headers from config `use`, so per-environment values belong in
  config, not in specs — https://playwright.dev/docs/api-testing
- (Kit convention) validate config loudly at worker startup and keep secrets in a git-ignored `.env`;
  Playwright does not mandate this, but it pairs with the official guidance to keep auth state out of
  the repo — https://playwright.dev/docs/auth

## Code shape (product-neutral)
```ts
// A profile is config, consumed by the fixtures. Values come from env, never literals.
export interface Profile {
  name: string;              // selected by AUTOMATION_PROFILE, e.g. 'default' | 'staging'
  envPrefix: string;         // per-profile overrides, e.g. STAGING_API_BASE_URL
  services: Record<ServiceKey, string | undefined>;  // base URL per host, from env
  defaultHeaders: Record<string, string>;            // sent on every request (gateway key, api-version)
  auth: AuthConfig;          // strategy + where the token lives
  credentials: { tenantId: string; userName: string; password: string };
  testTenantId: number;      // the tenant tests operate inside
  crossTenantId?: number;    // a DIFFERENT tenant for isolation tests; unset → those skip
  webAppUrl: string;         // empty while API-only
}
```
```text
Profiles table — one row per profile, every value from env by KEY (never the value itself)

  Profile   Environment   Tenant/account        Credentials (env keys)
  default   dev/qa        testTenantId (env)    AUTH_USERNAME / AUTH_PASSWORD
  staging   staging       testTenantId (env)    STAGING_AUTH_USERNAME / STAGING_AUTH_PASSWORD
  (switch with one var)   AUTOMATION_PROFILE=staging

Resolution validates loudly at startup and names the exact missing keys:
  Profile 'staging' is missing required config:
    • STAGING_API_BASE_URL (or API_BASE_URL)
    • STAGING_AUTH_PASSWORD (or AUTH_PASSWORD)
  Copy .env.example to .env and fill these in.
```

## Anti-patterns
- A base URL, token, account id, or org name written into a profile factory or any committed file —
  they belong only in the git-ignored `.env`, referenced by key.
- Branching test behaviour on the profile to dodge a configuration gap, instead of fixing the config.
- Config that fails late with a bare `401` instead of validating at startup with the missing key named.
- Putting secrets in `baseURL` query strings or default-header literals; keep them in env values the
  config reads.

## Related standards
- `auth-and-storage-state.md` — the `auth` block of a profile: how the token is minted and reused.
- `api-client.md` — consumes the profile's hosts and default headers on every request.
- `ci.md` — supplies each `.env` key to CI by name, since the git-ignored file is absent on the agent.
- `routes.md` — paths are relative to a profile's base URL, so no spec hardcodes a host.
