# HANDOVER — 当前唯一任务

上一任务 §10.42 于 2026-11-12 已交付：commit `4bd532e697c7bf51445d231a75921bad499692a0`；精确 SHA [Actions 43309874718](https://github.com/dmoneyUK/three-kingdoms/actions/runs/43309874718) 全绿；Worker `2d6cb510-04ea-4daf-9a4a-fed1daa6ec8e` 已部署，生产 smoke 和 `/api/health` 通过。状态：`IMPLEMENTED / DEPLOYED — PENDING OWNER iPHONE REVIEW`，未自行验收。

## FANJIAN-CHOOSER-VISUAL-POLISH-01 / §10.43

**状态：当前唯一执行任务；尚未开始代码修改。**

**设计依据：** 最新 `docs/UX2-refine.md` revision `2026-11-12 21:30 UTC`，§10.43。分支 `codex/ux2-judgement-seat-01`，目标 `origin/ux-v2`；当前基线 `4bd532e697c7bf51445d231a75921bad499692a0`。

### 必须完成的修正

- 四个花色按钮在红/深色与黑/浅色背景上均须有一眼可辨的选中状态：至少约 2px 高对比边框/焦点环，并带选中符号；不能只靠颜色。保持 `aria-pressed`、键盘 `focus-visible`、disabled 与标签可访问性。检查最终 CSS cascade，确保黑色花色基础背景规则不会盖掉选中样式。
- 只将可见金色 Confirm 面缩至当前约 2/3，即约 29–30px 高；实际可点 hit region 仍至少 44px 高，不能透明覆盖手牌轨或相邻控制。保留 disabled/loading/pressed 可读状态和现有紧凑布局、牌背与行动权限。
- 保持四列适配及短屏 440×474 放置，不加 Cancel/Clear，不改变花色/手牌位置选择、隐私、服务器权限或游戏规则。

### 验证与交付

- 仅一个 440px 手机浏览器场景，检查红黑花色选中/未选状态、可访问属性、Confirm 可见高度与实际触控边界、手牌区无拦截；仅在两项授权选择均完整后做一次真实提交验证。
- 所有本地 UI/browser 测试累计最多 5 分钟；超时即停止并记为 SKIPPED。附带最小相关单测、差异检查；提交前核查远端最新 CI，提交后验证精确 SHA 全部 Actions、部署及生产 smoke。
- 交付标记 `IMPLEMENTED / DEPLOYED — PENDING OWNER iPHONE REVIEW`；不得自行验收。

**恢复点：** 检查 Fanjian 组合选择器的 JSX/辅助属性，以及 `app/sequence-overrides.css` 中花色 selected 与 black-base 的实际级联顺序；从当前已部署基线实现，不重做 §10.42。
