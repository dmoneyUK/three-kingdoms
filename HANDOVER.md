# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `USER-DIRECTED UX REFINEMENT`

## Latest relevant result / CI

Stage A (§6.38) ordinary live Attack and committed Dodge seat-relative layout was shipped in `44720e7d1af64783cebbb520775e4cf0bbdf0be8` and its exact-SHA Actions run `38184507122` **succeeded**, including lint/fast, API, browser startup smoke and Cloudflare deploy. The Coding Agent reported real server-backed Attack→Dodge geometry checks 4/4 at 390×844, 440×766, 480×900 and 1440×900, build, scoped lint and diff checks passing. This evidence does **not** cover the new no-Dodge/Skip visual defect.

**User visual feedback (2026-10-12):** Stage A's overall seat-relative battlefield/card/orthogonal layout is **basically satisfactory**. **ONE specific remaining defect prevents Stage A acceptance:** when a targeted player has no Dodge and presses **Skip**, the attacker-view Attack graph displayed during the damage/settlement handoff uses **straight/diagonal** connectors rather than the approved rounded orthogonal green author and red target routes. Do not redo accepted positioning or start Stage B/C.

## Design checkpoint

`docs/UX2-refine.md` §6.38 is still the approved Stage A design; current remote blob at review: `08d2f72f166a8ffb69e8901e1c23a9201897a8f1`. The new report is a **Stage A regression follow-up**, not a design revision. Preserve the existing semantics and §6.35 settlement retirement.

## Current single task — P1: `UX2-6.38-A-SKIP-HIT-ORTHOGONAL-SETTLEMENT-01`

**Goal:** Preserve the same authentic, seat-relative **orthogonal** Attack author and target routes when a real defender declines Dodge with `decline_response` / Skip and the publicly proven `ATTACK_DAMAGE_APPLIED` settlement appears, especially after switching to the attacker's controlled viewpoint.

**Review-supported suspected root cause (confirm, do not assume):**

- `app/page.tsx` builds `attackHitSettlementCandidate` from one matching **PROVEN** public hit proof + genuine timeline Attack root card event, with matching `rootEventId`, `rootResolutionId`, `sourceId`, `targetId` and server settlement event; but the derived `liveRootActionOverlayAction` in the `attackHitSettlementCandidate` branch (around line 4196 at this review) sets `cardKind: "Attack"` while **omitting the already-validated `rootEvent.card` as `cardFace`**.
- `app/interaction-root-overlay.tsx` (around line 1033) gates `isOrthogonalAttackRoot` on `action.cardFace?.kind === "Attack"`. When false, the generic result path around line 2625 uses legacy `pathBetween()` lines, which can be diagonal. Verify the exact root/card eligibility, mounted DOM `data-root-action-orthogonal-attack-routing` and actual SVG `d` before and after Skip; also check whether view switch/brief transition chooses a legacy `InteractionStage` instead.

**Scope/implementation:** Make a **minimal** repair to the verified existing **physical Attack** settlement presentation so the original public card identity stays present and Stage A's `attackRoutesForCard()` orthogonal geometry is used for the exact settled root, without inventing proof. Reuse the already verified public `attackHitSettlementCandidate.rootEvent.card` only when all existing public identity/resolution checks succeed; do not infer a card from a private hand, timeline proximity or hero name. Keep viewer-relative left/right, correctly anchored rounded right-angle green source/no arrowhead and red Attack→actual Seat/Dock arrowhead. Root card must remain stable (<=1 CSS px with unchanged viewer/geometry), with no Dodge CardFace/false block. If the diagonal is from another specific fallback path, fix *that same proven branch* instead; never globally switch generic Duel/Negation/AOE/skill connectors.

**Required focused verification:**

1. Real server-backed four-player ordinary Attack where the defender has no Dodge: capture **attacker + defender** perspectives with 440×766 mobile (plus 390×844 where practical). Record the exact public `rootEventId`, original physical Attack ID, settlement ID/outcome, and pre-Skip card geometry/orthogonal routes.
2. Perform the actual **Skip** UI action (`decline_response`), and **capture the brief hit-settlement frames immediately**, not just the eventual cleared board. Include the attacker viewpoint after host-controlled seat switch if reproducing the user workflow. Assert during the visible settlement that both real SVG source and target path `d` strings follow horizontal/vertical orthogonal segments with rounded 90° elbows; no diagonal `L` segments. Assert target arrow/hero anchoring visible, `data-root-action-orthogonal-attack-routing="true"`, correct public identities, genuine physical Attack and no invented Dodge.
3. Existing `tests/browser/interaction-root-overlay-real-gameplay.spec.mjs` hit/timeout tests already assert `sourceEdge`, `targetEdge`, fixed Seats and timers but **not** orthogonal `d` geometry in the post-Skip hit settlement. Strengthen a focused real-Skip regression to **assert actual path shape**; use preinstalled observers/frame sampling before Skip to avoid missing the short settlement. Test auto-timeout decline if affected, not as substitute for explicit Skip.
4. Retest normal Attack-before-Skip and Attack→real Dodge (including accepted Zhao Yun Longdan conversion where relevant); no new invented card, no overlapping Dock/Guidance, no forged target, no unnecessary reflow, no private data leaked. Preserve normal damage resolution, exact current game rules, 20s successful Dodge hold, short hit-result lifetime, §6.35 new-action supersession and refresh fail-closed.

**Delivery:** Small changed-file summary and actual root-cause proof; before/after attacker/defender screenshots and sampled SVG geometry (clearly label genuine server-backed frames); focused test outcomes, `git diff --check`, relevant build/lint, exact commit SHA, required <=6-minute GitHub Actions CI and deploy outcome. If production browser repro needs extra setup, state the limitation rather than claiming success.

**STOP after this one regression fix** for independent Reviewer/user confirmation that Stage A is complete. **Do not start Stage B (Duel/Negation), Stage C (AOE), Hero-specific layout or unrelated CI/refactoring.** Do not edit `docs/UX2-refine.md` unless the user separately approves a design change.
