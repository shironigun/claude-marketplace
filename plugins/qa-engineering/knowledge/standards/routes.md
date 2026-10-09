# Routes

> One route-constant table per module and a `fillRoute()` that fills `{placeholders}` — no raw URL strings in specs.

## Purpose
Routes are the API's paths, named once in a constants table per module, with `{placeholder}` segments
filled by a single helper. A spec or service references `WidgetRoutes.GetById`, never a string literal.
This makes a path change one edit, keeps every call relative to the profile's base URL, and removes the
single most common silent failure — a leading slash that discards the base path and yields a 404.

## When to use it (and when NOT)
- **Use a route constant** for every endpoint a module touches, including sub-resource and action paths
  (`widgets/{widgetId}/activate`).
- **Use `fillRoute()`** wherever a path has a `{param}`; never interpolate ids into a template string by
  hand in a spec.
- **Do NOT** write a raw path string in a spec or service body.
- **Do NOT** start a route with a leading slash — that discards the service base path.

## Official guidance
- Paths are relative to the configured `baseURL`; keep the host in config and pass only the path to the
  request — https://playwright.dev/docs/api-testing
- (Kit convention) centralising paths in constants is the kit's own structure for maintainability, in
  the same spirit as the POM's "capture selectors in one place" — not a Playwright-mandated layout —
  https://playwright.dev/docs/pom

## Code shape (product-neutral)
```ts
// common/routes/routes.widgets.ts — one table per module.
export const WidgetRoutes = {
  List:     'widgets',                       // no leading slash — relative to the base URL
  Create:   'widgets',
  GetById:  'widgets/{widgetId}',            // {placeholder} filled by fillRoute
  Update:   'widgets/{widgetId}',
  Activate: 'widgets/{widgetId}/activate',
  History:  'widgets/{widgetId}/history',
} as const;

export { fillRoute } from './fill-route';
```
```ts
// fillRoute replaces every {token} and fails loudly if one is left unfilled.
import { WidgetRoutes, fillRoute } from '../routes/routes.widgets';

const path = fillRoute(WidgetRoutes.GetById, { widgetId: 42 });   // → 'widgets/42'
const { res } = await api.get(path);
```

## Anti-patterns
- A raw path string in a spec (`api.get('widgets/' + id)`) — it dodges the table and the placeholder
  check, and drifts when the path changes.
- A **leading slash** (`'/widgets'`) — Playwright treats it as absolute from the host root, discarding
  the service's base path, and the symptom is a mystifying 404.
- Hand-interpolating ids into a template literal instead of `fillRoute`, so a missing id becomes the
  literal text `{widgetId}` in the URL.
- A base URL baked into a route constant — the host belongs to the profile, not the route table.

## Related standards
- `config-and-profiles.md` — supplies the base URL each route is relative to.
- `api-client.md` — the client that sends a filled route and attaches auth.
- `services.md` — services build and send routes so specs never touch a path directly.
