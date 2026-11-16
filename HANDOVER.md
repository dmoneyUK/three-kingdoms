# HANDOVER — 当前唯一任务：§10.59 Step 2C 延迟摸牌结果

**状态：实现完成，待提交和远端 CI/部署。** `ux-v2` 基线：`9c8233eb2c12f02ba4cab3628f81a0d3a43a9b43`；已复核设计 revision：`2026-11-16 01:34 UTC`。Owner 负责实际游戏/手机测试；Agent 不运行本地测试、构建、浏览器或设备测试。

## 最近交付

§10.59 Step 2B 已部署：共享伤害后 `draw_cards` provider 仅在 `triggerAvailability` 证明公开时，将服务端实际 `draw.drawn.length` 写入同一 `SKILL_USED` 事实；私有卡牌回执不变。提交 `9c8233eb2c12f02ba4cab3628f81a0d3a43a9b43`；精确 SHA Actions [43796061595](https://github.com/dmoneyUK/three-kingdoms/actions/runs/43796061595) 的 API、lint/fast、build、browser startup、D1 migration、Worker 部署及生产 smoke 全通过。Worker `d1c833f5-0f2f-42e7-935e-07c446e9598b`。

§10.60 手牌滑动修正已包含在基线并部署；等待 Owner 用真实 iPhone Chrome 复验，Agent 不重复测试。§10.59 Step 2A 普通 Draw Phase 已部署；Owner 验收和 §10.59 总体验收未完成。

## 当前边界与恢复点

- 2026-11-16 03:30 UTC：扩展通用 `DyingResumeEffect`，保存服务端生成的结果事件 ID、原公开技能 root ID、公开技能标签及已实际提交的 HP 成本；救援续接携带原因果上下文。Peach/First Aid 恢复路径在存在 `resumeEffect` 时保留原因果 envelope。
- 摸牌成功后，只以实际 `draw.drawn.length` 发布 `HP_COST_LOST` 与 `CARD_DRAWN` 组合结果；救援失败时只记录已提交 HP 成本，不伪报摸牌。发布前验证唯一原 root 事件、公开事实、参与者、技能标签和当前因果帧；身份/证明缺失时不发布。卡牌 ID/卡面仍只进入私有回执。旧保存 continuation 无新证明字段时继续原安全流程。
- 回归断言已补到 Self Sacrifice 直达、Peach/First Aid 救援续接、失败救援无摸牌事实、短牌堆实际数量和多观察者一致性；这些断言未在本地运行，依 Owner 要求留给远端 CI/Owner。未运行本地测试、构建或 UI/browser 测试；`git diff --check` 通过。
- 当前代码尚未提交/推送；精确 SHA GitHub Actions、Worker 部署和生产 smoke 待进行。§10.59 仍未关闭，也未获 Owner 手机验收。
- 当前只执行 §10.59 Step 2C。下一个边界依 §10.59 顺序：通用 `publicTriggerFactFor` 完成/续接结果的实际 HP/卡牌数量发布；完成 Step 2C 的精确 SHA CI/部署后再开始。
