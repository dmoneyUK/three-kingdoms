# HANDOVER — 当前唯一任务

## ZHOU-YU-FANJIAN-UX-01 / §10.37 — Owner 手机复审

**状态：IMPLEMENTED / DEPLOYED — PENDING OWNER iPHONE RE-REVIEW。** 代码已推送到 `ux-v2`，源提交 `9f2086d7637551d7c4ae1b78d12c932d160c9070`；精确 SHA [Actions 43122667360](https://github.com/dmoneyUK/three-kingdoms/actions/runs/43122667360) 的 Lint/fast、API、Browser smoke、D1 migration、Worker deploy、production smoke 全部通过。Worker 版本 `e6ca76cc-a439-4486-abdd-bb9b1476a802`；线上 `/api/health` 返回 `{"ok":true,"worker":"available"}`。最新 §10.37 与 Table A 已标记待 Owner 手机复审；不得自行标记通过。

### 结果与证据

- 复现的首个失败门是布局：授权 `CurrentAction` 已含合法 `choice_and_target_cards`，但过高的选择面板没有 H4/PAC 之间的安全位置，`ready=false` / `aria-hidden=true` 将必选池隐藏。复现尺寸 table 440×474、H4 y186–216、PAC y412–479，旧面板约 203px，净安全带 184px。
- 提高 Fanjian 专用 CSS 优先级并压紧内部布局；给剩余空间不足的小屏保留按实测安全带限高、面板内滚动的兜底。未移动 H4/PAC/Console，未改服务器权限、隐私、规则或 E16 真实牌转移。
- 修正后的 440×766 场景：面板 164.5px，ready=true/可见；H4→面板 25px，面板→PAC 6.5px；四花色和 Confirm 均至少 44px；七个匿名位置可选。TEST SWITCH 切到旁观者时选择器与私有选项消失，H4/PAC 保留；切回决策者后能确认一次。440 场景含 resize 检查及 Console 不遮挡断言。
- 手机浏览器最终验证：390×844 原路径与 440×766 目标/旁观者路径 **2/2 通过（8.0 秒）**；随后加强 Console 几何断言后的 440×766 单场景 **1/1 通过（6.6 秒）**。此前 390 用例一次仅因旧断言要求 4–8px 空隙失败；按设计“紧贴、无大间距”改为 0–4px，最终两项通过。累计 UI/browser 时间远低于 5 分钟。
- 本机 `npm run build`、`git diff --check` 通过。Node 26 下定向 ESLint 对基线和修改版都栈溢出；该源 SHA 在 CI 固定 Node 22.13 下完整 ESLint 通过。

### 本轮关键步骤（UTC）

- **23:14**：隔离 worktree 安全快进至最新设计 `d256eec9`；复习 §10.37 与当前唯一任务边界，未触碰主目录脏改动。
- **23:45**：完成 440×766 失败门测量；应用 Fanjian 样式与安全限高修正，完成 390/440 手机验证。
- **23:48–23:49**：提交并推送源 SHA `9f2086d7` 至 `ux-v2`。
- **23:50–23:53**：精确 SHA Actions 全部通过并部署；Worker `e6ca76cc-a439-4486-abdd-bb9b1476a802`。线上 health 检查通过。
- **23:56**：更新 §10.37/Table A 与本 HANDOVER；只保留本任务，状态仍待 Owner 手机复审。

### 唯一后续

等待 Owner 在真实 iPhone 复审 440×766 目标选择、观战隐私、固定 H4/PAC/Console 与牌池可操作性。§10.37 原已通过的激活/结果文案仍是回归契约；未获明确 Owner PASS 前不标记 USER-ACCEPTED，也不在此 handover 中加入其他任务。
