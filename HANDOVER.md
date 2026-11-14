# HANDOVER — 当前唯一任务

## §10.49 HARVEST-CHOICE-CONTINUITY-01

**状态：Stage 1–4 已本地提交；聚焦单测、build、静态 diff 与 browser spec 语法通过；精确 SHA CI/部署/smoke 待执行；尚未推送、未部署、未验收。**

**设计权威：** `docs/UX2-refine.md` §10.49，修订 SHA `7511f0ce16ac3bf688df37d32c03b25a2215f996`。当前隔离工作树 `/Users/jingedai/.codex/worktrees/ux2-10-49-harvest-20261114`，分支 `codex/ux2-10-49-harvest-20261114`，基于 `origin/ux-v2`；2026-11-14 16:57 UTC 确认远端仍为 `7511f0c`，本地改动只涉及 §10.49。

**范围：** Stage 1 私有 chooser 指引及 viewer/actor/actionRevision 约束；Stage 2 在服务器成功提交后写入原子公开选牌事件、提供独立类型化 `bumperHarvestPicks`、按已验证选牌更新 H4 并在原牌池卡位显示 `Taken by`；Stage 3 按真实障碍和 Confirm 区域稳定卡池顶部；Stage 4 切换 TEST SWITCH 时清理 viewer 私有草稿并重锚真实作者缩略卡，避免无关历史缩略卡布局待定压掉当前 H4/PAC。未改游戏规则、服务端授权或隐藏手牌权限。

**阶段进度：**
- Stage 1：本地提交 `cb2e32c6cdd07f178b4e7404b0c5a3f2793b7df0`（`feat: guide private Bumper Harvest choices`），未推送。
- Stage 2：本地提交 `5331024720aa6972bc2509c6757d255bd97067e6`（`feat: publish committed Harvest pick facts`）；类型化选牌证明与 H4 投影已完成。
- Stage 3：本地提交 `4a136cab4eeccdf2404bbdc237fa92755e77d76c`（`fix: stabilize Harvest choice panel`）；按同一 Harvest root/reveal/viewer 复用顶部，仅当测量几何改变或缓存位置不再安全时重算。
- Stage 4：本地提交 `a16f69f8e1bce8d73d5e189b859092805ec44295`（`fix: preserve Harvest presentation across viewer switches`）；Harvest 私有状态在 room/viewer 改变时清理；公共根牌身份保留、历史缩略卡按新 viewer 的 Seat/Dock 重锚；H4/PAC 就绪只由当前主卡布局决定。新增单一四人 440×766 Worker/D1 browser 回归，覆盖 refresh、跨 viewer 公共事实/PAC 和 viewer 私有 Pass；规格语法通过。由于本地 UI 五分钟预算已耗尽，不在本地启动该案例，由精确 SHA Actions 验证。

**已观察验证：**
- Stage 1–2：`tests/public-stage-layout.test.mjs`、`tests/api/presentation-semantics.test.mjs`、`tests/api/public-activity.test.mjs` 定向套件 58/58 通过；`tests/api/presentation-v2-engine.test.mjs` Worker/D1 45/45 通过；当时 `npm run build` 通过。构建仅有既存大 chunk 与 Vite API 路由分类警告。
- Stage 3–4（2026-11-14 16:58 UTC）：`tests/public-stage-layout.test.mjs`、`tests/public-card-announcement.test.mjs`、`tests/api/public-activity.test.mjs`、`tests/api/presentation-semantics.test.mjs`：86/86 通过；`npm run build` 通过；`git diff --check` 与新增 browser spec 的 `node --check` 通过。仅观察到已知 build 警告。
- 浏览器 UI 五分钟上限已耗尽，不会在本地再启动或重试；先前运行使用旧 `dist`，不作为当前源码验证。新增单一浏览器回归由精确 SHA Actions 验证。
- 提交栅栏：远端 `ux-v2` 最新 Actions run `43535359348`，SHA `63324ed589892e84c43930e1dac88d410e0ddf7a`，完成且成功；2026-11-14 16:52 UTC 检查时无排队/运行任务。该旧 SHA 不验证本任务。

**恢复点（2026-11-14 17:02 UTC）：** 工作树上的 Stage 1–4 共四个提交，分支相对 `origin/ux-v2` 超前 4 个提交。已在提交前确认远端最新相关 Actions run `43535359348`（SHA `63324ed589892e84c43930e1dac88d410e0ddf7a`）成功、无排队/运行项；该 run 不验证本任务。更新后的 HANDOVER 尚未提交。检查差异后提交 HANDOVER，并将完整分支 fast-forward 推送到 `ux-v2`；等待推送最终 SHA 的完整 Actions、Cloudflare 部署和生产 smoke。

**交付边界：** 只能报告 `IMPLEMENTED / DEPLOYED — PENDING OWNER iPHONE REVIEW`；未部署前保持未完成，且不得标为 `USER-ACCEPTED`。
