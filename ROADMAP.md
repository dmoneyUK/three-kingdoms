# War of Three Kingdoms — roadmap

## Current baseline — 2026-10-01

WTK Standard content and the confirmed gameplay-correction phase are complete.

- **30 / 30 Standard heroes**
- **46 / 46 printed Standard hero skills**
- **28 / 28 verified Standard card identities**
- Canonical **108-card Standard deck**
- Semantic responses/triggers and persisted continuations
- Canonical damage, Dying/recovery, Judgement, delayed Stratagem and equipment flows
- Private projection, stale/replay rejection and Quick Test infrastructure
- Completed Lord-role, Unrivaled multi-response, Retaliation random-Hand and Self Sacrifice timing corrections

## Active phase — functional UX improvement

**Goal:** make the completed ruleset easier to understand and operate without
moving game legality into the client.

### UX 1 — action and decision clarity

Review and improve the existing game screen so every seat can immediately
understand the current phase, turn owner, decision owner and required action.

Use existing authoritative fields such as `currentAction`, `actionPlayerId`,
`actionReason`, phase, response options and trigger options. Consolidate
duplicated or competing prompts into a shared status/command presentation.

For the acting seat, clearly present the required decision and its legal
card/target choices. For other seats, present a concise waiting state identifying
who is deciding. Preserve optional decline/skip controls and existing semantic
submissions.

**Exit gate:** normal multiplayer and Quick Test show one coherent authoritative
decision message for representative Play, response, trigger, Dying and waiting
states, with no change to server legality.

### UX 2 — selection and control feedback

Improve functional feedback for card selection, target selection, confirm,
decline/skip, disabled controls and in-flight submissions. Keep the server
projection as the source of legal IDs.

UI-08 is the current bounded slice: Borrowed Sword's server-authorized
`eligibleTargetIds` are selected locally in amber until Confirm, with Cancel
clearing the local choice and preserving the existing action/payload boundary.
Opaque private target-card pickers remain an explicit later gap.

### UX 3 — mobile/touch and information readability

Review the live responsive layout for crowded hands, opponent public zones,
hero/skill information, Equipment/Judgement readability and touch targets.
Prioritise usability over visual redesign.

### UX 4 — lifecycle feedback

Improve stale/rejected-action messages, reconnect/reload states, setup and hero
selection guidance, match-end flow and Quick Test perspective switching.

Graphic/art redesign is outside this functional UX roadmap unless explicitly
requested.

## Future TODO — Standard integration testing

After UX work, run targeted integration coverage across high-risk shared
boundaries: converted/virtual responses, damage and Dying nesting, Judgement,
equipment loss, distance/target legality, Negation, reload/stale handling,
privacy and Quick Test parity. Do not build an exhaustive pairwise hero matrix.

## Future TODO — end-to-end and release testing

Add a small set of deterministic multi-turn scenarios, persisted-state integrity
checks and release validation. A release candidate should complete:

```bash
npm run build
npm test
npm run lint
git diff --check
```

Then require GitHub Actions, Cloudflare deployment and production smoke
validation.

## Parked rules interpretation

Do not change the current source-zone interpretation for Guan Yu God of War,
Zhen Ji Empress Dowager, Gan Ning Ambushment, Da Qiao Captivating or Hua Tuo
First Aid without an explicit WTK ruling/source.

## Engineering constraints

- `currentAction` remains the authoritative client decision contract.
- Use generic `respond` / `decline_response` and `trigger` / `decline_trigger`.
- Server state owns and revalidates legality.
- Private information is projected only to the correct actor.
- Persisted continuations resume interrupted effects exactly once.
- Physical cards remain conserved.
- Quick Test follows the same rules as normal multiplayer.
- No provider-specific HTTP actions or second rules engine.

## Roadmap order

1. **Now:** functional UX improvement.
2. **Future TODO:** Standard integration testing.
3. **Future TODO:** end-to-end/persistence/release/production validation.
4. **Later:** explicitly choose expansion gameplay or another product direction.
