# HANDOVER — 唯一未完成任务：§10.59 UNIVERSAL-H4-COMMITTED-FACT-COVERAGE-01

**总状态：NOT CLOSED；所有代码阶段属于同一任务，不逐段请求验收。** 最新复习的设计为 `docs/UX2-refine.md` revision `2026-11-16 09:42 UTC`。完成服务端来源覆盖、统一消费/唯一 H4 所有权及系统级回归后，再交给 Owner 进行一次 iPhone 最终验收。

## 最近已部署基线

- `26f46123d45a717a778794b5a1372827a4086e40`（`ux-v2`）：精确 SHA Actions [43879485226](https://github.com/dmoneyUK/three-kingdoms/actions/runs/43879485226) 全绿；API、Lint/fast、build、browser startup、D1 migration、Worker deploy 和生产 smoke 均通过。Worker `2ffba680-7499-46ce-86ec-040950241fd8`。
- 已部署范围含普通抽牌、恢复结果及 Dying 续接公开结果；仍不能代表 §10.59 全面完成或通过 Owner 验收。

## 当前实施进度（2026-11-16 14:26 UTC）

- `b16643b6860b3b7c9766be151eca82a2b26aede3` 已推送，包含郭嘉遗计私密分配的实际收牌数事实（只公开人数和数量，不含私牌身份）、闭月实际抽牌数事实及共享 API 断言。
- 精确 SHA Actions [43884626527](https://github.com/dmoneyUK/three-kingdoms/actions/runs/43884626527)：Lint/fast、build、浏览器启动 smoke 通过；API 在闭月回归断言失败，部署跳过。实际失败为 `DRAWN` 专用事件未携带 `committedOutcome`，并非抽牌数量错误。
- 按失败证据，发现公开 turn-end 触发窗口未建立/保存因果身份。当前本地修正是在共享 turn-end 窗口创建通用因果根并随 pending 一起持久化，使所有公开 turn-end provider 都能接入既有结果发布器；不添加貂蝉专属发布分支。尚未提交或由远端 CI 验证。
- 按 Owner 指令，没有运行本地测试、构建或设备测试；待将此修正推送后，由精确 SHA 远端 CI 验证。

## 唯一续接点

先完成 turn-end 通用因果上下文修正并通过精确 SHA CI、部署、生产 smoke；之后继续 §10.59 已列出的其他结算来源，再完成公开类别的穷尽投影/保留、统一 H4 候选与所有权仲裁、跨普通卡牌/不同武将/伤害/恢复/弃牌及隐私的系统回归。除非出现设计明确的安全阻塞或 Owner 要求暂停，不转做其他任务，也不要求阶段验收。
