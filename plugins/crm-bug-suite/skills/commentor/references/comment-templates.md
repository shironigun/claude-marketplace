# Comment templates (the team's voice)

Post by writing the HTML to `System.History` via `update_work_item`. Always get approval first. Replace `GUID` with the person's identity GUID (from the work item's AssignedTo/CreatedBy or `get_me`); fall back to plain `@Name` text if unknown.

Mention anchor:
```html
<a href="#" data-vss-mention="version:2.0,GUID">@Name</a>
```

## 1. Status / verification (closing the loop)

```html
<div><b>Status:</b> Tested and resolved. The fix is verified through QA testing on <ENV>.</div>
<div><b>CC:</b> <a href="#" data-vss-mention="version:2.0,GUID">@Dev Owner</a> <a href="#" data-vss-mention="version:2.0,GUID">@Stakeholder</a></div>
```

## 2. Root-cause analysis (RCA)

```html
<div><b>Bug Details:</b> This bug has been inspected. The issue happened because <one-line cause naming the exact config key / client ID / error code>.</div>
<div><ul>
  <li>Due to this, <consequence, e.g. the token issuer changed and Acme CRM got a 401 Unauthorized error>.</li>
  <li>We have now <corrective action>, redeployed, and verified the fix through QA testing.</li>
</ul></div>
<div><b>Status:</b> Tested and resolved.</div>
<div><b>CC:</b> @… @…</div>
```

## 3. Finding / investigation (production / auth / API)

```html
<div><b>FINDINGS</b></div>
<ol>
  <li><finding 1 — what works, with attachment ref></li>
  <li><finding 2 — what fails></li>
  <li><finding 3 — open question / who to check with></li>
</ol>
<div>Payload / response for reference:</div>
<div><pre><JSON or error body></pre></div>
<div>@… @…</div>
```

## 4. Hand-off / needs-info

```html
<div><a href="#" data-vss-mention="version:2.0,GUID">@Dev Owner</a> please check <specific area>. Repro on <client ID / env>; <error code> observed. Credentials are in the System Info section.</div>
```

## 5. Cross-team escalation (DMS-E / DMS-A feeds, DMS-D/SSO)

Process-escalation tone — state ownership and the approved path:
```html
<div><a href="#" data-vss-mention="version:2.0,GUID">@Owner</a> DMS-A can only help sync between DMS-A and DMS-E as far as DMS-D is concerned. If there is any issue with feeds, please involve the DMS-E team and have them contact us — that's the approved process. Unless it's the Customer Feed (Acme CRM → DMS-A) or the Acme CRM embedded browser in DMS-A, submit that issue to <a href="#" data-vss-mention="version:2.0,GUID">@Owner</a>.</div>
<div>@… @… @…</div>
```

## Voice checklist

- Bold labels (`Bug Details:`, `Status:`, `FINDINGS`, `CC:`).
- Root cause as bullets/numbered list, not prose.
- Name exact config keys, URLs, client IDs, branch names, error codes.
- Verification language: "verified the fix through QA testing", "Tested and resolved."
- CC the dev owner + cross-team stakeholders at the end.
- No emojis, no greetings, no sign-offs.
