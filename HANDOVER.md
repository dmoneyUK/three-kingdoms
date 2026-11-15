# HANDOVER — 当前唯一任务

## §10.56 OPPONENT-INSPECTOR-SEAT-ANCHOR-01

**状态：** 本地实现完成，聚焦验证通过；尚未提交/推送，CI 与 Worker 部署待执行；需要用户手机复验。

**最新设计：** `docs/UX2-refine.md` revision `2026-11-15 20:02 UTC`，§10.56。手机 4–6 人局顶排 Inspector 按选中真实座位实时锚定，优先显示在该座位下方；水平位置按视口/战场安全边界作最近可行夹取；避开 H4/PAC、活动 CardFace、其他玩家座位及本地 Dock/手牌。保留现有左右侧座位布局和 TEST SWITCH 隐私边界。

**原因与修改：** `OpponentPublicInspector.measure()` 原先只让五人局左右侧 Seat 进入相对定位分支；顶排 Seat 因 `data-side-column="top"` 未匹配而走全局居中分支。现在新增 4–6 人手机顶排分支，以真实 Seat DOMRect、`.play-table` 和 `visualViewport` 计算位置，检测实际公告、公开活动、CardFace、倒计时、选择面板和其他 Seats；空间不足时限制面板高度，让公开详情区域滚动。TEST SWITCH 按原 viewer 隔离行为关闭 Inspector；重新打开时重新测量新座位。同步更新 4 人和 5 人几何回归断言。

**验证记录（2026-11-15 UTC）：**

- 聚焦浏览器命令：`npx playwright test --config tests/browser/playwright.config.mjs tests/browser/opponent-inspect-hero-focus.spec.mjs --grep '§10.56|opponent Inspect uses the measured Stage safe zone at 480px' --workers=1`。
- 两次初始尝试失败于旧断言：其一仍要求手机 Inspector 全局居中，其二错误假设 TEST SWITCH 保留跨 viewer 的 Inspector。保留的身份隔离会关闭面板；已将验证改为切换后重新打开并核实新锚点。
- 最后一次聚焦运行：2/2 通过，约 8.4 秒；包括 4 人 480px 回归，以及 5 人 440px 顶排左/中/右、TEST SWITCH 和视口缩放。三次浏览器进程累计约 33 秒，低于每任务 5 分钟上限。
- `git diff --check`、浏览器规格 `node --check` 已在回归断言最终调整前通过；需要在提交前重跑静态差异/语法检查。浏览器页面通过 Vite 加载并执行。本地未运行整套测试或桌面检查。

**当前工作树：** 隔离工作树 `/Users/jingedai/.codex/worktrees/ux2-1049-expiry-20261115`，分支 `codex/ux2-1049-expiry-20261115`，基线 `7561fae7766736f97c1ff9cc3bc6bc28c431bddf`。只包含本任务 `app/page.tsx` 与相关 Inspector 浏览器几何断言的改动，以及 3 个 Inspector 几何回归规格和本 handover。

**下一步：** 重跑 `git diff --check` 与三个修改过的 `.spec.mjs` 语法检查；确认远端 `ux-v2` 未前进且改动范围仅属本任务，再提交/推送。之后等待该实现精确 SHA 的所有必需 Actions、Worker 部署和生产 `/`、`/api/health` smoke。成功后在设计文档将 §10.56 标为 IMPLEMENTED / DEPLOYED — PENDING OWNER iPHONE REVIEW，并以 §10.57 作为唯一后续任务；不得标记用户验收通过。
