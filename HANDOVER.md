# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

## Latest result / CI

`UX2.4D-P1-REAL-ROOM-CREATION-BROWSER-PROOF-01` now has a clean server-backed
browser path from Host Game through the product `POST /api/rooms` route, server
test-seat creation, start, authoritative hero choices, and the real `.game-shell`
with server-generated CurrentAction/revision. It uses neither the test seed
route nor handcrafted action/presentation data. The focused browser spec passed
1/1; syntax, targeted ESLint, and `git diff --check` passed. The Composure
response regression now waits for CurrentAction-driven skill disablement before
asserting there is no duplicate Action Row entry.

Exact pre-commit remote HEAD `544bc932e4a0a989d6a050d53ffae35599c86445` passed
Actions run `37786601383`, attempt 2, all five jobs successful. Attempt 1 had a
transient Browser Worker exit followed by connection-refused errors; the same-
SHA retry passed, and local shard 1 passed 408/408. The new task commit's CI is
pending after push. Reviewer acceptance is not claimed.

## Design checkpoint

Re-fetched `origin/ux-v2`; `docs/UX2-refine.md` remains blob
`7feb8af937b6407f3f33c3959325db8d3f188cf4`. Re-reviewed §§4C.1–4C.29 and all
§4D tasks P1–P5 plus the Section 6 gate. Section 6 remains deferred until the
active pre-§5 requirements close.

## Current / next task

`UX2.REFINE-UNIFIED-TARGET-CARD-MODAL-REAL-GAME-P2-01` — make authoritative
Steal, Burning Bridge/Dismantle, Retaliation, Frost Sword, and Kirin Bow
decisions reach their approved shared modal in real gameplay without an
unrelated Hero Focus/Inspect/Preview gate. Preserve CurrentAction legality,
anonymous Hand privacy, public face-up zones, effect-specific copy/CTA, stale
selection clearing, and prove all five server-generated paths plus a mixed-zone
case do not fall back to the legacy picker. Preserve the existing Fanjian/§6
uncommitted work; do not include it in pre-§5 commits.
