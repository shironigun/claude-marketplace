# Variants and user types

> Many products behave differently for different *kinds* of account, user, or deployment — a dealer
> type, a tenant type, a subscription tier/edition, a user role, a client app. That axis is a
> first-class part of the architecture: discover it from the product, model it as config, and test
> shared behaviour once and variant-specific behaviour where — and only where — the product branches.

## Purpose
A **variant axis** is a dimension along which the *same feature* behaves differently: the backend takes a
different branch, or the UI shows/hides/relabels something, depending on which kind of account/user/
deployment is acting. Common axes: account/organisation **type** (e.g. which integration partner a
tenant runs), **subscription tier / edition**, **user role**, **client app / brand**. A product can have
more than one axis at once.

The axis is **not** behaviour you write in the test — it is **config** the test runs under (a profile),
plus a small, honest set of variant-specific tests for the places the product genuinely differs. The
same test body proves shared behaviour under every variant; a variant-specific test exists only where the
product's own code branches on the axis, and it **names the branch it covers**.

This keeps "does feature X work for variant B?" a one-variable change, keeps the variant values out of
the test logic, and makes the one thing a multi-variant product most often ships broken — a feature that
works for one variant and silently breaks for another — a thing the suite actually covers.

## When to use it (and when NOT)
- **Discover the axis in phase 0 (system analysis), before the first module.** If the product has a
  variant axis, the framework's profile set and its "which modules are variant-sensitive" map depend on
  it, so it belongs in the architecture, not bolted on per module later.
- **Model one profile per variant value that is actually testable** (you have a test account for it).
  Shared behaviour runs under the default profile; a variant profile exists to exercise that variant's
  own branches and as an isolation lever.
- **Write a variant-specific test only where the product's own code branches on the axis** — a
  `if (type == X)` in a service/handler, a `role`/`tier`/`edition` gate, a UI element shown only for a
  variant. Cite that `file:line` in the test. The branch is the evidence the test is real coverage, not
  a guess.
- **Do NOT invent a variant axis.** If no enum/role/tier/flag in the product source branches behaviour,
  there is no axis — do not manufacture profiles for variants the product treats identically.
- **Do NOT guess which values exist.** Read them from the product's own enum / role list / tier
  definition (`file:line`). A value you cannot source is a Gap-or-Question, not a profile.
- **Do NOT branch test *logic* on the variant to paper over configuration.** Branch only on a confirmed
  behavioural difference; a pure config difference (a URL, an id, a credential) is a profile value, never
  an `if` in a spec.
- **Do NOT leave the axis implicit.** A suite that only ever runs as one variant, on a product that has
  several, is reporting green for coverage it does not have.

## How to discover the axis (read the product, never the old suite or memory)
1. **Find the enumerations and gates the product branches on.** Grep the backend and the frontend for an
   account-type / role / tier / edition / brand enum and the places that switch on it:
   - backend: `== <Enum>.<Value>`, `switch (type)`, `[Authorize(Roles=…)]`, a tier/feature gate;
   - frontend: `=== <Enum>.<Value>` near a render or an API call, a route guard, a feature flag read.
2. **Read the enum definition** for the authoritative value list (label → value). Prefer a single shared
   definition (one used by both tiers) when it exists.
3. **Count the branch breadth** — how many files / which modules switch on the axis. This tells you the
   axis's weight and which modules are variant-sensitive (get variant-specific coverage) vs
   variant-agnostic (shared tests only).
4. **Note whether the axis touches the UI, the backend, or both** — a UI-heavy axis means UI tests carry
   most of the variant coverage; a backend axis means endpoint/workflow tests do.
5. **Record it in the system map** (see `scan-and-confirm`): the axis name, its source `file:line`, its
   values, the evidence, the surface (ui / backend / both), and the variant-sensitive modules. Confirm
   it with the QA before it drives the architecture — the code shows *where* it branches; only the QA
   confirms which variants are in scope and which have test accounts.

## Code shape (product-neutral)
A variant is a labelled profile value, read from env, never a literal in a spec.

```ts
// profile.types.ts — the axis is a documented discriminator carried by the profile.
export interface Profile {
  // …
  /** The variant this profile represents, as the product's own enum value (e.g. an account-type id).
   *  Undefined for a variant-agnostic/default profile. Branch on it ONLY where the product does. */
  variant?: number;
  /** Human label for the variant, for report/skip messages (e.g. the enum member name). */
  variantName?: string;
}
```

```ts
// config/profiles.index.ts — one profile per variant, each reading <VARIANT>_AUTH_* with a global
// fallback, so a single .env holds credentials for every variant.
//   AUTH_USERNAME / AUTH_PASSWORD                      ← global default
//   TYPEB_AUTH_USERNAME / TYPEB_AUTH_PASSWORD          ← variant "typeB" overrides
// AUTOMATION_PROFILE=typeB selects it; unset falls back to the default.
```

```ts
// A SHARED-behaviour test — the same body, runs under whichever profile is active. No branch.
test('Widgets - Create - Verify that POST widgets creates a widget.', { tag: ['@widgets','@endpoint'] },
  async ({ api, profile }) => { /* … */ });

// A VARIANT-SPECIFIC test — runs only for the variant whose branch it covers, and says which branch.
import { onlyFor } from '../../../../../common/fixtures/helpers';
test('Widgets - Create - Verify that variant B requires an approver.', { tag: ['@widgets','@endpoint'] },
  async ({ api, profile }) => {
    onlyFor(profile, [VARIANT.TypeB], 'WidgetService.cs:142 — approver required only when type == TypeB');
    // …assert the variant-B behaviour…
  });
```

Run shared coverage under each variant by selecting the profile (`AUTOMATION_PROFILE=typeB`), in CI as a
matrix over the variants that have test accounts. `onlyFor` / `skipFor` (in `common/fixtures/helpers`)
are the only variant branch allowed in a spec, and each carries the reason + the `file:line` it covers.

## Anti-patterns
- Inventing variants the product does not actually branch on, or a value you could not source from the
  product's enum/role/tier definition.
- A variant-specific test with no cited `file:line` branch — it reads like coverage and proves a guess.
- Branching test behaviour on the variant for a pure configuration difference (a URL/id/credential) that
  belongs in a profile value.
- A single-variant suite silently reported as full coverage for a multi-variant product.
- Hard-coding a variant value, label, or credential in a spec or any committed file — values come from
  the product enum (for the branch) and from the git-ignored `.env` (for the credentials), by key name.
- Discovering the axis per module and re-deriving it each time, instead of once in the system analysis
  that the whole architecture reads.

## Related standards
- `config-and-profiles.md` — a variant is a profile; this standard is the multi-variant case of it.
- `auth-and-storage-state.md` — per-variant credentials and (for the UI tier) per-variant login entry.
- `isolation-and-parallelism.md` — a second variant/tenant is also the isolation lever (cross-tenant).
- `test-levels.md` — where variant coverage lands (UI-heavy axis → UI tests; backend axis → endpoint/
  workflow tests).
- `helpers.md` — `onlyFor` / `skipFor`, the only sanctioned variant branch inside a spec.
