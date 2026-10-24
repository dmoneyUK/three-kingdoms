# HANDOVER

Target branch: `ux-v2` (working branch: `codex/ux2-equilibrium-phone`). Latest remote design reviewed: `docs/UX2-refine.md` at `a44e575bdb90011c963b89a76cba2dd7212476fd`; §10.9.1–10.9.3, especially the Equilibrium contract in §10.9.2. Phone-only validation; maximum 8 players.

## Current task: `UX2-10.9-W3-EQUILIBRIUM-COST-FRAME`

Implement Sun Quan's public Equilibrium COST frame using only exact committed Hand/Equipment costs already proven by `sun_quan_zhiheng`. Show every genuine paid CardFace with Sun Quan as activation owner and true material owner/zone; never expose private replacement-draw identities. Preserve equipment-loss continuations and W2 framing/parking.

**Status:** IN PROGRESS — proof-gated Equilibrium COST frame selection, shared W2 rendering and the frame-sized announcement anchor are implemented locally. The latest design explicitly says Equilibrium remains unfinished and W3 is not delivered as a six-skill family; this work is not user-accepted.

**Local validation:** `npm run build` passed. Authenticated Worker/D1 mobile test passed with four viewers at 390×844, mixed Hand/Equipment costs, exact public CardFaces, owner-only replacement draws and true actor parking. Adjacent W3 cost-frame plus Deflection regressions passed 6/6. Focused ESLint: 0 errors, 16 existing Hook warnings; `git diff --check` passed. The regression found and fixed Equilibrium announcement placement against the full frame.

**Delivery:** Exact-SHA CI and Worker deployment pending. After success, mark `IMPLEMENTED / DEPLOYED — PENDING USER PHONE REVIEW`; never self-accept.

**Resume point:** Verify latest `origin/ux-v2` and current Actions health before the first source commit. Continue from the existing Equilibrium COST proof and shared W3 renderer; after closure, reread the latest remote design and select exactly one next small authorized task.
