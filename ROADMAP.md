# War of Three Kingdoms — roadmap

## Product position — 2026-09-30

The project has moved out of the **Standard content implementation** phase.

Current baseline:

- **30 / 30 Standard heroes** implemented and selectable.
- **46 / 46 printed Standard hero skills** implemented.
- **28 / 28 verified Standard card identities** playable.
- Canonical **108-card Standard deck** implemented.
- Semantic response/trigger architecture, canonical damage/Dying/recovery/Judgement flows, delayed Stratagems, equipment interactions, match outcome, private projection, stale/replay rejection, and Quick Test infrastructure are established.
- GitHub Actions validates `main` and deploys the Cloudflare Worker after validation.

The next roadmap should therefore prioritise **correctness closure and release confidence**, not more Standard content and not another architecture rewrite.

---

## Phase 1 — Close confirmed Standard correctness defects

**Goal:** remove the known rules defects discovered by the completed cross-hero audit.

### 1A. Lord-skill correctness

Fix as one small batch:

- **Cao Cao / Entourage:** require authoritative `role === "Lord"` during both provider discovery and provider resolution.
- **Sun Quan / Deliverance:** require Sun Quan to be Lord before the Wu-rescuer recovery bonus applies.

Update the existing positive tests so their skill owner is explicitly Lord, and add negative non-Lord regressions. Preserve delegated response ownership, ordinary Peach/recovery behavior, Dying continuations, privacy, stale rejection, and Quick Test parity.

**Exit gate:** both skills are impossible for a non-Lord while their Lord behavior remains unchanged.

### 1B. Lü Bu / Unrivaled semantic response-count correction

This is the largest remaining rules change.

The current response discovery couples `requirement.count` to a provider's physical-card selection count. Replace that assumption with a generic model in which the pending response tracks **semantic responses remaining**.

Required behavior:

- one ordinary Attack/Dodge = one semantic response;
- one Guan Yu, Zhao Yun, or Zhen Ji conversion = one semantic response;
- Serpent Spear's two physical cost cards = one semantic Attack;
- one successful Eight Trigrams Judgement = one semantic Dodge;
- one successful Entourage or Influencing delegation = one semantic response;
- after one response succeeds, reopen/persist the same requirement with the remaining semantic count when more are required.

The correction must work through ordinary Attack, ordinary Duel, Diao Chan Lust Duel, delegated responses, Judgement-backed responses, and converted/virtual cards without provider-specific Lü-Bu branches.

Regression coverage must include mixed physical/converted responses, Serpent Spear, Guan Yu, Zhao Yun, Zhen Ji, Eight Trigrams, Entourage, Influencing, reload, stale/double submission, actor privacy, and physical-card conservation.

**Exit gate:** every provider cost is independent of semantic response count, and all two-response Unrivaled paths resolve/resume correctly.

### 1C. Huang Gai / Self Sacrifice timing

First verify the exact WTK ruling for **Self Sacrifice at 1 HP** from an authoritative source.

If HP loss resolves before the draw, replace the current atomic `lose_draw` ordering with a persisted continuation:

`lose 1 HP → if alive draw 2 → if at 0 enter Dying/rescue → after successful rescue resume and draw 2`.

Reuse the canonical HP-loss/Dying machinery rather than creating a Huang-Gai-specific rescue path.

**Exit gate:** implementation and deterministic regression agree with the verified WTK timing; no newly drawn card can incorrectly participate in an earlier Dying window.

### 1D. Sima Yi / Retaliation hidden-Hand hardening

Change Retaliation so selecting the damage source's Hand means **server-random acquisition of one current Hand card**. Do not expose or accept a client-selected hidden Hand position. Public Equipment/Judgement cards remain exact selections.

**Exit gate:** the client cannot influence which hidden Hand card is obtained; live-state validation, privacy and card conservation remain correct.

---

## Phase 2 — Standard release-confidence pass

**Goal:** prove the completed Standard ruleset behaves correctly as a whole rather than continuing hero-by-hero implementation.

After Phase 1, run a focused integration matrix across the highest-risk shared boundaries:

