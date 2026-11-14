# HANDOVER — 当前唯一任务

## §10.49 HARVEST-CHOICE-CONTINUITY-01

**状态：源代码与定向验证已完成，分阶段本地提交进行中；尚未推送、部署或验收。**

**设计权威：** `docs/UX2-refine.md` §10.49，最新远端设计 SHA `7511f0ce16ac3bf688df37d32c03b25a2215f996`。该版本要求五阶段顺序实施。当前隔离工作树 `codex/ux2-10-49-harvest-20261114` 从此 SHA 建立；先前工作树及主目录既有未提交内容均保留。

**实现范围：** 当前合法 Harvest chooser 得到私有选择/确认指引；本地提交状态绑定 room、viewer、actor 与 action revision；服务器只在真实选牌提交且 Harvest 根牌、公开揭示、参与者和精确卡面证明完整时追加一条公共选牌事实，并与手牌/待处理状态共用持久化路径；H4 更新到已选公开牌，原牌池槽位继续显示 `Taken by`；牌池为真实 Confirm 栏预留高度，在相同根事件、揭示事件、viewer 和安全几何下复用定位，有障碍变化时重新求解；TEST SWITCH 保留公开时间线、按真实作者 Seat 重锚根缩略牌，旧 viewer 的私有选择/提交状态清除；无关历史缩略牌未测量不再单独隐藏当前主卡 H4/PAC。没有游戏规则、服务端权限、手牌隐私或公共决定语义变化。

**阶段进度：**
- Stage 1 私有 chooser 指引及 viewer/actionRevision 绑定：实现完成，当前在本地提交批次中。
- Stage 2 原子公共选牌事实与 H4：实现和针对性事实/文案测试完成，尚未提交。
- Stage 3 稳定池顶与真实安全几何：实现和纯几何测试完成，尚未提交。
- Stage 4 viewer 重锚、公共状态一致性及私有 Pass：实现/浏览器回归已编写，尚未由 CI 执行。
- Stage 5 精确 SHA CI、Worker 部署与生产 smoke：未执行。

**实际验证（2026-11-14 16:34 UTC）：**
- 在远端最新设计基线 `7511f0c` 对应工作树运行 `node --import tsx --test --test-concurrency=1 tests/public-stage-layout.test.mjs tests/api/presentation-semantics.test.mjs tests/api/public-activity.test.mjs`：58/58 通过。
- `npm run build` 成功；仅有 500KB chunk 及 Vite 动态 API 分类提示。
- `node --check tests/browser/bumper-harvest-touch-pass-through-real-gameplay.spec.mjs` 与 `git diff --check` 通过。
- §10.49 唯一四人 440×766 Worker/D1 浏览器预算已用完（两次本地尝试，均不能作为源码验证）：它们使用 `2026-11-14 00:35` 的旧 `dist`；首轮只读池 panel 顶端 y=263、actor-select y=243，第二轮仍是旧构建。之后已针对源码对齐 Harvest stage 顶部并重建成功；严格不再本地启动 UI/browser。更新后的真实场景已在现有浏览器测试中，必须以精确 SHA CI 结果判定。
- 远端 `ux-v2` 最近一次已完成 Action 是 run `43535359348`，SHA `63324ed589892e84c43930e1dac88d410e0ddf7a`，成功；文档更新 SHA `7511f0c` 没有对应 Action。推送前还需复查当前 Actions。

**当前检查点：** Stage 1 改动已按 §10.49 顺序暂存；源码其他阶段暂留工作树，未丢弃。此次计划在所有阶段和定向验证完成后一次性推送分阶段提交；此前 Action 健康，但最终 CI/部署尚无证据。

**下一步（仍是 §10.49）：** 提交 Stage 1 本地批次；继续 Stage 2（公共选牌事实/H4）→ Stage 3（稳定定位）→ Stage 4（viewer 重锚/私有确认）→ Stage 5（精确 SHA CI、Worker 部署、生产 smoke）。交付状态只能为 `IMPLEMENTED / DEPLOYED — PENDING OWNER iPHONE REVIEW`，不得标为 `USER-ACCEPTED`。
