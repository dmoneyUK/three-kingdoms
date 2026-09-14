# Three Kingdoms project handover

Use this file to continue development in a new chat. Start from the latest `main` branch, then read `AGENTS.md`, `README.md`, and `ROADMAP.md` before changing code.

## Persistent active milestone contract

The semantic execution architecture is **not complete yet**. Do not start Blue Steel Sword, another card, or a new hero ability until this checklist is fully implemented and tested. Do not split it into micro-commits that stop after adding helpers or continuation-specific branches.

Required completion criteria:

1. Negation scheduling discovers all legal `negate` providers, preserves seat order, advances declines correctly, toggles parity on successful Negation, and opens the correct counter-window.
2. Judgement is resolved once into a semantic satisfied/unsatisfied outcome and then enters the shared canonical response-continuation path for Attack, Group, Duel, and Negation.
3. Secondary-response prerequisites are validated before an atomic room claim, or every claimed path deterministically restores/continues state without a resolving no-op.
4. Humans and bots use the same semantic trigger continuation executor for `attack_dodged_event` and `damage_about_to_apply_event`.
5. Exhausted damage reactions apply exactly one original damage and enter Dying/rescue when necessary; exhausted Attack reactions finish without adding damage.
6. End-to-end regressions prove Negation order/parity, Judgement success/failure, Duel bot continuation, damage/Attack trigger exhaustion, human/bot parity, stale actions, and no room left in `resolving`.

Only after all six criteria are green may the final compatibility isolation, canonical-client, direct-event-ID, and synthetic extensibility cleanup round begin. If any item is open, report the architecture milestone as incomplete.

## Current baseline

As of 2026-09-14 the working baseline includes the final-round compatibility boundary changes on top of `0fbe9e9`. Legacy response requests normalize once at ingress, canonical response execution uses semantic providers, canonical trigger UI owns hidden-hand and named-equipment selection, and direct event barriers are preserved for the migrated response/trigger creators. Build, lint, diff checks, and the full 63-test local suite pass (one transient workerd timing failure was reproduced and passed on a clean rerun). Saved-room compatibility remains isolated at the boundary; no new cards or hero abilities should be added until the remaining direct-barrier audit and architecture review are complete.

Repository and service:

- Workspace: `/Users/jingedai/Documents/ChatGPT/WTK`
- GitHub: <https://github.com/dmoneyUK/three-kingdoms>
- Branch: `main`
- Live Worker: <https://three-kingdoms.dai-jinge.workers.dev/>
- Cloudflare config: `wrangler.jsonc`
- Production workflow: `.github/workflows/deploy.yml`

The active ruleset is **WTK Standard only**. Use `docs/OFFICIAL_CARD_REFERENCE.md`, the official WTK Standard rulebook, and YOKA/WTK official English terminology. Do not add Endless Legends or Kingdom Wars cards unless the owner changes scope. Do not ship official artwork without permission.

## Product state

The game is a playable browser alpha for small private groups. Normal multiplayer and Quick Test both support the main four-player loop, ordered responses, equipment, Dying/Peach rescue, death cleanup, role reveal, rewards/penalties, and core victory paths.

Quick Test is a single-controller table: one token controls four human-style seats and the UI follows the current legal actor while exposing only that actor's private hand. Keep this deliberate perspective-switching model when adding response or trigger decisions.

Room GETs are read-only. Presence uses a throttled heartbeat. Tests use an isolated Miniflare D1 under `.wrangler/test-state`, not the normal local development database. Human response clocks are armed only after the visible decision becomes available; duplicate timer starts are idempotent.

## Architecture that is now established

### 1. Canonical semantic response decisions

`game/pending.ts` persists `ResponsePending` as the canonical wrapper for Attack/Dodge/Negation response periods:

```ts
type ResponsePending = {
  kind: "response";
  actorId: string;
  requirement: ActionRequirement;
  reason: string;
  deadline?: number;
  resolutionId?: string;
  continuation: ResponseContinuation;
};
```

The continuation is still legacy-shaped (`AttackPending`, `GroupPending`, `DuelPending`, or `NegationPending`) so existing resolvers and saved games can migrate incrementally. `serializePending()` writes the canonical wrapper; `asLegacyResponsePending()` is a bounded compatibility adapter. Do not create a second rules engine just to remove that adapter.

