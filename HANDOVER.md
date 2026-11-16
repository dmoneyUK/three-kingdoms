# HANDOVER — 唯一未完成任务：§10.59 UNIVERSAL-H4-COMMITTED-FACT-COVERAGE-01

**总状态：NOT CLOSED；所有代码阶段属于同一任务，不逐段请求验收。** 最新复习的设计为 `docs/UX2-refine.md` revision `2026-11-16 09:42 UTC`。完成服务端来源覆盖、统一消费/唯一 H4 所有权及系统级回归后，再交给 Owner 进行一次 iPhone 最终验收。

## 最近已部署基线

- `a0f3b0061adbb259a8e806db56e8e69e923070e5`（`ux-v2`）：为公开 turn-end 技能窗口建立通用因果身份，修复郭嘉遗计及貂蝉闭月 API 断言实际揭示的缺口；同一切片也保留 Draw Two 实际抽牌数和遗计私牌隐私断言。
- 精确 SHA Actions [43885972081](https://github.com/dmoneyUK/three-kingdoms/actions/runs/43885972081) 全绿：API、Lint/fast、build、browser startup、D1 migration、Worker deploy 和生产 smoke 均通过。Worker `d52ec36b-e771-4184-8827-9199260ad935`。
- `b16643b6860b3b7c9766be151eca82a2b26aede3` 的首次远端 API 运行失败，失败项是公开 turn-end 窗口缺因果身份；`a0f3b006` 的精确 SHA CI 验证通过。已部署结果仍不代表 §10.59 全面完成或通过 Owner 验收。

## 当前实施进度（2026-11-16 14:41 UTC）

- 最近已部署切片：遗计按收牌人写入实际获得数量；闭月结果沿用原 `DRAWN` 事件并附共享结果事实；公开 turn-end 触发窗口持久化通用因果上下文，使公开 provider 可复用共享发布器。
- 本次续接为现有 API 场景补上共同的 H4 文案/事件身份/唯一 surface 断言：普通摸牌、华佗弃牌与恢复、孙尚香弃牌和双恢复、黄盖自伤与实际摸牌，以及濒死桃救恢复。救援使用持久 timeline `event.id` 定位，再由共享 helper 读取已验证的 `fact.identity.interactionId`；不读取不存在的顶层 `interactionId`。
- 未按 Owner 指令运行本地测试、构建或设备测试。`git diff --check` 已通过；新回归等待推送后的精确 SHA 远端 CI。提交前确认当前 `ux-v2` HEAD `a0f3b006…` 的 Actions `43885972081` 成功，上一失败 SHA `b16643b6…` 的缺陷已在该 HEAD 修复。

## 唯一续接点

继续 §10.59 已列出的其他服务器结算来源，再完成公开类别的穷尽投影/保留、统一 H4 候选与所有权仲裁、跨普通卡牌/不同武将/伤害/恢复/弃牌及隐私的系统回归。除非出现设计明确的安全阻塞或 Owner 要求暂停，不转做其他任务，也不要求阶段验收。
