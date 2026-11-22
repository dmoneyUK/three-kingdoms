# Smart Bot Player — Current Coding Agent Handover

Branch: `feature/smart-bot-player`. Active worktree: `/private/tmp/WTK-AIP-SYNC-04-20261119`.
Design: AIP-D29. Remote base: `bccbd5b15bfdcecf1b8668abea579da4a99194fa`.

## Current batch: IN_PROGRESS — items 1–4 (PLAY-01/02/03/04)

Owner delivery order: first commit PLAY-01 through PLAY-04. Second commit PLAY-05, PLAY-05B, PLAY-06, PLAY-06B and PLAY-07. Third commit AI-INT-01 and AI-INT-02 after the PLAY milestone review. Validate each pushed group on GitHub Actions. The previous LOG/OBS/RSP batch retains its review status.

First group implements the private Attack catalogue and canonical dispatch, wounded self-heal, empty-slot equipment, Draw Two, and canonical physical/converted combat responses. Tests cover basic play priority, stable Dodge selection, multi-step Dodge, conversion, and one canonical revision per action. Staging smoke handles a response offered to the human by an active Bot. First group pushed at `f2f16ea36168fc122469f8746d3a78eed7d42f0d`. [Actions 44979439338](https://github.com/dmoneyUK/three-kingdoms/actions/runs/44979439338) passed lint/build/fast and browser smoke. API failed because two prior fixtures gave Bots a now-playable Attack during draw/end-turn assertions, and a privacy check incorrectly expected a played Dodge to stay hidden. Repair fixtures to isolate draw/end-turn and require the unplayed Dodge plus diagnostics to stay private. Staging and production were skipped. Revalidate the repair SHA through Actions. Await exact-SHA CI before starting group two. No local tests were run. The validated base is code SHA `67d1268e5c7744e2f245890fad2d36afbba0f53b` ([Actions 44969516916](https://github.com/dmoneyUK/three-kingdoms/actions/runs/44969516916)).

## Authority gaps for the second batch

- PLAY-05 multi-target fixture: equip a Bot with Sky Piercing Halberd, give it one Attack as its last hand card, and place two living opponents in range. The play projection provides eligible target IDs per physical card. It has no authoritative target-count field for this mode. Canonical `play_card` accepts up to three targets here, and only one for an ordinary Attack. Expose the canonical target-count decision to the private catalogue before enumerating target combinations.
- PLAY-06 shared-window fixture: a Negation or shared dying window with two eligible Bots and a human. Both `roomState` and `actionPlayerIdForPending` return no single actor by design. `worker/bot-driver.ts` schedules from the public single actor and `POST` requires the internal principal to match that actor. Define a server-only per-participant scheduler/principal contract that identifies eligible unlocked Bots, pins the window and revision, and preserves the existing canonical submission CAS. A public actor substitution would bypass the existing ownership contract.

Resume by checking GitHub Actions for the first group commit. Preserve the three delivery groups. Group two owns the remaining card, judgement, Hero and shared-window continuations, followed by canonical match completion.

Repair run [44980147160](https://github.com/dmoneyUK/three-kingdoms/actions/runs/44980147160) passed all code jobs and deployed isolated AI Staging. The post-deploy smoke timed out after BOT 2 and BOT 3 completed, with BOT 4 still thinking. This observed state does not establish why the last turn took longer. Scope bounded post-write wakes to the room that changed so other rooms cannot consume their steps. Allow for active play and Cron recovery in the smoke and record safe room/phase/seat evidence if it times out again. Recheck the pushed repair in Actions before moving the second group forward.
