# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `USER-DIRECTED UX REFINEMENT`

## Latest result

- `25a2f6512113e2189f3f79939b0f8776bd6159ed` adds Duel's proof-backed centre reveal and actor-seat parking: the same root scope persists from the Negation opportunity into exchange, committed Attack events queue individually, and each duelist keeps only their latest card with an earlier-Attack count. The presenter remains read-only and uses the existing server proof and `CurrentAction` contracts. Run [`38473860996`](https://github.com/dmoneyUK/three-kingdoms/actions/runs/38473860996) passed Browser smoke, API tests, Lint/fast and deploy. Production `/` returned HTTP 200 and `/api/health` returned `{"ok":true,"worker":"available"}`. No local automated tests were run; awaiting the user's manual visual check.

## Design checkpoint

Reviewed `docs/UX2-refine.md` at `83ad06cb33c5e959f2d76b5072b0848c17698805` (blob `b3e3d3642534ae97e8aa0c356c48d669f493ac9a`). It replaces relationship graphs with one centre reveal and actor-seat thumbnails. The design document is unchanged.

## Current boundary

`UX2-CENTRE-REVEAL-SEAT-CARDS-02 — Duel slice` is deployed; the direct “可以继续” authorized this extension before Attack/Dodge visual acceptance. Current stop: the user manually checks Duel root reveal, each committed Attack reveal/parking, latest-per-duelist cards and earlier count. Do not continue into Negation response animation or Group/AOE until the user reviews this slice.
