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

## Phase 1 — Close the remaining Standard correctness gate

The Cao Cao/Sun Quan Lord-role correction, Lü Bu/Unrivaled semantic
multi-response correction, and Sima Yi/Retaliation hidden-Hand hardening are
complete and are no longer Phase-1 work items.

**Goal:** resolve the remaining rules question discovered by the completed
cross-hero audit.

### Completed: Cao Cao / Sun Quan Lord-role correctness

This item is complete; the historical requirements below are retained for
traceability only.

Historical requirements:

- **Cao Cao / Entourage:** require authoritative `role === "Lord"` during both provider discovery and provider resolution.
- **Sun Quan / Deliverance:** require Sun Quan to be Lord before the Wu-rescuer recovery bonus applies.

Update the existing positive tests so their skill owner is explicitly Lord, and add negative non-Lord regressions. Preserve delegated response ownership, ordinary Peach/recovery behavior, Dying continuations, privacy, stale rejection, and Quick Test parity.

**Exit gate:** both skills are impossible for a non-Lord while their Lord behavior remains unchanged.

### Completed: Lü Bu / Unrivaled semantic response-count correction

This item is complete; the historical requirements below are retained for
traceability only.

Historical requirements:

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

The authoritative project material checked so far does not establish the exact
ordering at 1 HP. `docs/STANDARD_HERO_REFERENCE.md` and `game/heroes.ts`
reproduce the printed text, “lose 1 HP in order to draw 2 cards”; the project
reference material does not state whether the draw precedes or follows the HP
loss/Dying window. `docs/OFFICIAL_CARD_REFERENCE.md` contains the Standard card
reference and general rule material, but no Huang Gai timing ruling.

Do not change gameplay until an authoritative WTK ruling resolves this.

If HP loss resolves before the draw, replace the current atomic `lose_draw` ordering with a persisted continuation:

`lose 1 HP → if alive draw 2 → if at 0 enter Dying/rescue → after successful rescue resume and draw 2`.

Reuse the canonical HP-loss/Dying machinery rather than creating a Huang-Gai-specific rescue path.

**Exit gate:** implementation and deterministic regression agree with the verified WTK timing; no newly drawn card can incorrectly participate in an earlier Dying window.

### Completed: Sima Yi / Retaliation hidden-Hand hardening

This item is complete; the historical requirements below are retained for
traceability only.

Historical requirement: selecting the damage source's Hand means **server-random
acquisition of one current Hand card**; public Equipment/Judgement cards remain
exact selections.

**Exit gate:** the client cannot influence which hidden Hand card is obtained; live-state validation, privacy and card conservation remain correct.

---

## Future TODO — Standard integration testing

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

## Future TODO — End-to-end and release testing

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

## Next active phase after bug fixes — UX improvement

After the confirmed Phase 1 gameplay defects are fixed, **UX improvement becomes the next active development phase**.

Do not automatically begin the large integration/release-testing phases first. Keep those as future TODO work while UX is improved.

The UX phase should be planned from the actual current game flow before implementation. Review the existing browser experience for normal multiplayer and Quick Test and identify friction in:

- understanding whose turn/action it is;
- understanding what decision is currently required;
- selecting cards and targets;
- response/trigger choices and decline actions;
- waiting/presentation states between actions;
- hand, equipment, Judgement and hero information readability;
- mobile/touch usability and crowded layouts;
- error/stale-action feedback;
- game setup, hero selection and match-end flow;
- Quick Test perspective switching.

Keep gameplay legality and semantic action architecture unchanged unless a UX problem exposes a genuine rules defect. UX work should consume the existing `currentAction` contract rather than create UI-only game rules.

Graphic/art redesign is separate from functional UX work unless explicitly requested.

**UX exit gate:** agree a concrete UX backlog from the current product, implement it in small reviewable steps, and verify normal multiplayer plus Quick Test remain functionally correct.

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

## Roadmap order

1. **Now:** Phase 1 — close the confirmed Standard correctness defects.
2. **Next:** UX improvement based on the actual current game flow.
3. **Future TODO:** Standard integration testing.
4. **Future TODO:** end-to-end, persistence, release and production validation testing.
5. **Later:** choose expansion gameplay or another product direction explicitly.

The Standard implementation count remains **30/30 heroes and 46/46 skills** throughout bug fixing and UX work. Expansion gameplay remains out of scope until explicitly selected.
