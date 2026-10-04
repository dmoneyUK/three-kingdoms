# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`  
Authority: this file plus `docs/AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md`.  
History: `docs/AUTONOMOUS_UI_ROADMAP.md`.

## Latest result — UX2.0VIS-12M: Deduplicate Proven Source Metadata

Status: `IMPLEMENTED — CI PENDING`

For non-Dying stages, the generic SOURCE row is omitted only when the typed
Stage source ID exactly matches the rendered Medium Source or Hero Focus source.
FOCUS/SCOPE and independent context remain; missing or unrendered source
presentation keeps the SOURCE fallback. Existing Dying deduplication is
unchanged. No server, projection, or gameplay changes.

Focused validation: 24/24 VIS-12M and short-portrait browser cases passed;
targeted ESLint on `app/page.tsx` and `tests/browser/ui19.spec.mjs` passed. No
full local test/build/lint. Exact revision's GitHub Actions remains unverified
until the next task-boundary checkpoint.

## Current task — UX2.0VIS-12M

Implementation, regression coverage, and this handoff are included in the
`ux-v2` delivery. CI remains pending; do not claim green until the exact
revision is confirmed.
