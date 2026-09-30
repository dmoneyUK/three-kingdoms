# War of Three Kingdoms

## Gameplay correctness — Cao Cao Entourage + Sun Quan Deliverance — 2026-09-30

Corrected the missing Lord-role gates for Cao Cao's Entourage and Sun Quan's
Deliverance. Entourage now requires authoritative Lord status in both semantic
provider discovery and resolution, preserving delegated-response ownership,
privacy, ordering, and stale safety. Deliverance now additionally requires
Lord Sun Quan while retaining the existing Wu-rescuer, other-character,
First Aid, max-HP, and canonical Dying/recovery behavior.

Focused API regressions cover Lord and non-Lord discovery/resolution, faction
and ownership restrictions, capping, and Dying continuation. The next
gameplay bug-fix milestone is Lü Bu / Unrivaled semantic multi-response.

A web implementation of the **WTK Standard** ruleset, built around authoritative server-side game state and semantic capability-driven actions.

## Current status — 2026-09-30

The Standard gameplay foundation is implemented:

- **30 / 30 Standard heroes** are implemented and selectable.
- **46 / 46 printed Standard hero skills** are implemented.
- **28 / 28 verified Standard card identities** are playable.
- The canonical **108-card Standard deck** is implemented.
- Core turn flow, responses, triggers, damage, Dying/rescue, recovery, Judgement, delayed Stratagems, equipment interactions, match outcome, private projections, stale-action rejection, and Quick Test infrastructure are implemented.

The hero-implementation milestone is closed. Remaining Standard work is interaction correction and hardening of already implemented rules rather than adding more Standard heroes.

See:

- `ROADMAP.md` for the active priorities.
- `HANDOVER.md` for implementation details and known remaining defects.
- `docs/STANDARD_HERO_REFERENCE.md` for the complete Standard hero/skill reference.
- `docs/OFFICIAL_CARD_REFERENCE.md` for the verified Standard card reference.
- `docs/STANDARD_108_DECK_MANIFEST.md` for the physical deck manifest.

## Active gameplay work

The current verified priorities are:

1. **Lü Bu / Unrivaled:** correct generic multi-response handling so semantic Attack/Dodge count is independent of provider physical-card cost. This includes conversions, Serpent Spear, Eight Trigrams, delegated responses, normal Duel, and Diao Chan Lust.
4. **Huang Gai / Self Sacrifice:** verify the authoritative 1-HP timing; if confirmed, make lethal HP loss enter canonical Dying/rescue before the suspended draw resumes.
5. **Sima Yi / Retaliation:** make hidden-Hand acquisition server-random while keeping public Equipment/Judgement selection exact.

After these items are closed, run a final Standard cross-hero/card interaction regression pass.

The Standard completion count remains **30/30 heroes and 46/46 skills** while these interaction defects are corrected.

## Gameplay architecture

The supported gameplay protocol is semantic and capability-driven.

- `currentAction` is the authoritative client decision contract.
- Responses use generic `respond` / `decline_response` actions.
- Triggered and active capabilities use generic `trigger` / `decline_trigger` actions.
- Persisted continuations resume interrupted Attack, Duel, group-card, damage, Dying, recovery, Judgement, equipment-loss, and hero-skill flows.
- Legality is owned and revalidated by the server.
- Private Hand/provider choices are projected only to the acting seat.
- Stale and replayed decisions are rejected.
- Physical card identity and conservation are preserved through conversions and continuations.
- Quick Test uses the same human-style game rules and seat ownership as normal multiplayer.

New rules should extend these generic boundaries rather than introduce hero/card-specific HTTP actions or a second rules engine.

## Standard rules scope

The active ruleset is **WTK Standard**. Expansion sets such as Endless Legends and Kingdom Wars are outside the active gameplay roadmap unless scope is explicitly changed.

The project uses the official WTK Standard rulebook/card references recorded in the repository as the rules and terminology basis. Where a wording interpretation remains unresolved, do not silently change the implementation without explicit WTK evidence.

One currently parked interpretation concerns the source zone for cards used by Guan Yu God of War, Zhen Ji Empress Dowager, Gan Ning Ambushment, Da Qiao Captivating, and Hua Tuo First Aid. Their existing Hand-zone interpretations should remain until an explicit ruling/source resolves them.

## Development

Requirements:

- Node.js **22.13.0 or newer**
- npm

Install dependencies:

```bash
npm install
```

Run locally:

```bash
npm run dev
```

Build:

```bash
npm run build
```

Run the fast tests:

```bash
npm run test:fast
```

Run the API suite:

```bash
npm run test:api
```

Run the complete validation test command:

```bash
npm test
```

Lint:

```bash
npm run lint
```

Before release, run:

```bash
npm run build
npm test
npm run lint
git diff --check
```

## Deployment

Production deployment is handled through the repository's GitHub Actions / Cloudflare workflow. The repository instructions in `AGENTS.md` are authoritative for contribution, validation, and deployment requirements.

Do not deploy through ChatGPT Sites.

## Project documentation

`README.md` is intentionally a **current-state overview**, not a chronological implementation log. Historical hero-by-hero milestones, intermediate completion counts, completed UI task briefs, artwork intake notes, and old “next hero” instructions should not be re-added here.

Detailed current work belongs in `HANDOVER.md` and `ROADMAP.md`. Stable rule/reference material belongs under `docs/`.
