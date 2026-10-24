# HANDOVER

Target branch: `ux-v2` (working branch: `codex/ux2-equilibrium-phone`). Phone-only validation; maximum 8 players.

## Latest result

**`UX2-10.10.3.1-T3-F1-STEAL-DISMANTLE-REAL-ROOT-PARKING` — IMPLEMENTED / DEPLOYED, PENDING USER iPHONE RE-REVIEW.** Source/release SHA `ac757df8bfb1e74ca4a6175afd33210a4386c18e`; exact-SHA [Actions `40123159826`](https://github.com/dmoneyUK/three-kingdoms/actions/runs/40123159826) passed lint/fast, API, browser smoke, D1 migration, Worker deployment and production smoke. Worker `6725bcf8-af93-44c8-aa4f-5645214d50bd`; direct production `/` and `/api/health` returned HTTP 200, health `{"ok":true,"worker":"available"}`. Focused authenticated Worker/D1 phone-browser regressions passed 3/3 across 4/6/8 seats and 390×700, 390×844, 440×894, 480×900. The genuine root remained within 6 CSS px of its true author Seat/Dock; missing-anchor suppression/retry, root continuity through Negation/counter and actor-only legal target choice were verified. No user acceptance is claimed.

**Latest design reviewed:** `docs/UX2-refine.md` upstream revision `2d257592390603813814719771af2d8222ee98b7`, including the newly approved H2-G3 F1/F2 corrections. Those larger geometry tasks remain compatible and are not part of the current task. The design's §10.10.3.1 specifically sequences T3-F1 before the independent T2-F1 copy correction.

## Exactly one current bounded task

**`UX2-10.10.3.1-T2-F1-STEAL-SETTLEMENT-COPY` — P1, NEXT.** Change only the successful Steal public displayed sentence per §10.10.3.1: for a previously public Judgement card say `A took [card name] ([rank/suit]) from B.`; for an actually hidden Hand card say `A took one card from B.`; for public Equipment use its proven card name. Keep source/destination proof and DOM/ARIA debug metadata intact, preserve hidden-Hand privacy and the existing safe fallback, and leave Burning Bridges copy and all gameplay rules unchanged. Add focused authenticated proof for Hand/Equipment/Judgement, Negated/no-settlement, four-viewer public consistency and hidden-card privacy. Use focused phone browser coverage, then exact-SHA Actions, deployment and production smoke. Final status: **IMPLEMENTED / DEPLOYED — PENDING USER iPHONE RE-REVIEW**.
