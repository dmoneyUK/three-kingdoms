# HANDOVER — 当前唯一任务：§10.59 UNIVERSAL-H4-COMMITTED-FACT-COVERAGE-01

**状态：NOT CLOSED。** 所有有界提交属于同一任务，不设阶段验收。完成指定服务端结果来源覆盖、公共事实保留、唯一 H4 owner 和系统级回归后，再交 Owner 做一次最终 iPhone 验收。设计：`docs/UX2-refine.md` §10.59，revision `2026-11-16 09:42 UTC`。

## 最新实现结果

- Implementation commit `656ccfad28212f9a9b8f55b7de86b709c2ea5de8`；精确 SHA Actions [43910038079](https://github.com/dmoneyUK/three-kingdoms/actions/runs/43910038079) 完整重跑成功。首次 attempt 的 API shard 1 在 `judgement.test.mjs` 第 99 个用例处开始连续 `fetch failed`（测试 Worker 连接错误）；同 SHA 第二次全量运行 API、lint/build/fast、browser startup smoke 均通过。
- D1 远端 migration 成功（无待应用 migration）；Worker 部署成功，Version ID `d97ee180-e664-4d7b-988c-13739e1847b6`。生产 smoke 及额外线上 `GET /api/health` 均成功，返回 `{"ok":true,"worker":"available"}`。
- 本次未运行本地测试、构建或设备/browser 测试；`git diff --check` 通过，遵循 Owner 指令。

## 当前 §10.59 进度

- `game/presentation-v2.ts` 每次从已验证的公开 timeline 产生有界 retained facts 队列；singular retained owner 仍只在 REST 或与活动 causal envelope 匹配时产生。
- `game/presentation-snapshot.ts` 将已验证 retained facts 与当前 interaction facts 分开透传，只去除活动列表已有的 event ID，不截断事实的前后顺序。唯一 H4 选择仍由真实 `publicSequence` 游标仲裁。
- 保留前一阶段的 validated retained fact queue 与 Discard Phase `HAND → DISCARD` 精确数量/共享 formatter/actor-observer owner 回归；当前部署代码已覆盖这些结果。
- 借刀杀人两种真实装备转移结算（强制攻击无合法目标、攻击者拒绝）现均附带共享 `CommittedPublicOutcome`：实际 `EQUIPMENT → HAND`、数量 1、转出/接收玩家；不泄露物理卡牌 ID。`tests/api/borrowed-sword.test.mjs` 断言两个分支、通用 H4 文案和 actor/observer 公共投影一致；API shard 2 通过。
- 本轮补齐 `choose_target_card` 的真实 Steal/Burning Bridges 结算：Steal 对 HAND/EQUIPMENT/JUDGEMENT 到 HAND 发布精确 `CARD_TRANSFERRED`；Burning Bridges 对三种来源区到 DISCARD 发布精确 `CARD_DISCARDED`，并沿用公开弃牌 transition 与原 settlement proof。`tests/api/stratagems.test.mjs` 的六路径矩阵新增通用 H4 owner/文案、跨 viewer 一致、精确区域/数量和 outcome 不含物理牌 ID 断言。Steal 手牌身份仍只由既有 viewer-private receipt 提供。
- 未运行本地测试、构建或设备/browser 测试；仅 `git diff --check` 通过。

## 唯一续接点

继续同一 §10.59：在这次 Steal/Burning Bridges 结果接入通过精确 SHA CI 后，继续核对 §10.59 列出的其他真实 HP/卡牌变更服务端来源，接入同一 outcome publisher、留存与唯一 H4 owner，完成系统级覆盖/隐私/recency 回归。仍不运行本地测试、构建或设备/browser 测试；只执行必需的精确 SHA CI、部署和生产 smoke。不要拆分任务、请求阶段验收或标记 USER-ACCEPTED。
