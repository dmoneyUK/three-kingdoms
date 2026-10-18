# Current Handover

Branch: `ux-v2`

## Latest result

- **BCP-1-F2 production proof audit — COMPLETE; implementation not started.** Live Worker `54bcb79c-82c6-4406-bad6-4ab376ff4336` reached an authentic Harvest Negation window. Six projections (host, three TEST SWITCH seats, two independent viewers) exposed the same six-card public reveal group and exact typed `PROVEN` Harvest root linkage; each kept `pendingHarvest` null during Negation. At 390×700 and 440×766 the current client showed the root/H4 announcement but no public pool. The safe path is to carry the exact reveal event ID through the nested continuation and render a separate read-only pool only when the public root/reveal proof matches. Preserve no early reveal, no private selection and existing actor authority.
- **Latest design reviewed:** remote `docs/UX2-refine.md` at `7be342124b7d3c5a88e1a298ffa901b709189ff5`; reviewed §§10.17.1.1–10.17.1.2, 10.17.4.1 and 10.17.5. Keep accepted H4 text and Q1–Q4 pause. Preserve pre-existing CSS edits and untracked `HANDOVER 2.md`–`HANDOVER 5.md` plus `tests/browser/em01-production-repro.tmp.spec.mjs`.

## Exactly one current bounded task

**`UX2-10.17.5.1-INS5-F1-COMPACT-WRAPPED-HERO-INSPECTOR` — in progress.** The compact Inspector must wrap long player/Hero/skill labels without clipping or overlapping its close control, Hero body, public zones or Local Player Dock. Keep public data and the existing skill/card detail actions unchanged. Current changes in `app/sequence-overrides.css` preserve natural header height, allow Hero and vertical skill labels to wrap, and retain scrollable compact skill lists; a focused fixture regression covers the 390×700 six-seat long-name case. Full focused Inspector browser suite: 44 passed; `npx eslint tests/browser/opponent-inspect-hero-focus.spec.mjs` passed; `node --import tsx --test tests/room-safety-render.test.mjs` passed 20/20. Local build/Worker startup stalled under Node `v26.3.0`; the fixture browser run used a no-op readiness endpoint and made no API/gameplay requests. Exact-SHA CI/deploy remains required. Mark implementation **PENDING USER REVIEW**, not accepted.

Resume after this slice with **BCP-1-F2 read-only Harvest pool implementation**, using only the proven public root/reveal IDs and retaining the Negation-phase `pendingHarvest: null` guard. Then continue BCP-2, BCP-3, HUD-4, and remaining approved UX2 work in separate slices.
