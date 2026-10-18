# Current Handover

Branch: `ux-v2`

## Latest result

- **EM-01 P0 — VERIFICATION COMPLETE, PENDING USER REVIEW.** Production Worker source SHA `082091d752ff9e98a8eda23c8392b31396908022` passed exact-SHA Actions run [`39124315765`](https://github.com/dmoneyUK/three-kingdoms/actions/runs/39124315765), including deploy and production smoke; deployed Worker version `b08efa60-615f-4932-ae60-997ce8c889c8`. Current production `/api/health` returned `{"ok":true,"worker":"available"}`. A real four-seat Harvest flow on 390×700, 390×844, 440×766 and 480×900 passed touch SWITCH during another viewer's pick, actor select/re-tap/Confirm, Hero Inspector and Card Details. The reported touch interception did not reproduce on the current deployment; no production fix was needed.
- **Shared selection overlay regression:** 22 selected browser cases passed initially; two Stargazing cases hit the known Wrangler 4.128 ProxyWorker disconnect before UI assertions, then both passed in isolated retry with the repo's `CI=1` worker restart policy. Added an 8-player side-seat Burning Bridge case; 6- and 8-player 480×900 hit-test cases both pass. The audit also covered Steal/Burning Bridge, Retaliation Skip, Frost Sword/Kirin Bow, mandatory Stauchness, Legacy, Stargazing, private Card Details and Hero Inspector. The new 8-player assertion is awaiting exact-SHA CI/deploy.
- **Latest design reviewed:** `docs/UX2-refine.md` at commit `7be342124b7d3c5a88e1a298ffa901b709189ff5`, blob `0cd147694f76eecbc8e5cf23370bd431839bf8dc`; reviewed §10.16 and §10.17.1.1, §10.17.1.2, §10.17.4.1. The BCP-1 card scale/compact frame/bottom-centre Info/proportional thumbnail and Negation read-only-pool follow-ups, plus the clearer diagonal HUD-4 sword, are recorded there. Q1–Q4 remain user-paused. Preserve unrelated local edits and untracked handover/diagnostic files.

## Exactly one current bounded task

**UX2-10.16-EM01-CHOICE-OVERLAY-TOUCH-PASS-THROUGH-P0 — publish and verify the focused overlay regression.** Commit only the 8-player addition to `tests/browser/target-card-zone-picker.spec.mjs` and this handover; push `ux-v2`, then verify exact-SHA Actions, Worker deployment and production smoke. Preserve gameplay permissions, privacy, selection state and legal submissions. Mark **VERIFICATION COMPLETE — PENDING USER REVIEW**, never accepted. After closure, return to the latest design/handover planning boundary; Q1–Q4 remain paused.
