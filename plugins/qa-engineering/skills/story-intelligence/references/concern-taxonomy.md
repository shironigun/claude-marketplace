# Concern / Gap Taxonomy

The checklist `story-intelligence` scans a story against. Walk every category; surface what applies and
**label each item** Confirmed / Inferred / Assumption / Gap-or-Question. A category that genuinely does
not apply is named and dismissed in one line — an explicit "not applicable, because …" — so the QA sees
a deliberate pass, not an omission. **Never invent a requirement to fill a category**: if the story is
silent, the item is an Assumption or a Gap-or-Question, not a Confirmed fact.

> Examples use generic placeholders (Orders, widgets, User, an epic). Use the real modules, roles and
> nouns of the story under test — from the house-profile, never hard-coded here.

## 1. Ambiguities

- Terms used loosely or two ways ("archive" vs "delete"; "active" defined where?).
- Pronouns/subjects with no clear referent ("it updates the record" — which record?).
- Acceptance criteria that can be read more than one way.
- Numbers without units, ranges without bounds, "fast / soon / recent" with no definition.

## 2. Missing requirements / AC / validation / error handling

- Behaviour implied by the narrative but absent from the AC.
- Input fields with no stated validation (format, length, required-ness, allowed values).
- Error paths undefined: what the user sees / the system does on invalid input, a failed save, a
  timeout, a conflict.
- Empty, zero, and "nothing selected" states unspecified.
- Success criteria that are not observable ("works correctly") and so are untestable.

## 3. Permissions / security

- Who may perform the action; which roles are allowed vs denied (each denial = a negative case).
- Whether a lower-privilege user can reach it by URL/API even if the UI hides it.
- Data exposure: does the change surface data a role should not see; is anything sensitive logged,
  returned in an error, or put in a URL.
- Tenant/account isolation: can one account read or affect another's data.
- Authentication assumptions (token required, session expiry, re-auth on sensitive action).

## 4. Integration

- Every API / service / external system (including any DMS or partner integration the house-profile
  names) the change calls or is called by.
- The contract at each boundary: request/response shape, status codes, required fields, versioning.
- Failure behaviour of a dependency: slow, down, partial, error, rate-limited — what the feature does.
- Idempotency and retries across the boundary; duplicate side-effects.
- Ordering / eventual consistency where a downstream system updates asynchronously.

## 5. Regression

- Existing flows that share code, state, or a screen with the change.
- Shared components/services this touches that other features also depend on.
- Historically fragile areas near this one (prior linked bugs, reopened items from history).
- Default/global settings the change alters that ripple elsewhere.

## 6. Mobile / responsive

*(Where a UI is involved and the product has a mobile/responsive surface.)*

- Layout at small/large breakpoints; touch targets; orientation.
- Mobile-specific flows (native app vs responsive web) if the product ships both.
- Offline / poor-connectivity behaviour where relevant.
- Platform differences (iOS/Android, browser engines) if a mobile surface is in scope.

## 7. Edge cases

- Boundaries: min, max, just-over, just-under, zero, negative, very large.
- Empty collections, single item, maximum collection size, pagination edges.
- Concurrency: two users editing the same record; double-submit; race on create.
- Duplicates and uniqueness collisions.
- Special characters, Unicode, injection-shaped input, very long strings.
- Time: time zones, DST, expiry boundaries, "now" at midnight, future/past dates.

## 8. Data / state

- Migration or backfill the change requires; what happens to existing records.
- Default values for new fields; nullability; what pre-change rows show.
- Soft vs hard delete; whether deleted data still appears in lists, reports, or counts.
- Stale/cached state; when caches invalidate; read-after-write consistency.
- State machine: which transitions are allowed, which are illegal, what happens on an illegal one.

## 9. Backward-compatibility

- Older clients / mobile app versions calling a changed API.
- Saved data, saved filters, bookmarks, or in-flight records created before the change.
- API contract changes: added/removed/renamed fields; changed types; changed error codes.
- Feature flags / staged rollout: behaviour with the flag on vs off, and mid-rollout.

## 10. Risks the change introduces

- New failure modes the feature itself creates (a new async job, a new external call, a new write).
- Performance: an added query/call on a hot path; N+1; a large payload; a new report over big data.
- Security surface the change adds (a new endpoint, a new upload, a new parameter).
- Operational: new configuration, new secret, new dependency to deploy or monitor.

## How to use this list

1. Go category by category; for each, write the concrete concern **for this story**, labeled.
2. Prefer a sharp **Gap-or-Question** over a vague worry — phrase it so Product/BA/Dev can answer it.
3. Keep the highest-risk items first within each category.
4. Roll the Gap-or-Question items up into the brief's **Questions / Gaps** and the gate's N count; roll
   the risk items into the brief's **Risks** and the `review.risks[]` slice.
