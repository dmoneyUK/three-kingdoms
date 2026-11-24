# HANDOVER — UX2 §10.70 KIRIN-BOW-COMPACT-CARD-POOL-01

**Design reviewed:** `docs/UX2-refine.md` at `f691470c9f6673f37dd8552fc58af8970e85bb1c`. Work is isolated in the linked `ux-v2` worktree; unrelated root-worktree changes remain untouched.

**Current task:** Route only authorized opponent Kirin Bow selections through the shared compact actor-target pool. Project only CurrentAction-eligible physical Equipment cards; preserve server legality, privacy, Skip/Confirm, Retaliation behavior and normal damage continuation.

**Implementation checkpoint:** Shared pool and fail-closed equipment projection are implemented. A single 390×844 browser run reached the pool but found overlap with the public H4 journey-copy. Kirin placement now opts into the existing shared H4/PAC obstacle protection; the browser scenario was not rerun under the one-run limit. Treat final live geometry as **UNVERIFIED** pending owner iPhone review.

**Validation checkpoint:** Fast layout/render regressions 101/101 passed; focused equipment API file 22/22 passed; `npm run build` passed; `git diff --check` passed. Exact SHA `54e584a8bc36685e1e8f51b002e83b667ae73b88` Actions run `45373362897`: API tests and browser startup/H4 smoke passed; lint failed on the new inline `placement.*` hook-result property reads; deployment was skipped. The code now destructures the placement result before render. Local ESLint still overflows in `react-hooks/rules-of-hooks` at `GameRoom` line 4135, so exact-SHA CI is required to verify the correction. Production smoke and deployment are not yet verified.

**Status / resume point:** One active task only: §10.70. Commit and push the lint correction to `ux-v2`; verify exact-SHA Actions, Worker deployment and production smoke; then record their real results here. Do not start another task or mark USER-ACCEPTED. Final UX status must remain **IMPLEMENTED / DEPLOYED — PENDING OWNER iPHONE REVIEW** only after deployment succeeds.
