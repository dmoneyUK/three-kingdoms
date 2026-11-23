# Smart Bot Player — Coding Agent Handover

Branch: `feature/smart-bot-player` · Design: AIP-D35 plus the Owner’s `JDCA3` repair instruction.

## Current task — AIP-PERF-01, long-room CPU and Dodge recovery (`IN_PROGRESS`)

Dodge payment/settlement is atomic in `bcef2464`; the injected interruption and concurrent-retry API regression passed in both code-bearing runs. Latest Staging source `34845f303244bac4e940b11fbd12190f8d5afa34`, [Actions 45140894879 attempt 2](https://github.com/dmoneyUK/three-kingdoms/actions/runs/45140894879/attempts/2), Worker `4b48f6cc-846e-4067-9ba4-551d463f16fe`. `U4VQJ` reproduced CPU-limit errors starting 7m35s after play began. D1 advanced through the Bot cycle. Mobile smoke timed out at the host’s Draw Phase. Hosted profile during the errors sampled D1 result conversion, JSON response serialization and timeline projection. Redacted Tail and profile evidence: `/private/tmp/wtk-jdca3-ci.Ieq42e`.

Implemented the targeted reduction of duplicate wide D1 reads on authenticated room polling. The member lookup supplies the discard-handoff candidate while the existing deadline and compare-and-set behavior still apply. Extended the API regression for public, invalid-token and authenticated reads. Focused ESLint, syntax and diff checks passed. Resume at the successor exact-SHA Actions and isolated Staging, then compare hosted CPU samples. Keep existing `JDCA3` untouched.
