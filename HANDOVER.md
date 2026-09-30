# Three Kingdoms — current handover

## Current state — 2026-09-30

The Standard hero implementation milestone is complete: **30/30 Standard heroes and 46/46 printed skills are implemented and enabled**. There is no remaining Standard hero implementation task.

The current codebase remains capability-driven: semantic `respond` / `decline_response` and `trigger` / `decline_trigger` actions, persisted continuations, canonical damage/Dying/recovery/Judgement pipelines, generic distance and target-legality capabilities, server-owned legality, private projection, stale/replay rejection, physical-card conservation, and Quick Test parity with normal multiplayer. Preserve these boundaries; do not solve interaction defects by adding hero-name branches to central rules when a generic capability/continuation fix fits.

## Real remaining gameplay work

### 1. Cao Cao / Entourage — add the missing Lord restriction

The printed skill is a Lord skill. Current `caoCaoHujiaProvider` checks `context.hero === "cao-cao"` but does not require `context.role === "Lord"`. Liu Bei / Influencing already demonstrates the intended role gate.

Required work: require authoritative Lord role in both Entourage option discovery and resolution, and correct existing regressions that currently allow non-Lord Cao Cao. Preserve delegated-response ownership, privacy, stale safety, and normal/Quick Test parity.

### 2. Sun Quan / Deliverance — add the missing Lord restriction

The printed skill is `Lord, Passive`. Current rescue handling recognises Sun Quan and a different Wu rescuer but does not require Sun Quan's authoritative role to be Lord.

Required work: require Sun Quan to be Lord before the Deliverance bonus applies, and correct tests that currently accept the bonus for non-Lord Sun Quan. Keep ordinary Peach/recovery, Dying continuation, and Lady Gan `hp_recovered` interactions canonical.

### 3. Lü Bu / Unrivaled — fix generic semantic multi-response handling

This is the largest confirmed interaction defect. The current response layer uses `requirement.count = 2` and filters provider selections by physical selection count. Semantic response count must not be inferred from the number of physical cost cards.

Examples that must be correct after the fix:

- Serpent Spear: two physical cost cards create **one** semantic Attack, never two.
- Guan Yu God of War: one eligible red card creates one Attack and may satisfy one of two required Attacks.
- Zhao Yun Braveheart: one conversion creates one Attack or Dodge and may satisfy one unit of the requirement.
- Zhen Ji Empress Dowager: one eligible black card creates one Dodge and may be followed by another Dodge provider.
- Eight Trigrams: one successful Judgement creates one Dodge; if another Dodge is required, reopen the remaining requirement.
- Cao Cao Entourage and Liu Bei Influencing: one successful delegated response contributes one semantic response and may be followed by the remaining requirement.
- Ordinary physical responses, ordinary Duel, and Diao Chan Lust Duel must continue to work.

Required architecture: make the response continuation track **semantic responses remaining** independently of provider cost-card count. Each successfully resolved provider contributes the semantic response it actually creates, normally one; if a remainder exists, persist/reopen the response decision. Do not add Lü-Bu-specific branches to individual conversion/equipment/Lord-skill providers.

Required regression coverage: ordinary + converted mixed responses, Serpent Spear, Guan Yu, Zhao Yun, Zhen Ji, Eight Trigrams, Entourage, Influencing, normal Duel, Diao Chan Lust Duel, reload, stale/replay rejection, privacy, and physical-card conservation.

### 4. Huang Gai / Self Sacrifice — verify 1 HP timing, then fix if confirmed

Current active-skill execution is represented as `lose_draw`; the audited route currently draws before completing the lethal HP-loss/Dying boundary when Huang Gai starts at 1 HP. This may expose the newly drawn cards before rescue.

Before changing code, verify the exact WTK ruling for Self Sacrifice at 1 HP. If the intended order is HP loss before draw, implement it through a persisted continuation: lose 1 HP; if still alive, draw 2; if HP reaches zero, enter canonical Dying/rescue; after successful rescue, resume the suspended Self Sacrifice and draw 2. Reuse the generic HP-loss/Dying continuation style already used by Pan Feng rather than introducing a Huang-Gai-specific Dying engine.

### 5. Sima Yi / Retaliation — make Hand acquisition server-random

The rules treat obtaining a card from another character's Hand as random, while public Equipment/Judgement cards may be selected deliberately. The current implementation hides Hand identities but allows an opaque positional Hand choice, so the server is not actually choosing the Hand card randomly.

Required work: when Retaliation chooses the Hand zone, make the authoritative server randomly choose one current Hand card. Keep exact selection for public Equipment/Judgement cards. Preserve private projection, live-zone revalidation, stale safety, and physical-card conservation.

## Rules interpretation intentionally left unresolved

Do not change the source zones for Guan Yu God of War, Zhen Ji Empress Dowager, Gan Ning Ambushment, Da Qiao Captivating, or Hua Tuo First Aid solely because the English card wording says “a card”. The current project reference records deliberate Hand-zone interpretations for some of these, and the available rule material does not clearly resolve every source-zone case. Require an explicit WTK ruling/source before changing them.

## Execution order

Complete the remaining work in this order: **(1) Cao Cao + Sun Quan Lord gates; (2) generic Unrivaled/multi-response correction; (3) verify and, if confirmed, fix Huang Gai timing; (4) Sima Yi random-Hand hardening.**

After each change, add focused deterministic regressions and re-run the relevant API/capability suites. Do not reduce the implementation status from **30/30 heroes / 46/46 skills** for these defects; they are interaction corrections to completed skills.

## Out of scope for this handover

Historical hero-by-hero implementation stages, old “next hero” recommendations, intermediate completion counts, completed artwork intake, completed UI handovers, and already-pushed commit instructions have been removed from this file because they are no longer actionable. Expansion heroes and graphic-design work are not part of the current gameplay handover.
