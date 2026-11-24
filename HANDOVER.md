# HANDOVER — UX2 §10.70 KIRIN-BOW-COMPACT-CARD-POOL-01

**Design reviewed:** `docs/UX2-refine.md` at `f691470c9f6673f37dd8552fc58af8970e85bb1c`. Work is isolated in the linked `ux-v2` worktree; unrelated root-worktree changes remain untouched.

**Current task:** Route only authorized opponent Kirin Bow selections through the shared compact actor-target pool. Project only CurrentAction-eligible physical Equipment cards; preserve server legality, privacy, Skip/Confirm, Retaliation behavior and normal damage continuation.

**Implementation checkpoint:** Shared pool and fail-closed equipment projection are implemented. A single 390×844 browser run reached the pool but found overlap with the public H4 journey-copy. Kirin placement now opts into the existing shared H4/PAC obstacle protection; the browser scenario was not rerun under the one-run limit. Treat final live geometry as **UNVERIFIED** pending exact-SHA CI and owner iPhone review.

**Validation:** Fast layout/render regressions 101/101 passed; focused equipment API file 22/22 passed; `npm run build` passed; `git diff --check` passed; ESLint passed for changed files except `app/page.tsx`, where the plugin overflowed with `RangeError` at existing line 4135. Exact-SHA Actions, deployment and production smoke remain pending.

**Status / resume point:** One active task only: §10.70. Finish diff review, commit and push to `ux-v2`; verify exact-SHA Actions, Worker deployment and production smoke; then record their real results here. Do not start another task or mark USER-ACCEPTED. Final UX status must remain **IMPLEMENTED / DEPLOYED — PENDING OWNER iPHONE REVIEW** only after deployment succeeds.