`currentAction` v3 is the private authoritative action view. For semantic responses it exposes the requirement, canonical `respond` / `decline_response`, provider options, deadline, actor, and presentation barrier. The browser must not infer legal response options from hero/equipment state.

### 2. Response providers own capability semantics

`game/responses.ts` owns semantic requirements and the provider registry. Physical Attack/Dodge/Negation cards are providers alongside equipment and hero abilities.

Current important providers:

- physical Attack / Dodge / Negation cards;
- Eight Trigrams Formation as an explicit Dodge provider;
- Serpent Spear as an explicit Attack provider;
- Zhen Ji Qingguo as an explicit Dodge provider using one black hand card.

The response interaction invariant is deliberate:

- **0 or 1 implicit provider** for the ordinary/default physical-card route;
- **0..N explicit providers** for equipment or hero abilities.

Ordinary physical response cards can therefore be selected directly. Alternative abilities require an explicit choice. The registry throws if two implicit providers are simultaneously available.

A provider returns a semantic execution result, not an HTTP action. Immediate responses return `status: "satisfied"`; abilities requiring a secondary effect return `status: "requires_resolution"`.

### 3. Generic provider-owned Judgement

Eight Trigrams no longer maps `judgement` to a special Eight-Trigrams route. It requests a generic Judgement resolution and owns the success predicate (red result = Dodge). The generic engine reveals/discards the Judgement card and resumes the Attack/AOE continuation according to the result.

This is the model for future hero/equipment abilities that perform Judgement: the provider owns the rule for interpreting the revealed card; central Attack code must not know the provider identity.

### 4. Passive and triggered capability modules

Nio Shield is implemented through the passive Attack-modifier registry before a Dodge requirement is created.

`game/capabilities/triggers.ts` now defines a real executable trigger contract with:

- trigger event;
- option discovery;
- selection constraints;
- live revalidation / resolution;
- semantic execution output.

Representative migrated triggers:

- Green Dragon Blade — `attack_dodged`, select one valid follow-up Attack;
- Rock Cleaving Axe — `attack_dodged`, discard exactly two current Hand/Equipment cards;
- Frost Sword — `damage_about_to_apply`, choose one or two target Hand/Equipment cards and replace the damage with discards.

Frost Sword correctly excludes Judgement Zone cards.

Trigger discovery is now event-centric and returns **0..N** legal providers. `TriggerPending.resolvedEffectIds` prevents the same optional reaction from being offered twice during one event. The route rebuilds capability-neutral live source/target context and validates the submitted provider against the entire remaining option set. Old `respond_green_dragon`, `respond_rock_cleaving`, and Frost Sword action names are translated only at the HTTP boundary; new clients use `trigger` / `decline_trigger`.

Providers now return a discriminated semantic trigger outcome (`follow_up_attack`, `force_damage`, `prevent_damage`, or `continue_event`) with compiler-enforced payloads. Target-card constraints carry a target player plus opaque `eligibleKeys`; hidden hand IDs are never exposed as card IDs. `game/decisions/triggers.ts` owns the non-terminal `continue_event` transition: it records the resolved effect, reopens the same event with the remaining live options, or immediately resumes its continuation when none remains. `attack_dodged` terminal outcomes now use generic `applyFollowUpAttackOutcome()` and `applyForcedDamageOutcome()` domain functions; canonical execution switches on the semantic outcome and not on Green Dragon Blade or Rock Cleaving Axe. Legacy bot schedulers retain narrow adapters while they are migrated.

Legacy request-name translation now lives exclusively in `game/compat/legacy-actions.ts`. It translates old response/weapon verbs at the API boundary; canonical engine code should use the semantic response/trigger protocol only. Keep this adapter narrowly compatibility-only and do not add new gameplay logic to it.

### 5. Decision-specific presentation barrier

Presentation uses `resolutionId` separately from `actionRevision`. `currentAction.presentation` now contains:

```ts
{
  resolutionId: string | null;
  readyAfterEventId: string | null;
}
```

The client records completed event IDs and opens all response providers, decline, selectors, and the human response timer together only after `readyAfterEventId` has been presented. It no longer waits for the entire unrelated global presentation queue to become idle.

Events already present on initial load/reload are treated as presented; optimistically displayed cards are marked complete when their authoritative event arrives.

