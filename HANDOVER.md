# HANDOVER — 当前唯一任务：§10.59 Step 2A 普通摸牌结果事实

**状态：实施完成，本地未测试；精确 SHA CI / 部署待执行。** 已复习远端 `ux-v2` 最新 `docs/UX2-refine.md`（revision `2026-11-16 01:34 UTC`）。本切片只将普通 Draw Phase 实际摸牌数量写入现有共享 `CommittedPublicOutcome`，不扩展 H4 路由或其他技能来源。

## 最近交付

§10.60 手牌滑动修正：代码提交 `2232d82970703e79e29a67e7d2ac4c638117ca32`，静态断言修正提交 `534b65a6522cfa055bd6f1ce97a45ec23acdad3f`；精确 SHA Actions [43789518444](https://github.com/dmoneyUK/three-kingdoms/actions/runs/43789518444) 全部通过，Worker `f1d47b59-16a0-44b8-8631-73e93adadaa6` 部署及生产 smoke 通过。状态 **IMPLEMENTED / DEPLOYED — PENDING OWNER iPHONE CHROME REVIEW**；本轮遵从 Owner 指示未再做实机测试。

2026-11-16 02:12 UTC：续作时确认 `ux-v2` 基线为 `534b65a6522cfa055bd6f1ce97a45ec23acdad3f`，其最近 Actions run `43789518444` 成功。审阅已有 §10.59 Step 2A 草稿及当前源代码；没有运行本地测试、构建或浏览器测试，遵从 Owner“我来测试”的指示。

## 当前任务与边界

- 以服务端 `draw.drawn.length` 记录真实公开数量；仅在手牌、牌堆、房间日志同一批次持久化中提交事实。
- 不公开卡牌 ID、名称、花色或点数；保留真实摸牌者的私有卡牌回执。
- 保持既有 `publicFactFor`、因果封套及验证路径；不修改玩法、权限或 H4 消费/仲裁。
- 原始 §10.59 未提交草稿保存在 `/Users/jingedai/.codex/worktrees/ux2-1049-expiry-20261115`，未改写；它基于 `a21dff7`，仅含 `app/api/rooms/route.ts` 这项 26 行变更及旧 HANDOVER。续作前须以当前 `ux-v2` 基线 `534b65a6` 安全移植该源码改动，继续保留原工作树。
- 当前改动：`app/api/rooms/route.ts` 使用服务端 `draw.drawn.length` 创建公开数量事实，并与牌堆、手牌、房间日志同批持久化；新增 `tests/api/normal-draw-public-outcome.test.mjs` 覆盖各观察者收到同一数量、牌身份不进入公开事实。保留真实摸牌者私有回执。
- 下一步：仅提交本任务的 route、API 回归用例及 HANDOVER；随后观察该提交精确 SHA 的必需 Actions、Worker 部署和生产 smoke。Owner 明确要求不再做实际测试；不得运行本地 UI/手机测试或自我验收 §10.60 / §10.59。
