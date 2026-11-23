# Smart Bot Player — Coding Agent Handover

Branch: `feature/smart-bot-player` · Design reviewed: AIP-D35 with the Owner's AIP-STRAT-01A targeting amendment.

## Current task — AIP-STRAT-01A (`IN_PROGRESS`)

Owner directed implementation on 2026-11-23. Rank comparable legal Bot targets by recent committed public pressure, then break ties independently of seat, host and controller type. Preserve faction safety and priority, the underlying server legality, and the existing decision and response contracts.

Implementation ranks comparable hostile choices, including converted attacks, targeted skills and discretionary Borrowed Sword target choice. Canonical play records carry a server-only pressure marker, consumed in a bounded four-turn window inside Bot decisions. Equal-pressure ordering is stable across retries and does not use private state to derive its seed. The markers are removed from viewer projections. Unit tests cover seat and controller permutations, recent pressure, expiry, faction exceptions, forced responses and replay stability. A Worker API integration regression checks canonical hostile commits and public/private projections.

Validation: focused targeting and play-candidate tests passed (13/13). Focused ESLint and diff checks passed. The prior exact-SHA Staging job failed at the rejoin assertion because it compared an opaque string revision numerically. The test correction is included so this push can verify the same isolated Staging gate without changing room protocol.

Run [45101565419](https://github.com/dmoneyUK/three-kingdoms/actions/runs/45101565419) for `55806f09` passed the lint/build/fast and browser jobs. API failed because the new integration test expected a non-viewer Bot’s Dodge requirement in the human projection. The fixture now checks canonical persisted pending state for Bot targets while preserving the client privacy check. Staging was skipped on that run.

Next: verify exact-SHA GitHub Actions, isolated AI Staging deployment and mobile smoke, with production skipped. Keep this task in progress until those outcomes are observed, then stop at PENDING_REVIEW for Owner gameplay acceptance.

AIP-PERF-01 remains open. Its previous local checkpoint is saved at `/private/tmp/WTK-AIP-PERF-01-before-STRAT-01A.md`. Resume that task only from the latest design and recorded CPU evidence.
