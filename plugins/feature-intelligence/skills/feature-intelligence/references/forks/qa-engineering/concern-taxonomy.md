<!-- forked-from: qa-engineering/skills/story-intelligence/references/concern-taxonomy.md @ 8d1cf6e; forked-on: 2026-11-04; local-changes: labels mapped to evidence statuses; profile instead of house-profile; output goes to FND, Q and RISK nodes through fi add instead of a context file -->
# Concern and gap taxonomy

The checklist the analyst walks over the Feature Model. Walk every category; surface what applies and give
**each item an evidence status** (`confirmed`, `inferred`, `assumed` or `open`). A category that genuinely does
not apply is named and dismissed in one line, "not applicable, because ...", so the reader sees a deliberate
pass, not an omission. **Never invent a requirement to fill a category**: if the sources are silent, the item
is `assumed` or an `open` question, never `confirmed`.

> Examples use generic placeholders (Orders, widgets, User, an epic). Use the real modules, roles and nouns of
> the feature under analysis, from the profile's `product.domainNouns`, never hard-coded here.

## 1. Ambiguities

- Terms used loosely or two ways ("archive" vs "delete"; "active" defined where?).
- Pronouns or subjects with no clear referent ("it updates the record": which record?).
- Acceptance criteria that can be read more than one way.
- Numbers without units, ranges without bounds, "fast / soon / recent" with no definition.

## 2. Missing requirements, acceptance criteria, validation and error handling

- Behaviour implied by the narrative but absent from the acceptance criteria.
- Input fields with no stated validation (format, length, required-ness, allowed values).
- Error paths undefined: what the user sees and the system does on invalid input, a failed save, a timeout,
  a conflict.
- Empty, zero, and "nothing selected" states unspecified.
- Success criteria that are not observable ("works correctly") and so are untestable.

## 3. Permissions and security

- Who may perform the action; which roles are allowed and which denied (each denial is a negative case).
- Whether a lower-privilege user can reach it by URL or API even if the UI hides it.
- Data exposure: does the change surface data a role should not see; is anything sensitive logged, returned in
  an error, or put in a URL.
- Tenant or account isolation: can one account read or affect another's data.
- Authentication assumptions (token required, session expiry, re-authentication on a sensitive action).

## 4. Integration

- Every API, service or external system the change calls or is called by.
- The contract at each boundary: request and response shape, status codes, required fields, versioning.
- Failure behaviour of a dependency: slow, down, partial, error, rate-limited: what the feature does.
- Idempotency and retries across the boundary; duplicate side effects.
- Ordering and eventual consistency where a downstream system updates asynchronously.

## 5. Regression

- Existing flows that share code, state or a screen with the change.
- Shared components or services this touches that other features also depend on.
- Historically fragile areas near this one (prior linked bugs, items reopened in the history).
- Default or global settings the change alters that ripple elsewhere.

## 6. Mobile and responsive

*(Where a UI is involved and the product has a mobile or responsive surface.)*

- Layout at small and large breakpoints; touch targets; orientation.
- Mobile-specific flows (native app vs responsive web) if the product ships both.
- Offline or poor-connectivity behaviour where relevant.
- Platform differences (iOS and Android, browser engines) if a mobile surface is in scope.

## 7. Edge cases

- Boundaries: min, max, just over, just under, zero, negative, very large.
- Empty collections, a single item, the maximum collection size, pagination edges.
- Concurrency: two users editing the same record; double submit; a race on create.
- Duplicates and uniqueness collisions.
- Special characters, Unicode, injection-shaped input, very long strings.
- Time: time zones, DST, expiry boundaries, "now" at midnight, future and past dates.

## 8. Data and state

- Migration or backfill the change requires; what happens to existing records.
- Default values for new fields; nullability; what rows created before the change show.
- Soft vs hard delete; whether deleted data still appears in lists, reports or counts.
- Stale or cached state; when caches invalidate; read-after-write consistency.
- State machine: which transitions are allowed, which are illegal, what happens on an illegal one.

## 9. Backward compatibility

- Older clients or mobile app versions calling a changed API.
- Saved data, saved filters, bookmarks, or in-flight records created before the change.
- API contract changes: added, removed or renamed fields; changed types; changed error codes.
- Feature flags and staged rollout: behaviour with the flag on and off, and mid-rollout.

## 10. Risks the change introduces

- New failure modes the feature itself creates (a new async job, a new external call, a new write).
- Performance: an added query or call on a hot path; N+1; a large payload; a new report over big data.
- Security surface the change adds (a new endpoint, a new upload, a new parameter).
- Operational: new configuration, a new secret, a new dependency to deploy or monitor.

## How to use this list

1. Go category by category; for each, write the concrete concern **for this feature**, with its evidence status.
2. Prefer a sharp `open` question over a vague worry: phrase it so Product, BA or Dev can answer it.
3. Keep the highest-risk items first within each category.
4. Write each item to the model through `fi add`: a missing or unclear point is a `Q` node with `blocks` links to
   the nodes it holds up; a defect in what the sources say is an `FND` node; a risk is a `RISK` node.
