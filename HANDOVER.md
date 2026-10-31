# HANDOVER — Current Task Only

Repository: `dmoneyUK/three-kingdoms` · target: `ux-v2`
Design authority: `docs/UX2-refine.md` §10.25.3, latest owner correction (2026-10-31 09:01 UTC).

## Current bounded task — R6-ARCH-01 PAC timer width + fact-only H4 correction

**Status: IMPLEMENTED / DEPLOYED — PENDING OWNER iPHONE RE-REVIEW.** The owner accepted R6-ARCH-02 and requested two ARCH-01 corrections: keep PAC from narrowing beside the countdown, and remove phase/next-response guidance from H4. Both changes are deployed below. Preserve accepted ARCH-02, gameplay rules, Negation timing, H4 fixed anchor/overlay and event proof. Do not mark ARCH-01 accepted.

### Starting point and limits

- Source commit [`461f5dc9bf8b2d79be2a90955a76b2cbcc44a35f`](https://github.com/dmoneyUK/three-kingdoms/commit/461f5dc9bf8b2d79be2a90955a76b2cbcc44a35f) is on `ux-v2`. Exact-SHA [GitHub Actions run 41188188356](https://github.com/dmoneyUK/three-kingdoms/actions/runs/41188188356) succeeded: lint/fast tests, API tests, browser startup/room smoke, D1 migration, Worker deployment and production smoke all passed.
- Cloudflare Worker version: `61da9222-62a4-4ecc-a3b8-bc04be5ce61d`. At 2026-10-31 09:24 UTC, production `/` returned HTTP 200 and `/api/health` returned HTTP 200 with `{"ok":true,"worker":"available"}`. The coding worktree is isolated; the primary checkout remains untouched.
- Local UI/browser validation cap: five minutes total for this bounded task. Prefer focused unit/API/geometry tests; at most one existing authenticated 440px browser case if needed. No multi-viewport/player matrix.

### Current execution log

- **2026-10-31 09:16 UTC — implementation:** Added PAC-only timer exclusion to `publicCorridorWidth`; PAC still uses measured Seat bounds and actual candidate collision checks, while H4 retains the default timer reservation. Compacted phone countdowns to 40×38px at the right edge; moved them vertically for widths ≤437px and side-column seats. Removed phase-derived H4 suffixes from shared, Duel, group and static copy paths; committed public Negation narration now takes precedence. No server/gameplay or accepted ARCH-02 changes.
- **2026-10-31 09:16 UTC — focused checks:** `tests/public-card-announcement.test.mjs` passed 21/21; focused `tests/api/public-activity.test.mjs` private-choice/H4 case passed 1/1; `git diff --check` passed. Target ESLint rerun passed with 0 errors and 13 existing Hook-dependency warnings. First direct `node --test` attempt failed because Node does not load `.tsx`; reran with the repository's `--import tsx` loader. First ESLint run found 3 unused symbols introduced by this edit; removed them, then the rerun passed.
- **2026-10-31 09:18 UTC — final local checks:** repeated focused announcement tests (21/21), the focused API private-choice/H4 test (1/1), target ESLint (0 errors; 13 existing Hook-dependency warnings) and `git diff --check` all passed.
- **2026-10-31 09:18 UTC — build:** `npm run build` passed. Build emitted existing-size/API-classification advisories (client chunk >500 kB; dynamic API routes could not be statically classified), no build error.
- **2026-10-31 09:24 UTC — delivery:** committed and pushed source SHA `461f5dc9bf8b2d79be2a90955a76b2cbcc44a35f`; exact-SHA Actions run 41188188356 passed all jobs and deployed Worker version `61da9222-62a4-4ecc-a3b8-bc04be5ce61d`; live root and health endpoint both returned HTTP 200. No local mobile/browser check was run; owner iPhone re-review remains pending.
- Browser/device check: not run locally. No claim of measured production DOMRects or owner phone acceptance.

### Required result

1. Keep centered PAC width independent of countdown; target 340px at a safe 440px four-player table (320–340px only when actual Seats/protected bounds require). Move/compact the clock to a readable far-right nonoverlapping position, or vertically into a safe right-side slot. Use PAC's actual final rectangle for collision checks.
2. H4 reports only committed public facts. Remove phase/next-step suffixes from Duel and static fallback variants. Use proven Negation cancel/restore narration when committed facts establish it; otherwise retain only the still-valid proven event. PAC owns future guidance; Console owns private choice.
3. Keep ARCH-02 accepted behavior and all existing gameplay/legal/privacy authority unchanged. Record exact build/test results, source SHA, exact-SHA CI/deployment and remaining owner-phone checks here; do not mark ARCH-01 accepted.
