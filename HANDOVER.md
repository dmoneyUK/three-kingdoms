# HANDOVER — Current Task Only

Repository: `dmoneyUK/three-kingdoms` · target: `ux-v2`
Design authority: `docs/UX2-refine.md` §10.25.3, latest owner correction (2026-10-31 09:01 UTC).

## Current bounded task — R6-ARCH-01 PAC timer width + fact-only H4 correction

**Status: IN PROGRESS — CORRECTION REQUIRED.** The owner accepted R6-ARCH-02 and rejected two ARCH-01 behaviors: PAC narrows beside the countdown, and H4 appends phase/next-response guidance. Implement only the approved correction in §10.25.3; then stop for owner iPhone re-review. Preserve accepted ARCH-02, gameplay rules, Negation timing, H4 fixed anchor/overlay and event proof.

### Starting point and limits

- Synced clean worktree to `origin/ux-v2` at docs revision `c2fbc7de950325f45b5dfda7bcdad7504708f95d`; deployed source ancestor `11857f230f4118aa93c32234d818a5b4f08ee453` remains the latest code SHA. Primary checkout is separate and untouched.
- Last exact source workflow [41162137191](https://github.com/dmoneyUK/three-kingdoms/actions/runs/41162137191) succeeded. The correction is implemented locally and not yet committed or pushed.
- Local UI/browser validation cap: five minutes total for this bounded task. Prefer focused unit/API/geometry tests; at most one existing authenticated 440px browser case if needed. No multi-viewport/player matrix.

### Current execution log

- **2026-10-31 09:16 UTC — implementation:** Added PAC-only timer exclusion to `publicCorridorWidth`; PAC still uses measured Seat bounds and actual candidate collision checks, while H4 retains the default timer reservation. Compacted phone countdowns to 40×38px at the right edge; moved them vertically for widths ≤437px and side-column seats. Removed phase-derived H4 suffixes from shared, Duel, group and static copy paths; committed public Negation narration now takes precedence. No server/gameplay or accepted ARCH-02 changes.
- **2026-10-31 09:16 UTC — focused checks:** `tests/public-card-announcement.test.mjs` passed 21/21; focused `tests/api/public-activity.test.mjs` private-choice/H4 case passed 1/1; `git diff --check` passed. Target ESLint rerun passed with 0 errors and 13 existing Hook-dependency warnings. First direct `node --test` attempt failed because Node does not load `.tsx`; reran with the repository's `--import tsx` loader. First ESLint run found 3 unused symbols introduced by this edit; removed them, then the rerun passed.
- **2026-10-31 09:18 UTC — final local checks:** repeated focused announcement tests (21/21), the focused API private-choice/H4 test (1/1), target ESLint (0 errors; 13 existing Hook-dependency warnings) and `git diff --check` all passed.
- **2026-10-31 09:18 UTC — build:** `npm run build` passed. Build emitted existing-size/API-classification advisories (client chunk >500 kB; dynamic API routes could not be statically classified), no build error.
- Browser/device check: not run locally. No claim of measured production DOMRects or owner phone acceptance.

### Required result

1. Keep centered PAC width independent of countdown; target 340px at a safe 440px four-player table (320–340px only when actual Seats/protected bounds require). Move/compact the clock to a readable far-right nonoverlapping position, or vertically into a safe right-side slot. Use PAC's actual final rectangle for collision checks.
2. H4 reports only committed public facts. Remove phase/next-step suffixes from Duel and static fallback variants. Use proven Negation cancel/restore narration when committed facts establish it; otherwise retain only the still-valid proven event. PAC owns future guidance; Console owns private choice.
3. Keep ARCH-02 accepted behavior and all existing gameplay/legal/privacy authority unchanged. Record exact build/test results, source SHA, exact-SHA CI/deployment and remaining owner-phone checks here; do not mark ARCH-01 accepted.