## Important architecture boundaries still remaining

### A. Canonical trigger decisions are now the public protocol; continuations remain compatible

`TriggerPending` is now the persisted wrapper for weapon reactions. It records the semantic event (`attack_dodged` or `damage_about_to_apply`), the acting player, deadline/reason and a bounded continuation. `roomState()` projects the current actor's private trigger option(s), and the client submits `trigger` or `decline_trigger`. The route recomputes the provider from live equipment/hand/target state and rejects a mismatched or stale provider.

Green Dragon Blade, Rock Cleaving Axe and Frost Sword are covered end-to-end through this protocol. Frost now uses the generic `damage_about_to_apply` continuation and semantic `prevent_damage` outcome; older pending shapes and action names remain compatibility adapters for saved rooms and bots. Do not add new capabilities to those legacy branches.

### B. Decision presentation barriers are now transition-owned

Every newly created canonical `ResponsePending` and `TriggerPending` stores `readyAfterEventId` at the transition that creates it. This includes normal and Serpent Spear Attacks, Duel exchanges, AOE/halberd targets, initial and counter-Negation windows, delayed-card Judgement Negation, and the representative weapon triggers.

`roomState()` consumes the persisted value first. Its log scan is now a **saved-room fallback only** for pre-migration pending JSON that lacks a barrier. Keep that fallback until stale persisted rooms have aged out or are deliberately migrated; never use it for new decision creators.

### C. Legacy protocol branches remain deliberately

`GAMEPLAY_ACTIONS` still contains compatibility response/trigger verbs such as `respond_dodge`, `respond_group`, `respond_negation`, `respond_eight_trigrams`, and the weapon-specific trigger actions. Legacy response continuation shapes also remain.

Do not remove them in a big-bang cleanup. First finish equivalent semantic trigger orchestration and exact decision barriers, keep saved-game compatibility covered, then delete compatibility branches one path at a time with regression tests.

## Recommended next work — architecture first

1. **Review the completed architecture boundary.** New gameplay should use canonical response/trigger commands, semantic providers, event continuations, and explicit presentation barriers.
2. **Keep compatibility isolated.** Old verbs and pending shapes remain readable only through saved-client/state adapters; do not add new branches to the canonical engine.
3. **Resume the WTK Standard card roadmap**, starting with Blue Steel Sword after the architecture review.

## Standard card roadmap status

The verified active roadmap is 28 card identities. **24 / 28 are currently treated as playable.** The remaining verified identities are:

1. Blue Steel Sword
2. Yin-Yang Swords
3. Kirin Bow
4. Borrowed Sword

`docs/STANDARD_108_DECK_MANIFEST.md` remains the physical 108-card target. Before declaring the Standard deck complete, reconcile every physical card, suit/rank assignment, quantity, and the six named mounts with the runtime deck.

Blue Steel Sword should be the next card after the architecture work above. Its Attack ignores Armor effects without unequipping the Armor, so it is also a useful proof that passive modifiers can be suppressed contextually rather than hard-coded into Armor cards.

## Key gameplay/rules invariants

- A core rule should request a semantic result (`Dodge`, `Attack`, `Negate`) rather than know every way it can be produced.
- Physical cards, equipment, hero conversions, and future effects provide capabilities around those semantic requirements.
- Passive effects such as Nio Shield happen before the response requirement if the Attack is already prevented.
- Triggered effects happen after the relevant domain event (`attack_dodged`, `damage_about_to_apply`, etc.).
- Server state is authoritative. Options visible to one acting player must not leak to other viewers.
- Presentation may delay an entire decision, but must never enable one legal choice while another legal choice in the same decision is still blocked.
- Human response timers must not begin before the visible decision is ready and must never extend on refresh/duplicate requests.
- Normal GET polling must stay read-only.
- Keep Quick Test perspective switching deterministic and private.

## Validation and release rules

Before a functional release, follow `AGENTS.md`:

- update `README.md` and this handover for functional changes;
- keep deterministic/Quick Test coverage current;
- run build, full tests, lint, and `git diff --check`;
- push the validated commit to `main`;
- use GitHub Actions as the only production deployment path.

Do not claim local tests ran unless they actually ran. A GitHub workflow startup failure is not evidence that the code failed tests; it is also not evidence that the code passed them.
