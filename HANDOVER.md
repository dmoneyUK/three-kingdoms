# HANDOVER — 当前唯一任务：§10.59 UNIVERSAL-H4-COMMITTED-FACT-COVERAGE-01

**状态：NOT CLOSED。** 所有有界提交属于同一任务，不设阶段验收。完成指定服务端结果来源覆盖、公共事实保留、唯一 H4 owner 和系统级回归后，再交 Owner 做一次最终 iPhone 验收。设计：`docs/UX2-refine.md` §10.59，revision `2026-11-16 09:42 UTC`。

## 最新已部署结果

- Commit `7ad4a6c0e714ff3c6e55585a69ac66c765f3d8e1`；精确 SHA Actions [43906259312](https://github.com/dmoneyUK/three-kingdoms/actions/runs/43906259312) 的完整重跑全部成功。第一次执行同一 run 时 API shard 1 出现连续 `fetch failed`，目标 Discard 回归所在 shard 2 通过；完整重跑后 API、lint/fast、browser startup smoke 全绿。
- D1 远端 migration job 成功（无待应用 migration）；Worker 部署成功，Version ID `0bf97a5e-2749-4ea9-9206-35e7e957dba4`。CI production smoke 与额外线上 `GET /api/health` 均成功，返回 `{"ok":true,"worker":"available"}`。
- 本次未运行本地测试、构建或设备/browser 测试；`git diff --check` 通过，遵循 Owner 指令。

## 当前 §10.59 进度

- `game/presentation-v2.ts` 每次从已验证的公开 timeline 产生有界 retained facts 队列；singular retained owner 仍只在 REST 或与活动 causal envelope 匹配时产生。
- `game/presentation-snapshot.ts` 将已验证 retained facts 与当前 interaction facts 分开透传，只去除活动列表已有的 event ID，不截断事实的前后顺序。唯一 H4 选择仍由真实 `publicSequence` 游标仲裁。
- 新增快照回归覆盖活动 root 前后的已提交弃牌/摸牌事实；Discard Phase API 回归验证真实 HAND→DISCARD proof、准确数量、共享 formatter、event identity 及 actor/observer 同一 owner。该 API 用例在精确 SHA 全量重跑中通过。

## 唯一续接点

继续 §10.59 的剩余结果来源覆盖与系统级 coverage/unique-owner 回归：普通抽牌与弃牌、damage/prevention、恢复与濒死续接、不同英雄技能、装备/转移/群体效果，以及 refresh/observer/阶段切换下的公共事实顺序与唯一展示。仍不运行本地测试、构建或设备/browser 测试；只执行必需的精确 SHA CI、部署和生产 smoke。不要拆分任务、请求阶段验收或标记 USER-ACCEPTED。
