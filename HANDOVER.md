# HANDOVER — 当前唯一任务

## §10.49 HARVEST-CHOICE-CONTINUITY-01

**状态：Stage 1 已本地提交；Stage 2 已实现并通过定向验证、待提交；Stage 3–4 源码已在工作树但尚未验收；Stage 5 未开始。未推送、未部署、未验收。**

**设计权威：** `docs/UX2-refine.md` §10.49，远端设计 SHA `7511f0ce16ac3bf688df37d32c03b25a2215f996`。隔离工作树 `codex/ux2-10-49-harvest-20261114` 从该版本建立，`origin/ux-v2` 仍在该 SHA；原工作树和主目录的既有未提交内容均保留。

**实施范围：** Stage 1 私有 chooser 指引、选择确认文字及 room/viewer/actor/actionRevision 绑定；Stage 2 只在服务器成功提交后追加一条原子公开选牌事件，验证真实 Harvest 根牌、揭示牌、参与玩家、卡面及提交身份，公开快照提供独立类型化 `bumperHarvestPicks`，H4 按最新选牌事件更新，原牌池卡位显示 `Taken by`；Stage 3 同一 Harvest 根/揭示/viewer 下稳定卡池顶部，按实际确认区和障碍几何复用或重算；Stage 4 TEST SWITCH 后保留公开事件与私有分隔，并按新 viewer 的真实座位重新锚定历史牌，当前 H4/PAC 不再依赖无关旧缩略牌的布局就绪。没有游戏规则、服务端权限或隐藏手牌信息变化。

**阶段检查点：**
- Stage 1：本地提交 `cb2e32c6`（`feat: guide private Bumper Harvest choices`），未推送。
- Stage 2：代码与聚焦单测/API 验证完成，当前未提交。一次早期 API 尝试与构建并发导致 `dist/server/wrangler.json` 暂缺；构建后重跑曾发现测试镜像未传 `publicTimeline`，已修正测试构造。最新验证通过。
- Stage 3–4：代码和几何/浏览器回归已编写，尚未由精确 SHA CI 验证；本地 UI/browser 五分钟预算已耗尽，不会重启。
- Stage 5：精确 SHA Actions、部署与生产 smoke 未执行。

**实际验证（2026-11-14 UTC）：**
- 16:40–16:52：确认远端设计仍为 `7511f0c`，工作树只含 §10.49 改动；`git diff --check` 和 browser spec `node --check` 通过。
- 16:40–16:52：`node --import tsx --test --test-concurrency=1 tests/public-stage-layout.test.mjs tests/api/presentation-semantics.test.mjs tests/api/public-activity.test.mjs`：58/58 通过，覆盖公开选牌证明、类型化 pick、H4/PAC 及几何。
- 16:40–16:52：`npm run build` 通过。仍有既存的 >500KB chunk 和 Vite 动态 API 路由分类警告。
- 16:40–16:52：`GAME_TEST_FILES=tests/api/presentation-v2-engine.test.mjs node tests/run-tests.mjs`：45/45 通过；真实 Worker/D1 Harvest 选牌后快照含一条与事件 ID/顺序匹配的类型化 pick，卡面与选择者正确。
- 本地四人 440×766 浏览器场景已编写并加测真实切换/私有 Pass/H4-PAC/池顶，但此前两次运行使用旧 `dist`（首轮测量池顶 y=263、actor-select y=243），随后预算用尽；该结果不代表当前源码，浏览器场景必须由 Actions 验证。
- 提交前 Actions 栅栏：最新远端 push workflow run `43535359348`，SHA `63324ed589892e84c43930e1dac88d410e0ddf7a`，成功；该 SHA 早于当前设计基线，不代表 §10.49 验证。

**精确恢复点：** 在提交 Stage 2 前已检查最新 `ux-v2` Actions：无排队/运行任务，最新为上述成功 run。先将 Stage 2 文件与本 Handover 分开提交；然后复核 Stage 3 稳定池顶和 Stage 4 viewer 重锚实现，完成定向验证。所有代码批次通过后再推送，等待最终精确 SHA CI、部署和 smoke。

**交付边界：** 最终状态只能为 `IMPLEMENTED / DEPLOYED — PENDING OWNER iPHONE REVIEW`。只有用户真实 iPhone 复验可关闭 §10.49；不得标成 `USER-ACCEPTED`。
