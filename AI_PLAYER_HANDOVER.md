# Smart Bot Player — Coding Agent Handover

Branch `feature/smart-bot-player`. Design AIP-D29. Active validation is group 2, PLAY-05/05B/06/06B/07.

Group 1 passed [Actions 44982047842](https://github.com/dmoneyUK/three-kingdoms/actions/runs/44982047842) at `bc90145f5ae908d9c01cae29771aed5a7fbbafd5`. Group 2 code CI, including the canonical 1-human/3-Bot outcome fixture, passed at `ea65d1d3512d6ada9dffdc581439fef559893de1` in [Actions 44983894275](https://github.com/dmoneyUK/three-kingdoms/actions/runs/44983894275). The isolated Worker deployed, production was skipped, and mobile smoke timed out in room JCQY3 with BOT 3 thinking in play. A read-only room check later showed BOT 3 committed Attack and was waiting for a human response. The exact source of the delay was not established.

Repair prioritizes rooms with recent human presence or game activity in recovery, retains fairness within each tier and keeps the existing work caps. Smoke allows a bounded total time with an independent no-progress deadline. Recheck exact-SHA Actions and Staging before pushing group 3. No local tests ran.

Group 3 (AI-INT-01/02) is an uncommitted draft in `/private/tmp/WTK-AIP-SYNC-04-20261119` with actor-private observations, opaque candidate routing, an injected Responses mock, and fast/API tests. Keep it local during group 2 revalidation. Live OpenAI remains disabled. Real iPhone terminal-match evidence is still outstanding.
