# HANDOVER — 当前唯一任务：§10.61 Boundary C

## 最近交付结果

最新已部署 tip `44130bec756e3335cf13018d2a9b284d8cd6381d` 的精确 SHA Actions [43985524065](https://github.com/dmoneyUK/three-kingdoms/actions/runs/43985524065) 全绿；Worker `dba0700d-87c4-4e15-80ec-ddc37752cacc`，生产首页与 `/api/health` HTTP 200。此 tip 包含已完成的 §10.62/§10.63 修改，两项均待 Owner iPhone 复验。§10.61 Boundary A/B 已在当前分支；Boundary B 精确 SHA Actions [43980227100](https://github.com/dmoneyUK/three-kingdoms/actions/runs/43980227100) 全绿并部署，Worker `ebdd299b-11f7-49f3-a275-10c11cf35535`。

已同步 `origin/ux-v2`。当前依据 `docs/UX2-refine.md` revision `2026-11-16 21:51 UTC`、design commit `c82c15d901f2340e57594dd08408ca638ed10fff`。不运行本地 UI/browser 或设备测试；针对性纯测试交由精确 SHA CI 执行。

## 当前任务：§10.61 UNIVERSAL-PRECOMMIT-SELECTION-TOGGLE-01 — Boundary C

将同一可撤销选择策略接入剩余 Hero/目标草稿及确实可选择的可选 Provider：移除普通 target-only Hero skill 活动态按钮的无操作返回；owner 仍持有活动草稿时，同一按钮再次点击应只清除未提交目标/卡牌和本地提示，不发 action；同一授权目标可再次点击取消；同一草稿不显示多余 Local Cancel。保留 Lust、Fanjian 专用退出与私有选择器，Borrowed Sword 强制续选、End Turn、mandatory picker、即时触发、passive/automatic skill、Skip/Pass/TAKE DAMAGE 与已提交 response 的现有语义。

复用 `app/local-precommit-selection.ts` 和现有 CurrentAction/Provider 投影；不改规则、服务端、action payload 或已提交事件。针对本阶段更新/补齐受影响的焦点断言，检查完整 diff 与 `git diff --check`，提交推送并核验精确 SHA Actions、Worker 部署及生产 smoke。若投影不能证明 owner/选项有效则 fail closed 并报告具体阻塞。§10.61 总体验收待 Owner iPhone review，不得自行标记 USER-ACCEPTED。

**恢复点：** Boundary A/B 已交付。当前源码中 `activeSkillPrecommitControls.retapSupported` 未包含 `selection.type === "target"`，`heroSkillButtons` 对非 Lust/Fanjian 的活动 target-only skill 直接返回。先完成这两处及 Zhang Liao Assault 的目标反选断言，再核对 §10.61 Boundary C 其余要求；Boundary C 完成后 HANDOVER 仅切换到一个下一 bounded task。
