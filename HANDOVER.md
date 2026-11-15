# HANDOVER — 当前唯一任务

## §10.53-F1 — H4、PAC、私有 Console 的验证玩家姓名样式

**状态：** 实现 `5401174d1214a447d4ce00aa76c3ca73a7ba7f77` 已推送；该 SHA 的 Browser/API 通过，Lint/fast tests 失败，尚未部署。当前正在修复一个旧测试对 DOM 直接子文本结构的假设；产品文案与实际行为未变化。修复 SHA 的精确 CI、部署及 smoke 待完成。

**设计基线：** `docs/UX2-refine.md` revision `2026-11-15 15:32 UTC`，§10.53-F1 A–D。远端基线 `origin/ux-v2` = `fbd515a659012618bb3e7c1189e63496de1c7736`。本地分支 `codex/ux2-1049-expiry-20261115`，交付目标 `ux-v2`。

### 当前实现

- `game/verified-player-copy.ts` 提供共享 typed 片段、精确拼接验证；`app/verified-player-copy.tsx` 仅渲染通过验证的玩家片段，失败时输出原文纯文本。H4 导出保持向后兼容。
- PAC 的已证明玩家身份在原文生成处携带 ID，覆盖回合、抽弃牌、handoff、判定、Attack/Dodge、Negation/Harvest、借刀、目标选牌及公开共享响应参与者。PAC 文案、aria-label、跨观察者一致性及隐私保持不变。
- 私有 Console 对等待者、当前交互参与者、借刀持有者/目标、目标选牌、Lust 顺序及直接 ID 生成的无效目标提示提供相同姓名标记；不解析 `CurrentAction.reason` 或动态技能文案，未证明片段回退为原文。
- 最后覆盖样式采用 muted gold、600 字重、`letter-spacing:-0.05em`；H4 12px、PAC 12/10px、Console 11px（手机 10px），不调整区域几何。

### 本次执行记录（UTC）

