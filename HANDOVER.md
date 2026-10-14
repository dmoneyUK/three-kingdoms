# WTK UX2 — Current Handoff

Branch: `ux-v2`

Latest reviewed design: `docs/UX2-refine.md`, blob `20e41dd7e18a31dfd115871ad12db8fea4bb27d3`.

Latest user decision: §8.1 Duel layout is user-validated; continue autonomously. Reviewer acceptance remains separate.

## Latest result

§10.5 Gate E1 public Deflection proof is delivered pending aggregate review. Implementation: `5934a4b9d800d331d59bc8372cc0ead236a480c4`; a follow-up corrected one stale projection expectation: `01596218e03d225e99bcd47ceb7cac1d65177d4b`. The focused `node --import tsx --test tests/presentation-client.test.mjs` passed 60/60. Actions run `38589559366` passed Lint/fast, API, browser smoke, and deploy; production `/api/health` returned `{"ok":true,"worker":"available"}`. The earlier run `38589052415` failed only because the expected client-view fixture omitted the new empty field; the focused repair passed before push. No real-browser Deflection screenshots were captured in E1.

## Current task — §10.5 Gate E2: Deflection centre reveal and Seat/Dock parking

Use the E1 typed public proof to present the genuine discarded cost card with a `DEFLECTION` label: one centre reveal, then park that same physical card at Da Qiao's actual Seat/Dock. Suppress the competing generic discard animation only for this uniquely proven cost event. Show the server-proven redirected target; never duplicate the original Attack or fabricate a response. Keep private choices, timers, legal controls, equipment effects, card conservation, reconnect and viewer-specific seat placement intact.

**Acceptance:** extend the real gameplay browser path for attacker, Da Qiao, replacement and observer; verify actual proof IDs and the centre-to-seat motion, no duplicate card, correct Dodge/damage outcomes and no private leak. Capture evidence at 390×844, ~440×894, 480×900, desktop, and 6/8-seat layouts. Run focused API/browser coverage and rely on the exact-SHA CI/deploy gate. Do not change game rules or other Hero skills.

**Boundary:** Gate E2 only. Do not start another Hero family or AOE in this handoff. Report delivery as pending aggregate visual review; only the human Reviewer declares acceptance.
