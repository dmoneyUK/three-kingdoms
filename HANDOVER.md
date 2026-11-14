# HANDOVER — 当前唯一任务

## §10.49 HARVEST-CHOICE-CONTINUITY-01

**状态：IMPLEMENTED / DEPLOYED — PENDING OWNER iPHONE REVIEW。**

**设计权威：** `docs/UX2-refine.md` §10.49，修订 SHA `7511f0ce16ac3bf688df37d32c03b25a2215f996`。实现位于 `ux-v2` 源码提交 `532ced390aaba5203458c8945bf9a0d1933bcc8d`。Coding Agent 隔离工作树为 `/Users/jingedai/.codex/worktrees/ux2-10-49-harvest-20261114`；主工作区未改动。

**范围：** Stage 1 私有 chooser 指引及 viewer/actor/actionRevision 约束；Stage 2 在服务器成功提交后写入原子公开选牌事件、提供独立类型化 `bumperHarvestPicks`、按已验证选牌更新 H4 并在原牌池卡位显示 `Taken by`；Stage 3 按真实障碍和 Confirm 区域稳定卡池顶部；Stage 4 切换 TEST SWITCH 时清理 viewer 私有草稿并重锚真实作者缩略卡，避免无关历史缩略卡布局待定压掉当前 H4/PAC。未改游戏规则、服务端授权或隐藏手牌权限。

**阶段进度：**
- Stage 1：`cb2e32c6cdd07f178b4e7404b0c5a3f2793b7df0`（私有 chooser 指引）。
- Stage 2：`5331024720aa6972bc2509c6757d255bd97067e6`（原子公开选牌事件、类型化 pick 与 H4）。
- Stage 3：`4a136cab4eeccdf2404bbdc237fa92755e77d76c`（稳定卡池顶部及真实 Confirm 占位几何）。
- Stage 4：`a16f69f8e1bce8d73d5e189b859092805ec44295`（viewer 私有态清理、公共 H4/PAC 与缩略卡布局解耦，以及四人 440×766 Worker/D1 浏览器回归）。浏览器规格已做语法检查；本地 UI 测试因本任务五分钟预算已耗尽而跳过，该专用场景未在 GitHub browser startup smoke 中运行。

**已观察验证：**
- Stage 1–2：`tests/public-stage-layout.test.mjs`、`tests/api/presentation-semantics.test.mjs`、`tests/api/public-activity.test.mjs` 定向套件 58/58 通过；`tests/api/presentation-v2-engine.test.mjs` Worker/D1 45/45 通过；当时 `npm run build` 通过。构建仅有既存大 chunk 与 Vite API 路由分类警告。
- Stage 3–4（2026-11-14 16:58 UTC）：`tests/public-stage-layout.test.mjs`、`tests/public-card-announcement.test.mjs`、`tests/api/public-activity.test.mjs`、`tests/api/presentation-semantics.test.mjs`：86/86 通过；`npm run build` 通过；`git diff --check` 与新增 browser spec 的 `node --check` 通过。仅观察到已知 build 警告。
- 浏览器 UI 五分钟上限已耗尽，不会在本地再启动或重试；先前运行使用旧 `dist`，不作为当前源码验证。最终 Actions 的 browser job 只运行 startup smoke；新增 §10.49 专用浏览器案例未执行，不能视为已通过。
- 最终精确 SHA Actions：[run `43618989702`](https://github.com/dmoneyUK/three-kingdoms/actions/runs/43618989702)，SHA `532ced390aaba5203458c8945bf9a0d1933bcc8d`，成功：API tests、Lint/fast、browser startup smoke、D1 migration、Worker deploy、production smoke 全部通过。
- Cloudflare Worker version `b43c9f12-e9c5-4ee8-a61b-0993e4432437` 已部署。生产 `/` 返回 HTTP 200；`/api/health` 返回 `{"ok":true,"worker":"available"}`。

**恢复点（2026-11-14 17:10 UTC）：** 代码与 HANDOVER 已推送；部署和生产 smoke 均通过。无待执行实现步骤；等待用户在真实 iPhone 检查 §10.49 的 pool 锚点、提交后 H4/PAC、`Taken by`、TEST SWITCH 跨视角一致性和真实作者缩略卡。不得标记 `USER-ACCEPTED`。

**交付边界：** 只能报告 `IMPLEMENTED / DEPLOYED — PENDING OWNER iPHONE REVIEW`；未部署前保持未完成，且不得标为 `USER-ACCEPTED`。