- converted/virtual Attack identity through Attack, Duel, Borrowed Sword, Halberd and red-Attack reactions;
- damage source/target ownership, prevention/modification, multi-point damage and post-damage triggers;
- Dying/rescue nested with `hp_recovered` and suspended continuations;
- Judgement replacement, Eight Trigrams and delayed Stratagem resolution;
- Equipment loss/replacement, weapon continuations and physical-card conservation;
- distance modifiers versus independent target-legality capabilities;
- Negation and Negation-of-Negation around ordinary and delayed Stratagems;
- reload during an open semantic response/trigger/Judgement decision;
- wrong-seat, stale and double submission rejection;
- private projection for Hand cards, provider choices and deck-reorder decisions;
- Quick Test behavior matching normal multiplayer ownership/rules.

Do not create a giant exhaustive pairwise hero matrix. Add tests only where shared semantic boundaries or previously uncovered compositions justify them.

**Exit gate:** no known P0/P1 Standard rules defect remains, targeted regressions are green, full build/tests/lint are green, and current documentation matches the shipped behavior.

---

## Phase 3 — Release and playtest hardening

**Goal:** make the completed Standard game easier to trust in real multiplayer sessions.

### 3A. End-to-end match smoke coverage

Add a small number of deterministic scenario tests that cross several turns and capabilities instead of testing only isolated card/skill actions. Cover at least:

- game setup → hero selection → opening turn;
- Attack/response/damage/Dying/rescue → turn continuation;
- Stratagem/Negation/Judgement → continuation;
- death → role-based match outcome;
- reload during a pending decision and successful continuation.

Prefer stable API/Worker tests over brittle browser pixel tests.

### 3B. Runtime integrity checks

Review persisted pending-state boundaries and add inexpensive assertions/tests for impossible states that could strand a room. Prioritise:

- actor exists and is alive when a decision opens;
- continuation owner/resume player still exists;
- held physical cards cannot be duplicated into another zone;
- a resolved decision cannot apply twice;
- room phase and pending kind remain compatible.

Do not introduce a second state machine or broad framework rewrite.

### 3C. Production validation

For release candidates, require:

```bash
npm run build
npm test
npm run lint
git diff --check
```

Then require the GitHub Actions `build-and-test`, Cloudflare deployment and production smoke test to succeed.

**Exit gate:** one clean release candidate completes local validation, CI, deployment and smoke testing with no known Standard blocker.

---

## Phase 4 — Product expansion decision

Do **not** start this phase automatically.

Once Standard correctness and release confidence are closed, choose the next product direction explicitly. Possible future tracks are:

- expansion-set gameplay;
- multiplayer/product usability improvements;
- presentation/artwork work;
- additional automation or test tooling.

Expansion sets such as Endless Legends and Kingdom Wars remain out of scope until explicitly selected. Graphic design/artwork is also separate from the current gameplay roadmap.

Before choosing an expansion track, create a new source-backed scope from the relevant official rules/cards rather than extending Standard assumptions.

---

## Parked rules interpretation

Do not change the source zones for **Guan Yu God of War, Zhen Ji Empress Dowager, Gan Ning Ambushment, Da Qiao Captivating, or Hua Tuo First Aid** solely because the English card wording says “a card”.

The current project interpretation remains in force until an explicit WTK ruling/source resolves those source-zone questions. This is not an active implementation task.

---

## Engineering constraints

Preserve the architecture already established by the project:

- `currentAction` remains the authoritative client decision contract;
- responses use generic `respond` / `decline_response`;
- capabilities use generic `trigger` / `decline_trigger`;
- server state owns legality and revalidates decisions;
- private information is projected only to the correct actor;
- persisted continuations resume the interrupted domain effect exactly once;
- physical cards remain conserved through conversions and suspended effects;
- Quick Test follows the same gameplay rules as normal multiplayer;
- no provider-specific HTTP actions;
- no universal effects DSL;
- no architecture rewrite merely to fix a local interaction defect.

---

## Definition of Standard gameplay closure

The Standard gameplay milestone is closed for release when:

1. all four Phase 1 work packages are resolved or, for Huang Gai, explicitly closed by the verified ruling;
2. the Phase 2 interaction pass finds no unresolved P0/P1 Standard rules defect;
3. Phase 3 end-to-end/integrity coverage is green;
4. build, full tests, lint and `git diff --check` pass;
5. GitHub Actions deployment and production smoke checks succeed;
6. `README.md`, `HANDOVER.md`, `ROADMAP.md`, and the Standard reference accurately describe the shipped rules.

At that point, stop extending Standard implementation by default and select the next product track explicitly.
