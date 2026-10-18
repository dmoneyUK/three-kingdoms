# Current Handover

Branch: `ux-v2`

## Latest result

- **EM-01 — P0, verification in progress.** Reproduced Bumper Harvest on the current live Worker/D1 with an authentic four-player game; the touch interception did not recur. Verified actual touchscreen TEST SWITCH while another viewer was choosing, then Hero Inspector and private Card Details, plus chooser-only card Info/select/re-tap/Confirm. Audited Steal, Burning Bridges, skill/equipment pickers, mandatory choices, Stargazing and Legacy: current shared roots pass through board touches and only bounded decision panels accept them. No new gameplay-source patch was needed; this turn adds hit-test diagnostics and regressions. Real live browser coverage: 390×700, 390×844, 440×766 and 480×900, actor/spectator identities. Focused shared-overlay suite passed 26/26; Harvest/Burning Bridge focused run passed 2/2. Current live baseline source `5a8505efa0d29e4eeea34e41baa5267956419efb`, Actions run `39118588563`, Worker `27ff6996-a6bc-4c39-ac5b-4c16461f1a61`. The new test/handover commit still needs exact-SHA CI/deployment. **PENDING USER REVIEW**, not accepted.
- **BCP-1/2/3 and HUD-4:** implemented/deployed; pending user phone review. Evidence and exact-SHA runs are recorded in the roadmap and prior handover.
- **Latest design reviewed:** `origin/ux-v2:docs/UX2-refine.md`, blob `aa979ce2b4e33aadaa5c5b61f5f2adb1619c997e`, §§10.16–10.17.

## Exactly one current bounded task

**UX2-10.16-EM01-NONBLOCKING-CHOICE-OVERLAYS — VERIFY/DELIVER.** Commit only `HANDOVER.md` and the two EM-01 browser specs, push `ux-v2`, and verify the exact SHA’s Actions deploy and Worker smoke. Preserve all other local changes, especially the in-progress INS-5 source and browser tests and untracked user file `HANDOVER 3.md`. After exact-SHA success, update this handover with the run and make INS-5 the sole next task. Do not mark EM-01 accepted; keep **PENDING USER REVIEW**.
