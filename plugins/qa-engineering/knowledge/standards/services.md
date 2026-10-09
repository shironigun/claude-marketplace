# Services

> Domain-verb classes (`createX` / `archive` / `ensureY`) that wrap client calls, throw clearly on non-2xx, and return a ref that carries its own undo.

## Purpose
A service is the API's equivalent of a page object: every create/read/update/transition/cleanup for a
resource lives in one class, so no spec builds a payload or a route by hand. Services *act* and *wait*;
they never assert. A write returns a ref that includes its own cleanup, so the test can undo exactly what
it made. A thin `ensureOk()` turns a silent non-2xx (Playwright does not throw on 4xx/5xx) into a clear
error with the status and body.

## When to use it (and when NOT)
- **Use a service** for every domain operation a test needs — creating a precondition, reading back a
  state, driving a transition, cleaning up.
- **Name methods by domain verb** (`create`, `activate`, `archive`, `ensureCategory`), not by HTTP verb.
- **Return the raw response** from a method whose status the spec will assert; **return parsed data**
  from a read.
- **Use a retry wrapper only on setup/cleanup paths**, and only for a KNOWN transient condition (e.g. a
  deadlock-victim 500) — never on a call a test asserts on.
- **Do NOT** put `expect()` in a service — assertions live in the spec so the report stays honest about
  what was verified.
- **Do NOT** let a teardown method throw — a throwing cleanup masks the real failure.

## Official guidance
- Services use `APIRequestContext` under the hood for direct server calls and for setting up server-side
  state before a browser test — https://playwright.dev/docs/api-testing
- A Playwright `APIResponse` does not throw on 4xx/5xx, so a setup/teardown call must be checked
  explicitly — `ensureOk()` exists for that — https://playwright.dev/docs/api-testing
- (Kit convention) the domain-verb service object, the ref-with-undo return, and the KNOWN-transient-only
  retry rule are the kit's own engineering, not Playwright features.

## Code shape (product-neutral)
```ts
export interface WidgetRef {
  widgetId: number;
  name: string;
  cleanup: () => Promise<void>;        // the undo travels with the thing created
}

export class WidgetService {
  constructor(private readonly client: ApiClient, private readonly tenantId: number) {}

  /** Read: returns parsed data; logs the status before giving up. */
  async getById(widgetId: number): Promise<WidgetRecord> {
    const { res } = await this.client.get(fillRoute(WidgetRoutes.GetById, { widgetId }));
    if (!res.ok()) throw new Error(`getById(${widgetId}): ${res.status()} ${await res.text()}`);
    return json<WidgetRecord>(res);
  }

  /** Write: returns the ref + its undo. Throws with status + body on failure. */
  async create(overrides: Partial<WidgetPayload> = {}): Promise<WidgetRef> {
    const payload = buildWidget(this.tenantId, overrides);
    const { res } = await this.client.post(WidgetRoutes.Create, { data: payload });
    if (!res.ok()) throw new Error(`create: ${res.status()} ${await res.text()}`);
    const { id } = await json<{ id: number }>(res);
    return { widgetId: id, name: payload.name, cleanup: () => this.delete(id) };
  }

  /** A transition — returns the RAW response so the SPEC asserts the status. */
  async activate(widgetId: number): Promise<APIResponse> {
    const { res } = await this.client.put(fillRoute(WidgetRoutes.Activate, { widgetId }));
    return res;                          // no expect() here
  }

  /** Teardown: never throws. A throwing teardown masks the real failure. */
  async delete(widgetId: number): Promise<void> {
    await this.client.delete(fillRoute(WidgetRoutes.Delete, { widgetId })).catch(() => {});
  }
}
```

## Anti-patterns
- `expect()` inside a service — moves the verification out of the spec and makes the report lie about
  what ran.
- A retry wrapper around a call a test asserts on — it can hide a real intermittent bug; retries belong
  to setup/cleanup and to CI.
- A teardown that throws — one failed undo then abandons the rest and masks the original failure.
- A service method named after an HTTP verb (`doPut`) instead of the domain action (`activate`).
- No DELETE on the API and no fallback — always archive or rename to an `AUTOMATION_`-prefixed value so
  the resource stays tracked (never leave it orphaned).

## Related standards
- `builders.md` — supplies the valid default payload a service sends.
- `api-client.md` — the one wrapper every service call goes through.
- `cleanup-and-sweepers.md` — consumes the `cleanup` the ref returns.
- `matchers.md` — the spec asserts on the raw response a transition method returns.
- `cross-module-reuse.md` — a cross-module flow reuses the owning module's service, never a second copy.
