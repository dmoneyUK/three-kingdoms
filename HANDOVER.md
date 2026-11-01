# HANDOVER — Current Task Only

Repository: `dmoneyUK/three-kingdoms` · target: `origin/ux-v2`

## Current task

**§10.27 M4 — generic public Discard/reveal and known zone exits.**

Design reviewed: `docs/UX2-refine.md` at `fd126344684a1029c7ebcb6a8fbd2751d1f5a18c`, §§10.27.3–10.27.5 (M4); `docs/AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md` §§2, 4–10.

**Scope:** Route E15/E16 only from real committed public-card facts and authoritative terminal destinations. Preserve the actual author, original physical card ID, destination, viewer rebasing, replay safety, and true public/private reveal distinction. A Dismantle discard remains one fact with **no second public result CardFace**. Keep private hand-picker candidates, recipient-only R7 gains, and R4 skill-cost material private. Remove only the corresponding legacy presentation paths proven replaced.

**Acceptance:** Focused regressions prove one truthful owner for public exits, correct physical identity and final zone after polling/rebase, no duplicate parked card, no fabricated card for private/nonrevealed outcomes, and no gameplay/legal-action change. Local UI/browser work stays within five minutes; owner phone review remains separate.

**Resume point:** M3 source is deployed at `fd126344684a1029c7ebcb6a8fbd2751d1f5a18c`. Exact-SHA [Actions 41333906965](https://github.com/dmoneyUK/three-kingdoms/actions/runs/41333906965) passed all required jobs after a same-SHA rerun; Worker `c5dab198-acc2-4ad0-8036-c1cec9f7dd32` deployed and production `/api/health` returned HTTP 200. M3 remains **PENDING OWNER PHONE REVIEW**. The run's first attempt had an API shard `fetch failed`; the full rerun passed without source changes. Latest `origin/ux-v2` CI is green. M4 is the only active task.

**Stop condition:** If any E15/E16 transition lacks authoritative public source, physical identity, or terminal destination proof, do not infer it or broaden the schema silently. Record the exact missing producer/consumer field and stop that route.
