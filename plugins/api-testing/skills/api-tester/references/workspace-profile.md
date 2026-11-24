# Workspace profile — discover once, reuse everywhere

Every org-specific value these skills need (tracker org/project, boards, work-item fields, integration
partners, plans, brands, people's roles, code touchpoints) lives in **one local file in the user's own
project**, never in the plugin:

```
.claude/workspace-profile.json      # in the user's project; git-ignored; never committed to a public repo
```

The plugin ships the *method*; the profile supplies the *facts*. On the user's real tracker and codebase
the skills therefore produce exactly the output a hardcoded skill would, while the plugin itself names
nothing about any company.

## Step 0 (run at the start of every skill)

1. Read `.claude/workspace-profile.json` from the project root.
2. If it exists and has every key this skill needs, use it silently. Do not re-scan. A key listed in
   `noneFound` counts as present even though it is empty: discovery already looked and the user confirmed
   there is nothing to record.
3. If it is missing, or a key this skill needs is empty and not in `noneFound`, run **Discovery** below
   for the missing keys only.
4. Show the user a short summary of what was discovered and ask them to confirm or correct it.
   Nothing is written until they confirm.
5. Write (or merge into) the file. Check that `.claude/workspace-profile.json` is listed in the
   project's `.gitignore`; if it is not, offer to add it.
6. Never store secrets: no passwords, tokens, PATs, cookies or connection strings. Credentials are
   asked for at run time and kept out of the profile.

Refer to profile values by key in your reasoning (`variants.label`, `boards.delivery.areaPath`). In output,
always use the **resolved value** (for example the real board path), never the key.

## Schema

```jsonc
{
  "schemaVersion": 1,
  "discoveredAt": "2026-01-15",
  "product": {
    "name": "",                 // what the team calls the product in tickets and notes
    "modules": []               // top-level screens/areas, as named in the UI (Inbox, Contacts, Settings…)
  },
  "tracker": {
    "kind": "azure-devops",     // azure-devops | jira | github | linear | other
    "org": "",                  // org / site / workspace
    "project": "",              // project name
    "projectId": ""             // GUID or key, when the tracker has one
  },
  "boards": {
    "delivery": { "areaPath": "", "note": "sprint/feature work, story and regression bugs; release-note source" },
    "support":  { "areaPath": "", "note": "production defects and per-client support; omit from client notes by default" }
  },
  "workItemTypes": { "story": "User Story", "bug": "Bug", "defect": "Defect", "testCase": "Test Case" },
  "testPlan": { "planId": "", "suiteId": "", "note": "default Test Plan / Suite for new Test Cases; ask when empty" },
  "fields": {
    // per work-item type: reference name -> { "label", "typical", "values"[] }, sampled from real items
    "bug":    {},
    "defect": {}
  },
  "identity": { "displayName": "", "email": "" },  // who files and owns QA items; asked, never guessed
  "environments": ["QA", "Staging", "Production"],
  "variants": {
    "label": "",                // what the product calls its integration partners: "ERP", "POS", "PMS", "Carrier"…
    "values": []                // the partner names, in the casing the team uses (ALL-CAPS in titles if that's the house habit)
  },
  "plans": [],                  // subscription tiers / editions, if features are gated by plan
  "brands": [
    // one entry per client-facing brand of the same product (white-label/partner-facing brands included)
    { "id": "primary", "productName": "", "audience": "", "kbUrl": "", "webinarCta": "", "supportPointer": "", "renamedTerms": {} }
  ],
  "roles": {
    // workflow roles only: no personal names unless the user asks to store them
    "drafter": "QA / BA who writes the exhaustive technical draft",
    "editorialOwner": "owns client-facing copy and has final editorial say",
    "copyEditor": "presentation edits and approval of wording",
    "releaseOwner": "owns timing, plan/variant scoping and sign-off"
  },
  "repos": [],                  // repo names under the tracker project
  "codeTouchpoints": {},        // theme -> signature files/services/symbols, learned as harvests run
  "specDocs": { "path": "", "rulesFile": "" },     // behaviour/flow docs, if the team keeps them
  "conventions": {
    "titleHabits": "",          // observed title style: keyword casing, environment suffix, client bracket
    "tagHabits": "",            // which tags the team actually uses on each type, or "usually none"
    "postFixFields": []         // fields only filled after a fix (root cause, fixed-in…); leave empty on filing
  },
  "clientIdFormat": "",         // how a client/tenant is identified in titles, e.g. "Client Name [12345]"
  "variantIdParam": "",         // the route/query param that carries the tenant/partner id in APIs, if any
  "noneFound": []               // keys discovery searched and the user confirmed are empty, e.g. ["variants", "plans"]
}
```

Keys a skill does not need can stay empty. Add keys rather than overloading existing ones.

## Discovery (read-only, run once)

Use whatever tracker and code tools are connected. Discovery only **reads**; it never creates or edits
anything in the tracker or the repo.

**Tracker**
- List projects; if more than one, ask which one. Record `tracker.*`.
- One project can hold several products (area paths or repos named for different products). If it does,
  ask which product this profile is for, record `product.name`, and pick `boards.*` and `repos` under
  that product only, so a harvest or a field sample never mixes products.
- Sample the most recent ~100 work items (any state). Rank area paths by volume and by work-item type:
  the path dominated by stories and bugs is `boards.delivery`; the path dominated by production
  defects/support items is `boards.support`. Confirm both with the user.
- For each type the skill files (Bug, Defect, Test Case), read the type definition and ~20 recent items.
  Record every non-system field that is actually populated, with its typical value and the observed
  value set (`fields.<type>`). This is how org-specific custom fields are learned instead of shipped.
- Record the house title habits you observe (keyword casing, environment suffix, client-id bracket) in
  `conventions.titleHabits`, the tags actually used in `conventions.tagHabits`, fields that are only ever
  populated after a fix in `conventions.postFixFields`, and the client-id pattern in `clientIdFormat`.

**Codebase** (if a repo is available)
- Integration partners: search for enums, config maps, feature flags or folders that enumerate external
  platforms (`IntegrationType`, `Provider`, `Connector`, `Partner`, `*Type` enums, per-partner service
  folders). The collection name tells you `variants.label` (ERP, POS, PMS…); its members are
  `variants.values`.
- Plans/tiers: search for `plan`, `tier`, `edition`, `subscription`, `license`, `entitlement`, and
  feature gates keyed by them.
- Brands: look for more than one product name, logo set, theme, domain or app id selected by tenant or
  host (white-label). Each one is a `brands[]` entry; ask the user for KB URL, webinar CTA and support
  pointer per brand, and mark any you could not confirm as open.
- Modules: read the router/navigation definitions; record top-level areas in `product.modules`.
- Spec docs: look for a behaviour/rules doc set (`docs/`, `knowledge-base/`, `specs/`, `RULES.md`).

**Ask, don't guess**, for: the filer's identity, brand support pointers and links, and anything the scan
found ambiguous. Unknown stays empty and is surfaced as an open question when a skill needs it. When a
search finds nothing (no partners, no plans), say so in the summary; once the user
confirms, add the key to `noneFound` so later runs do not search again.

## Placeholders used in this plugin's examples

Examples in this plugin use obviously fictional values so nothing real is implied:
`PARTNER-A`, `PARTNER-B`, `PARTNER-C` for integration partners; `Starter / Growth / Scale` for plans;
`Product` and `Partner Edition` for brands; `Contoso Outdoor [10001]` for a client;
`#1001`-style ids; `learn.example.com` for a knowledge base. Replace them with profile values at run time.
