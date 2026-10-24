# HANDOVER

Target branch: `ux-v2` (working branch: `codex/ux2-equilibrium-phone`). Phone-only validation; maximum 8 players.

## Latest result

**`UX2-10.9-W3-EQUILIBRIUM-COST-FRAME` — IMPLEMENTED / DEPLOYED, PENDING USER PHONE REVIEW.** Source SHA `e71726b5e7533a6ef9d78af99b7a6fa25a11f57c`; exact-SHA [Actions `40117678290`](https://github.com/dmoneyUK/three-kingdoms/actions/runs/40117678290) passed lint/fast, API, browser startup/room smoke, D1 migration, Worker deployment and production smoke. Worker version `588a3a4e-4398-447c-8a2d-e8fa871af781`; production `/` and `/api/health` returned HTTP 200 (`{"ok":true,"worker":"available"}`). Four authenticated Worker/D1 viewers at 390×844 verified mixed Hand/Equipment costs, exact shared CardFaces, correct actor/material ownership and Seat/Dock parking, and private replacement draws. Focused Equilibrium plus adjacent W3/Deflection regressions passed 6/6; build and `git diff --check` passed; focused ESLint had 0 errors and 16 existing Hook warnings. No phone acceptance is claimed.

**Latest remote design reviewed:** `docs/UX2-refine.md` at `9c90d6ba6c5ae6a2313c67e8ba9ee87eba241524`, §10.9.1–10.9.4 and W4. The remote update records the owner's H2-G1-F acceptance and pauses new phone-acceptance requests; it does not pause authorized Table A implementation. Local design records Equilibrium delivery and W3 implementation completion, still pending user phone review.

## Exactly one current bounded task

**`UX2-10.9-W4-FIRST-AID-CONVERSION-FRAME` — PLANNED.** Add the shared W2 public Frame for Hua Tuo's already-proven `hua_tuo_first_aid` conversion: the genuine red non-Peach physical Hand card, Hua Tuo as activation/material owner, AS PEACH meaning, and the proven Dying recovery target/result. Preserve normal Peach/Dying legality and continuation, every viewer's public/private projection, and true actor Seat/Dock parking. Do not fabricate a Peach CardFace or change gameplay rules.

Use `docs/UX2-refine.md` §10.9.1–10.9.2 and W4 in §10.9.4, plus the existing W1 proof inventory and First Aid API/browser coverage. Validate on authenticated mobile Worker/D1 viewers at 390/440px; verify matching physical identity, actor/target/outcome, continued legal Dying resolution, private Hands and no duplicate notification. Run normal exact-SHA CI/deployment and hand off **PENDING USER PHONE REVIEW**; do not self-accept.
