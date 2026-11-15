# HANDOVER — 当前唯一任务

## 最近完成的相关交付

**§10.49 Shared Response Window 到期结算 P0**：提交 `3053d209aba640ff8280f43f3e4feff91be0a646` 已推送到 `ux-v2`。精确 SHA 的 [GitHub Actions 43726390974](https://github.com/dmoneyUK/three-kingdoms/actions/runs/43726390974) 全部通过，Worker 部署成功，Version ID `fccb97eb-20dd-480e-ba45-aa8f33182896`；线上首页与 `/api/health` 为 HTTP 200。状态仍为 **IMPLEMENTED / DEPLOYED — PENDING OWNER iPHONE RE-REVIEW**。

## 当前唯一任务：§10.51 ROOM-POLL-TRANSIENT-503-RECOVERY-01

**状态：** 修复已在本地实现；待提交、精确 SHA CI、部署与生产 smoke。**不代表用户验收通过。**

**设计依据：** `docs/UX2-refine.md` revision `2026-11-15 12:40 UTC`，远端基线 `3053d209aba640ff8280f43f3e4feff91be0a646`。

### 复现与根因

- 在同一真实挂载的手机尺寸 GameRoom 中执行四人局路径：司马懿使用南蛮入侵、曹操使用杀、夏侯惇实际选择“受伤”；服务端确认 HP 4→3、`currentAction.kind=trigger`、`triggerEvent=damage_suffered` 与夏侯惇刚烈选项。
- 修复前捕获到原始本地异常：`NotFoundError: Failed to execute 'removeChild' on 'Node': The node to be removed is not a child of this node.` React 栈 `span → b → div` 对应 H4。随后复现并证实：H4 布局测量曾直接改写 React 管理的 `<b>` / `<span>` 子树，触发 DOM 所有权冲突；不是服务端伤害或技能规则故障。

### 实施

- `app/public-card-display.tsx`：H4 候选文案现于带 `aria-hidden`、不可交互的离屏测量副本中排版和测量；实时 React 文案树不再被 `replaceChildren` 或 `textContent` 改写，真实 H4 仍由 React 渲染，布局逻辑只调整几何样式。
- 增加定向 H4 所有权不变量检查和真实游戏路径浏览器回归。浏览器回归在修复后通过夏侯惇真实“受伤”→展示 H4/刚烈决策→点击 Skip/`decline_trigger`，房间保持挂载，无错误恢复屏。

### 本轮验证

- 定向 `tests/public-card-announcement.test.mjs`：32/32 通过。
- 手机浏览器场景：440×894，1/1 通过；包含修复前原始异常复现与修复后实际 Skip。累计本地 UI/browser 测试约 3 分钟，未超过 5 分钟上限。
- `npm run build`：通过。
- 定向 ESLint：0 errors，14 条 React Hooks exhaustive-deps warnings。
- `git diff --check`：通过。
- 提交前 `ux-v2` 最新 SHA `3053d209...` 的 Actions 43726390974 为 completed/success；该结果只验证此前提交，不替代本修复提交的精确 SHA CI。

### 唯一待办 / 恢复点

复核当前四个任务文件的差异，只提交 §10.51 相关文件；推送到 `ux-v2`，等待新提交精确 SHA 的全部 GitHub Actions、Worker 部署和生产健康检查。记录真实 SHA、CI 链接、Worker 版本与 smoke 结果。最终状态为 **IMPLEMENTED / DEPLOYED — PENDING OWNER iPHONE RE-REVIEW**，不得自行标记验收通过。

**本任务不改变**伤害、刚烈、服务器权限、响应/计时规则、卡牌身份或私有信息。§10.49 保持独立，不在本次扩大或重开。
