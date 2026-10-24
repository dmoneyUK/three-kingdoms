# HANDOVER

Target branch: `ux-v2` (working branch: `codex/ux2-equilibrium-phone`). Latest remote design reviewed: `docs/UX2-refine.md` at `a44e575bdb90011c963b89a76cba2dd7212476fd`; §10.9.1–10.9.3, especially the Equilibrium contract in §10.9.2. Phone-only validation; maximum 8 players.

## Current task: `UX2-10.9-W3-EQUILIBRIUM-COST-FRAME`

Implement Sun Quan's public Equilibrium COST frame using only exact committed Hand/Equipment costs already proven by `sun_quan_zhiheng`. Show every genuine paid CardFace with Sun Quan as activation owner and true material owner/zone; never expose private replacement-draw identities. Preserve equipment-loss continuations and W2 framing/parking.

**Status:** IN PROGRESS — the proof-gated Equilibrium COST frame selection and shared W2 rendering path are being added in `app/page.tsx`. The focused authenticated four-viewer phone regression, exact-SHA CI and deployment are still pending. The latest design explicitly says Equilibrium remains unfinished and W3 is not delivered as a six-skill family; no user acceptance is claimed.

**Validation / delivery:** Focused authenticated mobile Worker/D1 gameplay with four viewers at phone sizes only, including mixed Hand/Equipment costs, public matching CardFaces, private replacement draws, and correct parking; run the relevant focused API/browser checks and normal exact-SHA CI/deployment. Mark `IMPLEMENTED / DEPLOYED — PENDING USER PHONE REVIEW`; do not self-accept.

**Resume point:** Verify latest `origin/ux-v2` and current Actions health before the first source commit. Continue from the existing Equilibrium COST proof and shared W3 renderer; after closure, reread the latest remote design and select exactly one next small authorized task.
