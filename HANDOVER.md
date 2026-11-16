# HANDOVER — 当前唯一任务：§10.57 SKIP-BUTTON-RED-CONSISTENCY-01

**上一交付：** §10.63 已部署，SHA `a36b5ac1777146ab92389a892f3dce9c1df1022a`，Actions `43945972823` 全通过，Worker `e4b93a5f-8d04-445b-8f1f-fc3212a3d4ed`，生产 `/api/health` 通过。手机端仍待用户 iPhone 验收。

## 当前任务

**状态：已完成设计复核，开始实现。** 最新 `docs/UX2-refine.md` revision `2026-11-16 19:15 UTC`，§10.57。用户明确指定在 §10.62、§10.63 后立即执行 §10.57，之后才进入 §10.61；此直接任务顺序授权本次安全边界继续，即使设计索引先前写着等待 §10.59 安全交接。§10.59 技术交付仍待用户统一 iPhone review，不能关闭或拆分。

**目标：** 将所有真实可提交的卡牌选择池统一到一个小型可复用 `CardPoolDecisionFooter`：同尺寸金色 `Confirm` 与合法时的红色 `Skip`，保留操作上下文于标题和可访问名称；真实选择区可滚动且末张可达，标题、计数、按钮紧凑可见。只读池不得新增操作；不得改规则、权限、隐藏卡牌身份或非卡池控制文案。

**执行边界：** 先盘点 `CardPoolPanel`、`TargetCardPicker`、Mandatory/Distribution chooser 的实际提交语义和现有样式；保留语义不同的非池控件为显式例外。只按 §10.57 授权覆盖调用点。手机端优先，最多一个 440px Retaliation browser 场景，本地 UI 总时限 5 分钟；基本 focused tests、`git diff --check`、精确 SHA CI/部署及生产 smoke 依工作流执行。不得标 USER-ACCEPTED。
