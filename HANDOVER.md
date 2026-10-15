# WTK UX2 — Current Handoff

Branch: `ux-v2`

## Latest result

Design authority reviewed: `docs/UX2-refine.md`, remote design blob `f46a5d8462f1b0b21863308f0821ebe9a0fa7c6e` (`c2df4b3`, §10.12 L1–L5). L1 public activity chip is implemented and **PENDING REVIEW**. Code commit `940a4cf2c36dce1f2ee83bd80b95de2d82986211`; test-only CI assertion repair `f9a04d72c4ce79efec33004d07137cf657145f60`. Exact-SHA Actions run [38753122010](https://github.com/dmoneyUK/three-kingdoms/actions/runs/38753122010) passed lint/fast, API, browser startup/room smoke, deploy and production smoke. Production `/api/health` returned `{"ok":true,"worker":"available"}` and `/` returned HTTP 200. No human review acceptance is claimed.

## Current task

**UX2-10.12-L2-GUIDANCE-SKILL-TOGGLE-01 — compact Diao Chan Lust guidance and cancel only an uncommitted local selection by tapping the active Lust skill again.** Keep L1's public activity chip as the public turn/waiting status. In the local `.decision-status`, show the actionable selection instruction and, once two server-eligible target IDs are selected, their actual Attack order. Remove only Lust's redundant local Cancel surfaces; preserve other skill, target-picker and response cancellation. Confirm remains derived from the current server-authorized Lust option and the same local card/target state.

**Validation:** add a focused authenticated Worker/D1 browser regression for visible Guidance, target order, active-skill second-tap cancellation (no request or card consumption), selection clearing, and a subsequent successful legal Confirm. Run that regression and directly affected focused checks, then follow the exact-SHA CI/deploy gate. Mark L2 **PENDING REVIEW** only with observed evidence; do not alter design requirements or claim human acceptance.