- **16:09** — 核对工作树与最新远端 HEAD；只保留 §10.53-F1 为 HANDOVER 当前任务。
- **16:09** — 定向 Node 测试通过 **89/89**：PAC 文案/隐私、H4 精确文本与可访问文案、Console 权威 ID 和回退、房间渲染回归。
- **16:09** — `npm run build` 通过；`git diff --check` 通过。
- **16:09** — 定向 ESLint（除 `app/page.tsx`）通过，0 error、14 条现存 hooks 警告。单独 lint `app/page.tsx` 在 `react-hooks/rules-of-hooks` 行 4000 栈溢出；此大型组件在未修改的基线副本上此前也复现同一问题，记录为工具限制，不改规则或扩大重构。
- **16:09** — 未启动本地浏览器测试：一个场景不能同时展示公共 PAC/H4 和 viewer-private Console 的所有身份分支；不以此宣称手机验收。Owner iPhone review 保留。
- **16:09** — 提交前 CI 门禁：`ux-v2` 最新相关成功 push run 是 SHA `6bcef5a3169746edae3edbfc0eab66108f1952b9` / Actions `43729279654`；`fbd515a` 为 Markdown-only 更新，无独立 run。待本任务代码推送后核验精确 SHA 全部 required jobs、Worker 与 smoke。
- **16:12** — 提交并推送实现 SHA `5401174d1214a447d4ce00aa76c3ca73a7ba7f77`。Actions [43734155916](https://github.com/dmoneyUK/three-kingdoms/actions/runs/43734155916)：Browser startup/room smoke 与 API tests 通过；Lint/fast tests 失败（410/411），部署未运行。
- **16:16** — 失败项是 `tests/active-skill-interactions.test.mjs` 的 Cultivation 私有提示断言直接读取 `strong.props.children`。局部复现确认组件实际文本未变，仅多了共享片段渲染层；调整测试为读取渲染后的可见文本，并定向重跑该场景通过 1/1。当前仅此测试文件和本 HANDOVER 有待提交。

### 下一步

提交这次针对 CI 测试假设的窄修复并推送 `ux-v2`；等待修复 SHA 的全部 required Actions、Worker 部署及生产 smoke。然后依用户要求重审 §10.49 与 §10.51 的最新失败意见，并在安全边界将单一当前任务写入本文件。
---

## NEXT P0 — ORIGINAL §10.49 Liu Bei 8s Shared Response Window expiry race (NOT F1, NOT a new task)

**Status: OWNER iPHONE FAIL / NOT FIXED / NOT ACCEPTED**, 2026-11-15 17:24 UTC. This is an acceptance BLOCKER of the SAME previously implemented shared-response window task §10.49. Previous owner 16:11 iPhone PASS for a then-tested Cao Cao timer case is historical; new Liu Bei expiry freeze reopens original task, not an F1. **Preserve and safely finish the CURRENT §10.53-F1 in-flight lint/fast-test correction, exact-SHA CI, deploy and smoke first**; do not reset/uncommit any working tree or let two agents concurrently change `app/page.tsx`. At the next safe handoff, move ORIGINAL §10.49 to the sole CURRENT task in this handover, not ahead of ongoing code delivery. Queued §§10.54–10.58 remain lower priority. One authoritative full implementation contract: `docs/UX2-refine.md` **current §10.49 P0 acceptance blocker**, committed in `2fb0e0951d6131d15499cdc2867a71d93cbff83c`.

**Evidence, exact OWNER files:** iPhone `ScreenRecording_11-15-2026 17-20-27_1.mp4` (9.7s) and `wtk-game-ux-trace-2026-11-15T17-20-58.649Z.json` (254 entries), build `fc3496a0c0dc005aa5dc2da2432d3a679b9943d3`. Liu Bei Seat3 real Influencing Play Phase `trigger` 200 at **17:20:33.223 UTC**; Zhao Yun Seat0 legal shared Attack intent `respond` 200 at **17:20:37.358**, shown privately locked. Guan Yu Seat1 does not respond. Window deadline **17:20:41.055**; room GET started **17:20:41.020**, returned 200 **17:20:41.248**, so a normal GET overlaps the precise deadline. The video shows 8→0 and persistent waiting. Through **17:20:57.942**, repeated GET200, `phase:"response"`, **ZERO `advance_timers`**, ZERO 409/old automated Pass. This is NOT the earlier Cao Cao timer 409 loop.

**Verified source and leading cause:** Actual `app/page.tsx` L1789–1800: `fetchRoom` returns `false` if `RoomPollRecovery.begin(requestKey)` sees same-key GET already in flight. Public shared expiry watcher L2166–2230 schedules its `advance()` once for the 8s deadline; it FIRST calls `fetchRoom` L2204 and then terminally `return` on falsy `live` L2207 **without retry** after timer is cleared L2197. Thus the overlapping regular GET can silently consume the only expiry attempt; neither `advance_timers` nor the server's `advanceSharedResponseWindow` ever executes. This is a strongly supported race that **must be proven deterministically** under controlled concurrent GET, not an excuse to rewrite Shu priority, card rules or display projections.

**Do these exact actions, in order:**

1. Narrowly fix the ONE existing shared public-window deadline watcher in `app/page.tsx`: distinguish `fetchRoom() === false` transient/coalesced/epoch failure from successful authoritative room state proving changed/closed window. Preflight and post-POST GET `false` MUST schedule bounded retry for the same `roomCode+windowId+deadline` (or safely await the already in-flight GET); never silently return forever. Stop only on real proven changed window/completed game, cancellation, or hidden/resume handling. Preserve epoch, TEST SWITCH privacy, no repeated timer reset, backoff, no unbounded rapid loop, one in-flight maintenance POST and server CAS.
2. Keep server-authoritative `advance_timers`/8s deadline, ONE WINNER PER ROUND, only one true winning physical Shu Attack/Dodge-as-Attack paid by helper, Liu Bei as semantic attacker. No loser Hand cost or fake card, no late Skip/Pass, no GET mutation, no new per-Liu-Bei timer.
3. Extend `tests/browser/shared-response-expiry-real-gameplay.spec.mjs` or pure watcher tests with deterministic Liu Bei Seat3/Zhao Yun Seat0/Guan Yu Seat1 silent/Ma Chao target Seat2; hold ordinary poll GET from deadline-35ms to deadline+193ms so the timer preflight sees a colliding `false`. Prove eventual retry + `advance_timers` + one genuine Attack consumed/author/target continuation. Verify no permanent 0s, no duplicate POST/card, no wrong viewer; add transient GET 503, false after POST, TEST SWITCH, hide/show, reload, all-Pass fallback, two racing clients and existing Cao Cao/Dying/Negation/old response regressions. Targeted deterministic tests, NOT a broad exploratory test matrix; max one four-player local UI run ≤5 min total.
4. Deliver code+regressions on `ux-v2`; exact SHA required CI/full API/Worker deployment/production smoke and truthful HANDOVER. Status can become `IMPLEMENTED / DEPLOYED — PENDING OWNER iPHONE RE-REVIEW` only after verified technical gates, and USER-ACCEPTED/CLOSED **only** after owner independently watches Liu Bei 8s expire into the original genuine game continuation. Do not start queued §10.54–58 or erase old 16:11 acceptance history.

**No additional video needed**; uploaded evidence is enough to implement the race regression. No new §10.49-F1, no broadened gameplay rule project. Only scoped expiry/preflight coordination.
