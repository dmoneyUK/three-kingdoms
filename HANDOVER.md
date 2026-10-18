# Current Handover

Branch: `ux-v2`

## Latest result

- **EM-01 — IMPLEMENTED / DEPLOYED, PENDING USER REVIEW.** Reproduced Bumper Harvest in a real four-player game on the then-current live Worker/D1; the reported interception did not recur. Real touchscreen switching worked while another viewer chose; Hero Inspector and Card Details worked during the window; the chooser could inspect, select, re-tap to deselect, and confirm. Audited Steal, Burning Bridges, skill/equipment pickers, mandatory choices, Stargazing and Legacy: shared backdrops pass touches to the board and only bounded decision panels capture them. The browser hit-test regression covers 390×700, 390×844, 440×766 and 480×900, with actor and spectator identities. Shared overlay tests passed 26/26; focused Harvest/Burning Bridge run passed 2/2. No additional gameplay behavior change was needed. Test/handover commit `bc9bc9245a6b87a448a2a212fc6a9b5ea0a74ecf`; exact-SHA Actions run [`39121029621`](https://github.com/dmoneyUK/three-kingdoms/actions/runs/39121029621) passed lint/fast, API, browser startup smoke, D1 migration, Worker deploy and production smoke. Worker version `1edd4149-d310-4208-8f69-2b357e49a049`; `/api/health` returned `{"ok":true,"worker":"available"}`. **Not user accepted.**
- **BCP-1/2/3 and HUD-4:** implemented/deployed, pending user phone review; prior exact-SHA evidence is in `docs/AUTONOMOUS_UI_ROADMAP.md`.
- **INS-5 — IMPLEMENTED; CI REPAIR PENDING.** Source commit `23da8e66d29119496427de235cad1453fd0195ad`; exact-SHA Actions run [`39122358375`](https://github.com/dmoneyUK/three-kingdoms/actions/runs/39122358375) completed with lint failure: an unused duplicate `judgement` locator in `tests/browser/opponent-inspect-hero-focus.spec.mjs`. API and browser startup smoke passed; deployment was skipped. Removed only that unused declaration; focused ESLint and `git diff --check` pass. The lint repair and this handoff are ready for a scoped CI-repair push. Preserve the unrelated local CSS edits and untracked files. EM-01 remains **PENDING USER REVIEW**.
- **Latest design reviewed:** `origin/ux-v2:docs/UX2-refine.md`, blob `aa979ce2b4e33aadaa5c5b61f5f2adb1619c997e`, §§10.16–10.17.

## Exactly one current bounded task

**UX2-10.17-INS5-INSPECTOR-TWO-LEVEL-01 — implementation complete; repair CI failure before delivery.** Commit only the unused-variable lint repair and this handoff; preserve the unrelated local CSS hunks and all untracked files. The repair SHA must pass exact-SHA CI and deployment/production smoke before INS-5 is marked **IMPLEMENTED / DEPLOYED — PENDING USER REVIEW**. Then re-read the latest design and select one authorized next slice. Keep Q1–Q4 paused and preserve EM-01 as **PENDING USER REVIEW**.
