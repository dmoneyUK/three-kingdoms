# HANDOVER — 当前任务：§10.59 UNIVERSAL-H4-COMMITTED-FACT-COVERAGE-01

**整体状态：NOT CLOSED；所有已部署切片 PENDING OWNER REVIEW。** 最近复习设计：`docs/UX2-refine.md` revision `2026-11-16 09:42 UTC`。§10.59 保持唯一当前任务；最终 iPhone 验收由 Owner 统一进行。

## 最近已部署阶段

恢复结果和普通摸牌结果均已接入并由共享 H4 消费器验证。`4f3ddce6f9bfdc3877273435b08e99ab463f2edb` 的精确 SHA Actions [43866484287](https://github.com/dmoneyUK/three-kingdoms/actions/runs/43866484287) 全绿、Worker 部署和 production smoke 成功，Worker `8c452d7f-ade3-405c-8057-907b6a529c0d`。此前恢复测试失败是错误读取 `recoveryFact.interactionId`；权威字段是 `recoveryFact.identity.interactionId`，那些失败不能单独证明 H4 实现有缺陷。

`e96ad960e11fa437f4ad9908ede0c23e54c1c182` 为普通 Draw Phase 两张摸牌及周瑜英姿后实际三张摸牌增加共享 H4 和观察者一致性断言。精确 SHA Actions [43868046409](https://github.com/dmoneyUK/three-kingdoms/actions/runs/43868046409) 全部通过（API、lint/fast、build、browser startup/room smoke、D1、Worker deploy、production smoke）；Worker `15088362-95c1-4f5c-a0b4-062f9d7023d1`，生产 `/api/health` 正常。

## 当前有界阶段：Dying 击败奖励摸牌结果

当前未提交改动为在击败 Rebel 后，以服务端实际 `draw.drawn.length` 发布通用 `CARD_DRAWN` 结果事实，并在现有 Dying API 回归中检查共享 H4 文案、观察者一致性及不包含抽牌 ID。没有改变奖励规则或公开牌面；没有运行本地测试、构建或设备测试。

**续接点与同一 §10.59 剩余范围：** 审阅并交付此来源阶段后，继续已批准的其余服务端结果来源覆盖，以及通用 public-event 筛选、保留、唯一 H4 所有权和系统级回归。阶段提交不代表独立验收或关闭 §10.59；不自行宣布 USER-ACCEPTED。
