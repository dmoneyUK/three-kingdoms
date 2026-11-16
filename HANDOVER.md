# HANDOVER — 唯一当前任务：§10.59 共享 H4 结果消费

**状态：共享消费实现已推送；CI 暴露 Dying 期间结果事实缺失，正在修复同一阶段。** 全局任务仍为 NOT CLOSED。最新设计 revision：`2026-11-16 08:44 UTC`。Owner 已授权继续，无需等 Draw Two 单项验收；Draw Two 切片仍为 PENDING OWNER REVIEW。Owner 统一进行最终 iPhone 验收。

## 当前边界

将经 `game/presentation-semantics.ts` 验证的 `CommittedPublicOutcome` 接入 `derivePublicInteractionNarration()`，让实际 HP、摸牌、弃牌、恢复和转移数量成为共享 H4 文案；让 `app/page.tsx` 使用同一候选谓词发现这些结果，覆盖活动与保留快照。无结果事实时保持既有文案；身份或参与者无法验证时失败关闭。保留现有专用 Negation、Fanjian 和弃牌展示的单一所有权、游戏规则与手牌隐私。

本阶段聚焦 `game/public-activity.ts`、`app/page.tsx` 和 targeted API assertions。回归断言覆盖活动/REST 保留视图与真实混合 HP、draw、discard、recovery、transfer 数量，并更新 Huang Gai 共享文案预期。

## 最近交付与验证

Draw Two 实际结果来源已在 `02d9f5dfcf5ad4c537c2d6fc174a733252c8e2e3` 部署；[Actions 43810251024](https://github.com/dmoneyUK/three-kingdoms/actions/runs/43810251024) 全部成功，Worker `3b217660-4a8d-4660-a673-99d5560ca9f2`，生产 health 正常。此切片仅公开实际数量，不公开抽到的卡牌身份。Owner 已授权继续，无需等待单项测试。

**操作记录（2026-11-16 UTC）：** 08:44 同步至最新 `origin/ux-v2` `e6c424ef3a599e74490653d906ea903cad0e1072`；设计更新不改变 §10.59。共享 H4 消费提交 `41ffa2aa2dad2b21e3703821a3fce29344c4925c` 已推送。Actions [43835856345](https://github.com/dmoneyUK/three-kingdoms/actions/runs/43835856345) lint/fast 与 browser startup/room smoke 通过，API 失败 2 项，部署跳过。09:06 查明前两条断言使用根事件而非实际结果事件；提交 `2478933109ca76c1bfa5dab81442a47effc1b706` 修正事件选择并推送。其 Actions [43836952648](https://github.com/dmoneyUK/three-kingdoms/actions/runs/43836952648) lint/fast、构建、browser smoke 均通过，API 仍失败 1 项：1 HP Self Sacrifice 在进入 Dying 前未把已提交 HP 成本附到公共事实，故没有可保留结果。09:14 按既定共享路径改为在技能成本提交事实中记录服务器实测 HP 变化；成功救援后续事实仍聚合 HP 成本与实际摸牌数；失败救援不会重复发布相同成本。回归断言现核对 Dying 时的成本事实及同根最终最新结果。未运行本地测试、构建、浏览器、对局或设备测试。

**当前精确恢复点：** 核对本次服务端与断言 diff，运行 `git diff --check` 后提交/推送并等待精确 SHA Actions。API 全绿并部署后，继续同一 §10.59 的事件类别保留、候选筛选与唯一 H4 所有权；不得创建新任务编号或宣称 USER-ACCEPTED。
