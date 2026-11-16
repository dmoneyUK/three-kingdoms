# HANDOVER — 当前唯一任务：§10.61 Boundary B

## 最近交付结果

- **§10.62** 已实现并部署，等待 Owner iPhone 复验：commit `61bc60a53ca4dfcf7ddb145c2a79d0c6b28407a2`，精确 SHA Actions [43969554427](https://github.com/dmoneyUK/three-kingdoms/actions/runs/43969554427) 全绿，Worker `5302fb17-94d0-4647-81f2-429fe70709fd`，生产首页与 `/api/health` smoke 通过。
- **§10.63** 已实现并部署，等待 Owner iPhone 复验：commit `ee45f4c7fd9560a3fc59151be039e1200b2c31ba`，精确 SHA Actions [43973352179](https://github.com/dmoneyUK/three-kingdoms/actions/runs/43973352179) 所有必需作业通过，Worker `4581d450-2328-43c3-a8af-beba73299bfa`，生产首页与 `/api/health` smoke 通过。未运行本地浏览器或设备测试。

## 当前任务：§10.61 UNIVERSAL-PRECOMMIT-SELECTION-TOGGLE-01 — Boundary B

依据最新 `docs/UX2-refine.md` revision `2026-11-16 21:51 UTC`，设计 commit `c82c15d901f2340e57594dd08408ca638ed10fff`。Boundary A 的纯策略适配器已存在于 `app/local-precommit-selection.ts`，其焦点测试在 Actions `43964193573` 通过。

只接入 Turn 转换、武器和可撤销 provider 标签：Serpent Spear、Wusheng、Longdan 的 Play/Response 路径及 generic selectable Trigger/Response provider。活动控件保留原技能/武器/provider 名称和 `aria-pressed`；再次点击同一活动 owner 只清除其未提交的卡牌、目标、错误提示/预览，不发送动作。可撤销草稿只使用现有 primary `Confirm`，不显示同一草稿的 Local `Cancel`、`Normal` 或 `Form Attack`。保留服务端 CurrentAction 合法性、`serpent_spear_attack` 两张真实手牌和目标 payload、现有 conversion source、Skip/Pass、§10.58 名称和 §10.60 原生手牌滑动。

**当前进度：** Boundary B 实现及聚焦断言已修改，尚未提交。`app/page.tsx` 现在让 Serpent Spear、Wusheng、Longdan 的 Play/Response 与可选择的通用 Trigger/Response provider 保留稳定名称、`aria-pressed` 和同名再次点击退出；退出清除未提交卡牌/目标/本地提示，不发 action。统一使用现有 primary `Confirm`，去掉同一草稿的重复 Local Cancel，并保持原服务器 action payload。Serpent Spear 请求忙时不可切换。

已更新 `tests/active-skill-interactions.test.mjs` 中旧的 Cancel/Normal 断言，并补充 Wusheng/Longdan Play 与 Response、通用 Response 的确认 payload 和本地退出覆盖；同步更新 `tests/browser/hero-event-triggers-real-gameplay.spec.mjs`、`tests/room-safety-render.test.mjs` 的现有断言。没有运行本地测试、构建、浏览器或设备测试；`git diff --check` 已通过。提交前检查到当前远端 tip `ee45f4c7fd9560a3fc59151be039e1200b2c31ba` 的精确 SHA Actions `43973352179` 全绿。下一步检查完整 diff 后提交/推送，验证新 SHA 的必需 CI、Worker 部署及生产 smoke；通过后把唯一当前任务推进到 Boundary C。

交付本 Boundary 后，在 HANDOVER 中记录精确 commit、CI、部署/生产 smoke 和未覆盖范围，并将唯一当前任务推进至 §10.61 Boundary C。§10.61 总体状态保持未验收，等待 Owner iPhone 复验。
