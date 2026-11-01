# HANDOVER — Current Task Only

Repository: `dmoneyUK/three-kingdoms` · target: `origin/ux-v2`

## Current task

**§10.27 M4 — generic public Discard/reveal and known zone exits.**

Design reviewed: `docs/UX2-refine.md` at `78a3efa381af4ce807c8505652375c53ee616f38`, §§10.27.3–10.27.5 and the new §10.28 scheduling boundary; `docs/AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md` §§2, 4–10.

**Status: IMPLEMENTED LOCALLY — exact-SHA CI/deployment pending.**

**Progress (2026-11-01 20:28 UTC):** The E16 route attaches server-proven public transitions to ordinary committed `action: "discard"` events, routes each exact physical card from its proven Hand/Equipment/Judgement anchor to the Discard anchor, and retires only that event after animation. Dismantle settlements and `publicCardEffects` stay with their existing renderers; private gains and private events do not route. E15 `action: "play"` roots remain with their existing validated `PublicCardDisplay` owner; `app/page.tsx` excludes owned event and physical-card IDs from `TableResolutionSequence`. Remaining named static-fallback roots stay on the existing M5 allowlist. The M4 discard route explicitly rejects `action: "play"`, preventing a second owner. This work is still uncommitted and unpushed.

**E15 ownership boundary:** Do not add a second Discard Journey for an `action: "play"` root. The existing public root renderer is the authorized visual owner while the committed action is presented; generic static-fallback roots are explicitly retained only through M5's named allowlist. The focused regression proves that the M4 route does not claim a play root.

**Validation already run:** `npm run build` passed; targeted API file passed 30/30; combined `tests/public-discard-transition.test.mjs` and `tests/public-presentation-routing.test.mjs` passed 13/13; targeted ESLint reported zero errors and two existing React-hooks warnings; `git diff --check` passed. A direct `npx tsc --noEmit --pretty false` produced project-wide errors including missing Cloudflare ambient types, while the repository build passed. No browser test was run. The current M4 code has no exact-SHA CI or deployment because it has not been pushed.

**Latest remote evidence:** `origin/ux-v2` is `78a3efa381af4ce807c8505652375c53ee616f38`; its four commits since the prior baseline change only `docs/UX2-refine.md`. The updated design says not to interrupt M4; at the next clean boundary it sequences the separate CONSOLE-01 geometry correction, then PUBLIC-INSPECT-REVEAL-01, ahead of M5/M6. Latest relevant push Actions run [41333906965](https://github.com/dmoneyUK/three-kingdoms/actions/runs/41333906965) passed at `fd126344684a1029c7ebcb6a8fbd2751d1f5a18c`; it does not validate current M4 work. The current worktree is on `codex/console-01` and has local uncommitted changes. An untracked `tsconfig.tsbuildinfo` is also present and excluded from the M4 change.

**Pre-commit gate (2026-11-01 20:28 UTC):** Confirmed the latest relevant Actions run has all four jobs green; intervening remote commits are documentation-only and `deploy.yml` excludes Markdown-only pushes. `git diff --check` passes. M4 still requires its own exact-SHA run and deployment after push.

**Related completed technical deliveries:** §10.25.3 Step A and Step B, and §10.26 CONSOLE-01, are implemented/deployed and remain **PENDING OWNER iPHONE REVIEW**. Do not infer owner acceptance or reopen them without new evidence.

**Resume point:** Recheck remote `ux-v2` and the latest required push workflow. Commit/push only the M4 implementation, focused regressions and this HANDOVER update; wait for exact-SHA Actions, Worker deployment and production health. At the next clean planning boundary, reread the latest design and select one current task in its then-current order.
