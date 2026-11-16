# HANDOVER — 唯一当前任务：§10.59 UNIVERSAL-H4-COMMITTED-FACT-COVERAGE-01

**全局状态：NOT CLOSED；所有已部署切片均为 PENDING OWNER REVIEW。** Owner 已授权继续，不必逐项等待验收；最终由 Owner 统一进行 iPhone 验收。最新设计：`docs/UX2-refine.md` revision `2026-11-16 09:42 UTC`；核对确认新增 §§10.62–10.63 未改变当前 §10.59 范围或顺序。不得创建新任务编号、切换独立任务或自行宣布接受。

## 最近已部署结果

提交 `7f5ec98910d1cf3be820f67c5c614c7967242fb6` 修复 Self Sacrifice 在 Dying 前的实际 HP 成本事实，并避免同根失败救援重复发布。精确 SHA [Actions 43838156258](https://github.com/dmoneyUK/three-kingdoms/actions/runs/43838156258) 全部成功；Worker `37794291-8402-415d-9d08-24cf1222464a` 已部署；生产 `/api/health` 返回 `{"ok":true,"worker":"available"}`。Draw Two 先前切片仍 PENDING OWNER REVIEW。按 Owner 指令，本地测试、构建、浏览器、对局及设备测试均未运行。

## 当前有界阶段：公共事件类别保留与唯一 H4 消费者

将唯一的 `PUBLIC_PRESENTATION_EVENT_CATEGORIES` 用于投影验证和保留；CARD_EQUIPPED 仍要求装备实体转移证明，CARD_DISCARDED 则要求实体弃牌证明或共享提交结果中的实际弃牌计数。把 `CommittedPublicOutcome` 传过 PresentationV2 共享验证；让每个可叙述的已验证公共类别进入统一 H4 候选与 provider-neutral 文案，纯阶段标记需有公开结果文案才入选。对活动/保留快照重复事件按持久 event ID 去重，遇到语义冲突则失败关闭；用一个实际接入 JSX 的选择器，在 PublicCardDisplay、PublicDiscardAnnouncementLayer、PublicInteractionAnnouncementLayer 和 PublicSkillEventAnnouncementLayer 间选择唯一 H4 owner。已添加类别覆盖、结果投影、保留和 owner 断言；未运行本地测试。

**当前恢复点：** 检查源码与测试 diff、`git diff --check`；查询远端当前 `ux-v2` HEAD 的最新 CI；提交并推送这一阶段，等待精确 SHA Actions、部署和生产 smoke。若通过，继续 §10.59 指定的服务端结果来源边界（普通摸牌/抽牌、伤害/恢复、弃牌与转移），同一任务号内分片交付；不要因单个 Hero 或单类牌完成而停止。
