# Three Kingdoms — current roadmap

## Current status — 2026-09-30

The verified WTK Standard gameplay foundation is implemented:

- **Standard heroes:** 30 / 30 implemented
- **Printed Standard hero skills:** 46 / 46 implemented
- **Verified Standard card identities:** 28 / 28 playable
- **Physical Standard deck:** canonical 108-card manifest implemented
- **Core match rules:** turn loop, semantic responses/triggers, damage, Dying/rescue, recovery, Judgement, delayed Stratagems, equipment interactions, match outcome, stale-action rejection, private projection, and Quick Test infrastructure are implemented.

The hero-implementation phase is closed. Do not add another Standard hero as a completion task. Remaining Standard work is focused interaction correction and hardening of already implemented rules.

## Active roadmap

### Priority 1 — Lord-skill role correctness

Fix the two confirmed missing Lord gates:

- **Cao Cao / Entourage:** require authoritative `role === "Lord"` in provider discovery and resolution; correct regressions that currently allow non-Lord Cao Cao.
- **Sun Quan / Deliverance:** require Sun Quan to be Lord before the Wu-rescuer recovery bonus applies; correct regressions that currently allow non-Lord Sun Quan.

Keep delegated responses, Dying/recovery, privacy, stale safety, and Quick Test behavior on their existing generic pipelines.

### Priority 2 — Lü Bu / Unrivaled semantic multi-response correction

Correct the generic response architecture so a requirement for two Attacks or Dodges means **two semantic responses**, not “select two physical cards in one provider”.

The response continuation must track semantic responses remaining independently of provider cost-card count. One successfully resolved provider normally contributes one Attack/Dodge; if another is required, persist and reopen the remaining response decision.

Required interaction closure includes:

- two ordinary physical responses;
- ordinary + converted mixed responses;
- Serpent Spear: two physical costs = one Attack;
- Guan Yu God of War;
- Zhao Yun Braveheart;
- Zhen Ji Empress Dowager;
- Eight Trigrams: one successful Judgement = one Dodge;
- Cao Cao Entourage;
- Liu Bei Influencing;
- normal Duel;
- Diao Chan Lust Duel;
- reload and stale/replay rejection;
- private projection and physical-card conservation.

Do not implement this with Lü-Bu-specific branches in each hero/equipment provider. The correction belongs at the generic semantic response/continuation boundary.

### Priority 3 — Huang Gai / Self Sacrifice timing verification

Verify the exact WTK ruling for **Self Sacrifice at 1 HP** before changing gameplay.

The current `lose_draw` flow can expose the two drawn cards before completing a lethal HP-loss/Dying boundary. If the authoritative ruling confirms HP loss must resolve before the draw, change the flow to: lose 1 HP → if alive draw 2; if at 0 HP enter canonical Dying/rescue → after successful rescue resume Self Sacrifice and draw 2.

Reuse a persisted canonical HP-loss/Dying continuation, following the generic pattern already used for Pan Feng. Do not create a separate Huang-Gai Dying engine.

### Priority 4 — Sima Yi / Retaliation hidden-Hand hardening

Make Retaliation's hidden-Hand acquisition authoritative and server-random.

When Sima Yi chooses the target's Hand zone, the server should randomly select one current Hand card. Public Equipment/Judgement cards remain exact selectable cards. Preserve live-state revalidation, private projection, stale safety, and card conservation.

## Rules interpretation pending explicit WTK evidence

Do not change the source zones for **Guan Yu God of War, Zhen Ji Empress Dowager, Gan Ning Ambushment, Da Qiao Captivating, or Hua Tuo First Aid** solely from the English phrase “a card”. Keep the current project interpretation until an explicit WTK ruling/source resolves those source-zone cases.

## Completion gate for the active roadmap

The Standard implementation count remains **30/30 heroes and 46/46 skills** while these interaction defects are corrected.

For each confirmed correction:

1. make the smallest generic rules change that fits the established capability architecture;
2. add focused deterministic regression coverage;
3. preserve normal multiplayer and Quick Test parity;
4. preserve server-owned legality, private projection, persisted continuations, stale/replay rejection, and physical-card conservation;
5. run the relevant capability/API tests, then full validation before release.

When the four active priorities above are closed, perform one final Standard interaction regression pass. New expansion gameplay, new artwork, and graphic/theme design require a separately approved roadmap.

## Architecture that is already complete — preserve, do not restart

The supported rules architecture is semantic and capability-driven: `ResponsePending` and `TriggerPending`, generic `respond` / `decline_response` and `trigger` / `decline_trigger`, canonical damage/Dying/recovery/Judgement pipelines, effective distance and target-legality capabilities, equipment-loss continuations, presentation barriers, server-owned legality, private actor projections, and `currentAction` as the authoritative browser contract.

Do not reintroduce provider-specific HTTP actions, legacy pending-state compatibility, or a universal effects DSL.

## Completed foundations

The following are closed roadmap milestones rather than TODOs: Standard 28-card identity implementation, exact 108-card physical deck reconciliation, core match/Dying/death/outcome rules, semantic response/trigger migration, Standard 30-hero/46-skill implementation, Standard selection allow-list completion, and the prior Step 1 functional UI handover.

Expansion sets (including Endless Legends and Kingdom Wars) are outside the active Standard roadmap unless the project owner explicitly changes scope.
