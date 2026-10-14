# WTK UX2 — Current Handoff

Branch: `ux-v2`
Latest design reviewed: `docs/UX2-refine.md`, blob `bd3ff5afdf3722d0cdca1031407924ebe36233e8`
Latest user decision: §8.1 viewer-relative Duel layout passed validation.

## Latest delivered result

§8.5 D1 shipped in `f6729775f0953e31367f5abf96b2fcfca6ddaecc`. Focused browser coverage passed 12/12 across 390×844, 440×894, 480×900 and 1440×900, including A/2/10/Q/K, red/black suits and 1/2/4 equipment cards; build passed. Actions run `38583881507` passed API, lint/fast, browser smoke and deploy. `/api/health` returned `{"ok":true,"worker":"available"}`. Local targeted ESLint OOMed under Node 26 at default and 4GB heap; CI lint passed. Aggregate user/Reviewer review remains pending.

Known adjacent diagnostic: a separate Judgement navigation browser check observed an empty accessible name while its Lightning reveal was hidden by a pending presentation event. D1 did not alter that path; consider its timing only within D2's Judgement switching coverage.

## Current task

§8.5 D2 — unified titled skill/equipment/Judgement details. Show the canonical skill name above its description; retain card names/rules; remove visible nested Back controls; switch details directly in the same Inspector when a skill, Equipment or public Judgement card is tapped. Keep the inspected Hero, target selection, Hand, legal controls, timer and focus stable. Test Captivating → Frost Sword → another Equipment → Deflection and reverse, Hua Tuo's long skill, 4/6/8 seats, touch/focus/Escape, scrolling, anonymous Hand privacy and no gameplay requests.

Next: review the current remote design revision and D2 code/tests, implement this bounded Inspector concern, run its focused regression/build checks, then update the design status and HANDOVER. Continue autonomously after D2; do not claim Reviewer acceptance.
