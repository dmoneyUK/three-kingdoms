# HANDOVER — 当前唯一任务

## §10.49 共享响应窗到期卡死 P0 修复

**状态：** IMPLEMENTED LOCALLY / NOT ACCEPTED；尚未提交、推送或部署。目标分支 `ux-v2`。工作树 `/Users/jingedai/.codex/worktrees/ux2-1049-expiry-20261115`，当前基线 `4a94df589dd3020dd1b611f369b812390ba29f71`。设计依据：最新 `docs/UX2-refine.md`（2026-11-15 12:40 UTC），§10.49 P0 blocker。

### 实施结果

- 客户端共享窗观察器以公开 `windowId + deadline` 为稳定身份，支持普通玩家与 TEST SWITCH；到期先 GET 核对相同窗口仍在，再发送 `advance_timers` 并 GET 确认。未解决时按 1/2/4/8/15 秒上限退避重试，单浏览器防并发；页面隐藏时暂停，到前台续接。
- 到期后冻结旧响应/救援选择，Console 显示 `Waiting for window resolution.`；共享窗不再走旧自动 Pass、Skip 或 `start_*_timer`。非共享响应路径保持原状。
- 服务端只对已认证成员、同一已过期窗口的旧计时器/Pass 请求调用现有 `advanceSharedResponseWindow` CAS；错误窗口 ID 返回带最新房间的 409，不接受迟到卡牌或 Pass。未改 8 秒规则、优先级、卡牌规则或 D1 schema。
- 回归覆盖 Entourage、Influencing、Dying Peach 的旧请求恢复；手机浏览器覆盖沉默的 Sima Yi 与已提交 Dodge 的 Zhang Liao。

### 本轮操作与验证

- 14:09 UTC：复核 §10.49 原始 iPhone 到期失败及最新 §10.51 新失败记录；确认二者分开处理，当前仅执行 §10.49。
- 14:10 UTC：保留既有本地 `app/page.tsx` 改动，起初加入共享窗到期 watcher 与旧响应计时绕行。
- 依赖：此工作树最初没有 `node_modules`，第一次 `npm run build` 因 `vinext: command not found` 未启动。随后在本工作树建立指向现有共享依赖的忽略 symlink，未改动其他工作树文件。
- 构建：`npm run build` 通过；仅报告现有 bundle 大小与动态 API 分类提示。
- API：首次 12/13；新用例因复用 `openAttack()` 时卡牌 fixture ID 不符而失败（请求 400，未进入被测路径）。修正 fixture 后，`GAME_TEST_FILES=tests/api/shared-response-window.test.mjs node tests/run-tests.mjs` 通过 13/13。
- 浏览器：单一 390×844 场景先通过 1/1（16.2 秒）；收紧为恰好一次 `advance_timers` 后再次通过 1/1（15.5 秒）。验证无自动 `decline_response` / `skip_rescue` / `start_*_timer`、到期控制禁用、窗口按真实 Dodge 作者结算且只消耗其实体牌。累计本地 UI 测试 31.7 秒。
- Lint：变更的 API 与测试文件定向 ESLint 通过。完整 React Hook 规则对 `app/page.tsx` 栈溢出；用 `HEAD:app/page.tsx` 基线单独重现同一 `react-hooks/rules-of-hooks` `RangeError`，所以确认不是本次新增触发。局部关闭该崩溃规则检查本文件其余 lint 后为 0 error，剩 1 条既有 `exhaustive-deps` 警告（`publicCardDisplayAction?.motion`）。`git diff --check` 通过。
- 提交前检查：当前远端 `ux-v2` 为 `4a94df58`，其与最近成功部署 SHA `e555109e` 之间只有文档变化，`app/ game/ tests/ package*` 无差异；远端最新相关 Actions #43698429149 在 e555 上全部通过（Lint/fast、API、browser smoke、D1 deploy、Worker deploy、production smoke）。新实现 SHA 的 exact-SHA CI 尚未运行。

### 唯一待办

复核最终 diff 与提交内容，按工作流提交并推送 §10.49 到 `ux-v2`；等待新提交的 exact-SHA GitHub Actions、D1/Worker 部署和生产 smoke 全部完成，记录实际 SHA/链接/Worker 结果。状态保持 `IMPLEMENTED / DEPLOYED — PENDING OWNER iPHONE RE-REVIEW`；不得标记用户验收通过。完成此任务后，再按用户要求重新复核 §10.51。
