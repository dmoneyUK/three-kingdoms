# HANDOVER — 唯一当前任务：§10.59 Step 2G 共享弃牌结果发布

**状态：Step 2G 已实现，等待修正后的精确 SHA CI。** 最新设计 revision：`2026-11-16 01:34 UTC`。Owner 负责真实游戏/手机验收；按 Owner 指示，Agent 不运行本地实际测试、构建或设备测试。远端精确 SHA CI、部署和生产 smoke 仍按项目交付要求执行。

## 最近交付

§10.59 Step 2F 在共享 `advanceHpRecoveredEvents` 发布服务端已提交的实际 HP 恢复结果（按目标合并、正整数实际恢复量、保留 continuation 幂等性）。SHA `2935944ef5ae6d8ddd04bd8415b05d07b856eb38`；[Actions 43805162032](https://github.com/dmoneyUK/three-kingdoms/actions/runs/43805162032) 全绿，Worker `86ad7de5-d9d2-41ca-ac64-dc23e9df6ab3`，生产 health/smoke 通过。普通 Draw Phase 实际数量事实已在 `685383dc` 接入并包含于该部署。Step 2G 首次 CI [43806842711](https://github.com/dmoneyUK/three-kingdoms/actions/runs/43806842711) 的 API job 失败：新 grouped-discard validator 误收紧既有单张装备替换 discard proof；修正为仅对分组事件要求同事件 root/source IDs，单张旧契约保持不变。Agent 未运行本地测试/构建/浏览器/设备测试。

范围限制：若恢复续接带有 causal context，但日志不能唯一证明对应公开根事件，则实现 fail closed，不猜 `rootEventId`。§10.59 全局覆盖仍未完成、未验收。

## 当前任务边界

§10.59 Step 2G：在共享 `addDiscardEventWithId` 中，将已有 `publicDiscardTransitions` 可验证的实际弃牌按来源区（HAND / EQUIPMENT / JUDGEMENT）汇总为通用 `CARD_DISCARDED` 已提交结果；扩展共享 proof validator，要求分组物理牌 ID、公开转移和各来源区数量完全吻合。复用同一真实事件 ID和公共参与者；来源区无法证明时不生成数量事实。保留现有真实公开弃牌卡面和专属展示路径，不在本步改 H4 消费/仲裁，也不添加卡牌/武将分支。

按 Owner 指示跳过本地实际测试；完成后检查 diff 并提交推送，再核实精确 SHA GitHub Actions、部署和生产 smoke。不得标记 §10.59 USER-ACCEPTED；下一安全边界再复习最新设计选择后续单一源边界。
