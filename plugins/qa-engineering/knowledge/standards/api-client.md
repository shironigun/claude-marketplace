# API client

> One wrapper over `APIRequestContext` that attaches auth, re-mints on 401, detects a dead host, and reports errors consistently.

## Purpose
Every API call goes through one thin client bound to a host and a profile. It is the single place that
attaches the auth header and the profile's default headers, measures latency, re-mints the token once on
an unexpected 401, and turns a host-down placeholder page into a clear environment error. Because it is
the one chokepoint, changing the auth scheme — or adding a gateway key, a signed request, an idempotency
header — is a one-file change, and no service or spec ever builds headers itself.

## When to use it (and when NOT)
- **Use the client** for every API request — services call it; specs get it from a fixture (`api` /
  `apis.orders`). One instance per service per worker.
- **Use `omitAuth`** only to assert the unauthenticated (401) path deliberately.
- **Put cross-cutting request concerns here** (signing, a nonce, a gateway subscription key) — this is
  the only method every request passes through.
- **Do NOT** instantiate `APIRequestContext` or set an `Authorization` header inside a spec or service.
- **Do NOT** add retry *to the asserted response* here — the single 401 re-mint is for an expired token,
  not a way to paper over a flaky assertion (that is CI's retry job).

## Official guidance
- Use `APIRequestContext` to call server APIs from Node without a browser; it honours config `baseURL`
  and `extraHTTPHeaders` — https://playwright.dev/docs/api-testing
- A context made with `request.newContext()` has its own isolated cookie storage, so per-host clients do
  not leak state into one another — https://playwright.dev/docs/api-testing
- (Kit convention) the single-chokepoint wrapper, the one-shot 401 re-mint, and host-down detection are
  the kit's own engineering, not Playwright features.

## Code shape (product-neutral)
```ts
export class ApiClient {
  constructor(
    private readonly ctx: APIRequestContext,  // one per host, from a worker fixture
    private readonly profile: Profile,
    private token: string,
  ) {}

  get(route: string, opts?: RequestOpts)  { return this.send('get', route, opts); }
  post(route: string, opts?: RequestOpts) { return this.send('post', route, opts); }
  // …put / patch / delete …

  private buildOptions(opts?: RequestOpts) {
    // Profile default headers first (gateway key, api-version), then the caller's overrides.
    // A SIGNED request (HMAC, nonce, idempotency key) would be computed HERE — the one place.
    const headers = { ...this.profile.defaultHeaders, ...(opts?.headers ?? {}) };
    if (!opts?.omitAuth) Object.assign(headers, authHeaders(this.profile.auth, this.token));
    return { params: opts?.params, headers, data: opts?.data, timeout: opts?.timeout };
  }

  private async send(method: Method, route: string, opts?: RequestOpts): Promise<TimedResponse> {
    let res = await this.ctx[method](route, this.buildOptions(opts));
    // A 401 on a request that DID send our token = it expired mid-run: re-mint ONCE and retry.
    // A second 401 is a real authorization result and is returned as-is.
    if (res.status() === 401 && sentOurToken(opts)) {
      this.token = await mintToken(this.profile, /* force */ true);
      res = await this.ctx[method](route, this.buildOptions(opts));
    }
    if (isStoppedHostPage(res.status(), await res.text())) throw new HostStoppedError(res.url());
    return { res, ms: /* measured latency */ 0 };
  }
}
```

## Anti-patterns
- Building an `Authorization` header or a new `APIRequestContext` inside a spec or service — that scatters
  auth across the suite and defeats the one-file-change property.
- Retrying the response a test asserts on. The 401 re-mint handles an expired token; everything else is
  CI's retry net, so a flaky assertion stays visible.
- Swallowing a host-down page as a normal 403/503 — then every test fails with an unrelated schema error
  instead of one clear "environment down" cause.
- Returning only the response and losing the latency/context the client measures for soft timing checks.

## Related standards
- `auth-and-storage-state.md` — how the token the client attaches is minted and re-minted.
- `config-and-profiles.md` — the profile the client is bound to (hosts, default headers).
- `routes.md` — the relative paths the client sends.
- `services.md` — the domain layer that calls the client so specs never touch it directly.
- `matchers.md` — asserts on the `{ res }` the client returns.
