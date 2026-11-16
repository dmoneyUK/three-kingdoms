# HANDOVER — 唯一当前任务：§10.59 UNIVERSAL-H4-COMMITTED-FACT-COVERAGE-01

**全局状态：NOT CLOSED；所有已部署切片均为 PENDING OWNER REVIEW。** Owner 已授权继续，不必逐项等待验收；最终由 Owner 统一进行 iPhone 验收。最新设计：`docs/UX2-refine.md` revision `2026-11-16 09:42 UTC`；核对确认新增 §§10.62–10.63 未改变当前 §10.59 范围或顺序。不得创建新任务编号、切换独立任务或自行宣布接受。

## 最近已部署结果

提交 `7f5ec98910d1cf3be820f67c5c614c7967242fb6` 修复 Self Sacrifice 在 Dying 前的实际 HP 成本事实，并避免同根失败救援重复发布。精确 SHA [Actions 43838156258](https://github.com/dmoneyUK/three-kingdoms/actions/runs/43838156258) 全部成功；Worker `37794291-8402-415d-9d08-24cf1222464a` 已部署；生产 `/api/health` 返回 `{"ok":true,"worker":"available"}`。Draw Two 先前切片仍 PENDING OWNER REVIEW。按 Owner 指令，本地测试、构建、浏览器、对局及设备测试均未运行。

## 当前有界阶段：公共事件类别保留与唯一 H4 消费者

将唯一的 `PUBLIC_PRESENTATION_EVENT_CATEGORIES` 用于投影验证和保留；CARD_EQUIPPED 仍要求装备实体转移证明，CARD_DISCARDED 则要求实体弃牌证明或共享提交结果中的实际弃牌计数。把 `CommittedPublicOutcome` 传过 PresentationV2 共享验证；让每个可叙述的已验证公共类别进入统一 H4 候选与 provider-neutral 文案，纯阶段标记需有公开结果文案才入选。对活动/保留快照重复事件按持久 event ID 去重，遇到语义冲突则失败关闭；用一个实际接入 JSX 的选择器，在 PublicCardDisplay、PublicDiscardAnnouncementLayer、PublicInteractionAnnouncementLayer 和 PublicSkillEventAnnouncementLayer 间选择唯一 H4 owner。已添加类别覆盖、结果投影、保留和 owner 断言；未运行本地测试。

**最近精确 SHA CI 结果：** `82b999cf53d1c3631805de42822f7ae261527dba` 的 [Actions 43843136196](https://github.com/dmoneyUK/three-kingdoms/actions/runs/43843136196) 已结束：lint 因 `tests/api/presentation-semantics.test.mjs:647` 未使用变量失败；API/build 与 browser startup/room smoke 均通过；部署因 lint 失败跳过，未执行 production smoke。现已将测试改为复制对象后删除字段；未运行本地测试、构建或设备测试。**当前恢复点：** 提交并推送仅此 lint 修复及 handover，等待修复 SHA 的完整 CI/部署/smoke；通过后继续 §10.59 下一服务端结果来源阶段。
