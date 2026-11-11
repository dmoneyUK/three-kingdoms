# HANDOVER — 当前唯一任务

## ZHOU-YU-FANJIAN-UX-01 / §10.37 — 修复强制选牌池缺失

**状态：本地修正已实现并通过定向手机场景；尚未提交、CI 与部署待执行。用户手机复审仍待完成。** 依据最新设计 `docs/UX2-refine.md`，远端基线 `ux-v2`=`d256eec92e84b822f4792dfe6bec6e48ccccab22`；在隔离 worktree `codex/ux2-judgement-seat-01` 操作，主目录的既有改动未触碰。

### 已确认与修改

- **首个失败门已确认：** 私有 CurrentAction 合法选项存在，包含 `choice_and_target_cards`、4 个花色和 7 个匿名位置；面板此前因通用 mobile 选择池 CSS 覆盖 Fanjian 紧凑样式而高于安全槽，`ready=false` / `aria-hidden=true` 将必选面板隐藏。复现几何为 table 440×474、H4 y186–216、PAC y412–479；原面板约 203px，净安全带 184px。
- **修正：** 提高 Fanjian 专用选择器优先级并压缩面板内部纵向间距/牌背高度；若小屏剩余空间仍不足，由 placement hook 按实测安全带限制面板高度并允许 Fanjian 面板内部滚动，不移动 H4/PAC。TEST SWITCH fixture 现在为各座位提供切换按钮，目标/旁观者分别返回正确的私有选项。
- 不改游戏规则、真实牌身份、服务端权限、隐私合同、H4/PAC 位置或 E16 转移。

### 本轮操作与验证（UTC）

- **2026-11-11 23:14：** 安全快进到最新远端设计 SHA `d256eec9`，复习 §10.37 和工作流；保留主目录脏改动。
- **截至 23:45：** 在 440×766 / table 440×474 复现并记录 option、ready、DOMRect 与可见性；修正后面板 164.5px，H4→面板间隔 25px、面板→PAC 间隔 6.5px，ready=true 且可见。四个花色按钮和 Confirm 均为 44px 高，七个位置可横向到达。
- **浏览器：** 390×844 原用例 + 440×766 目标/TEST SWITCH/切回/单次 Confirm 定向场景最终 **2/2 通过，8.0 秒**。440 场景含 resize 重测；旁观者没有私有面板或 trigger 选项。此前一次 390 断言因仍要求 4–8px 间距而失败；按 §10.37“紧贴、无大间距”修正为 0–4px 后，两场景通过。累计本地 UI 测试远低于 5 分钟。
- `npm run build` 通过；`git diff --check` 通过。
- 定向 ESLint 在本机 Node `v26.3.0` 对当前及 `origin/ux-v2` 原始 `app/page.tsx` 均因 `react-hooks/rules-of-hooks` 栈溢出而失败（基线复现）；workflow 使用 Node `22.13.0`，交由精确 SHA CI 验证。
- 提交前远端检查：`ux-v2` 当前头为文档提交 `d256eec9`；最近相关 Push Actions `43092308224` 对源代码 SHA `1ba12c3f` 成功，当前无运行中的 workflow。提交后必须等本次代码 SHA 的所有 required jobs、Worker 部署及 production smoke 完成。

### 唯一后续

复核本任务 diff 与远端头/Actions 状态；提交并推送到 `ux-v2`，跟踪同一 SHA 的完整 CI、部署与线上 health。随后仅更新本任务在设计表中的状态为 **IMPLEMENTED / DEPLOYED — PENDING OWNER iPHONE RE-REVIEW**；不得标记 USER-ACCEPTED，也不得开始其他任务。
