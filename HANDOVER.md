# HANDOVER — 当前唯一任务

仓库：`dmoneyUK/three-kingdoms` · 目标分支：`ux-v2`

工作树：`/Users/jingedai/.codex/worktrees/ux2-judgement-seat-01` · 本地分支：`codex/ux2-judgement-seat-01`

设计依据：`docs/UX2-refine.md` 修订 `ba7ee751cb2d15cfcd406b1552cd29800451d685`（已复核 §10.30、§10.33）；远端 `ux-v2` 当前 HEAD 为 `e2ec036134b46339bb2bd9dcbd665d78c27b274e`。

## T6 — PUBLIC-PAC-REVEAL-ORDER-01（§10.30，含原 T3 §10.33）

**状态：本地修正进行中；未提交、未推送；本次浏览器验收未通过，等待修正后的跨视角验证；未部署；PENDING OWNER iPHONE REVIEW。** 当前只处理共享 H4/Frame/PAC 布局及 Gan Ning 转换过河拆桥的真实结算 H4；未开始 T6 的其他步骤。

### 已实施的当前修正

- H4、PAC 在匹配的共享布局代次到达前暂缓显示，不以独立布局器抢先放置；REVEAL 阶段主牌位置即时落位，后续 MOVE 动画保留。
- 转换过河拆桥成功结算时，结算 H4 绑定真实 discard event ID；仍以原技能 root 卡牌作为几何锚点，避免结算公告被 Frame 所有权排除在共享布局之外。
- 浏览器回归场景覆盖真实 K♠ Fergana Steed AS Dismantle、公开 Q♥ Lightning Judgement、所有无懈可击响应通过、实际选取 Lightning、跨视角公开投影与私牌隐私。测试现在分别等待出牌者及旁观者的页面轮询和可见公告。

### 证据与验证记录（2026-11-03 UTC）

- **01:01 trace：** 服务端真实弃牌事件、`publicDismantleSettlement`、PresentationV2 与 snapshot 均存在且一致；首个客户端断点是公告仍使用 root event ID，因而继续显示起始牌文案。
- **01:06 trace：** 改用结算 event ID 后，真实结算文案及 Lightning 花色/点数生成；再据 DOM 发现 H4 缺少对 root 的布局锚点，导致共享布局器清空结果并隐藏备用位置。补上 root 锚点后，出牌者页面记录到结算 H4、`shared-parked` 位置和正确公告。该次测试随后因立即读取尚未完成下一次轮询的旁观者页面而失败；测试已改为分别等待两个页面，**修改后的测试未重跑**，因此跨视角结果仍待验证。
- **Build：** `npm run build` 通过，包含 root 锚点修正。
- **静态检查：** `node --check tests/browser/hero-active-skills-real-gameplay.spec.mjs`、`git diff --check` 通过；目标 ESLint 0 errors、13 React Hook 依赖 warnings。
- **本地 UI 限额：** 只运行上述一个四人场景；累计时间接近五分钟上限，不再启动本地 UI/browser 测试。本步骤尚无最终通过的浏览器结果。
- 当前五个源/测试文件有未提交修改；`HANDOVER.md` 本身也将随本次交接更新一并提交。尚无针对当前修改的 Actions、Worker 部署或生产 smoke 结果。已核实远端仍是上述 `e2ec036`。

### 唯一下一步

复核本次五个源/测试文件与本 HANDOVER 的差异后，提交并推送到 `ux-v2`，等待该精确 SHA 的全部必需 GitHub Actions 和 Worker 部署/smoke 结果。若 CI 揭示观察者展示失败，仍在 T6 当前步骤内修复；若通过，记录部署事实后再按最新 §10.30 在安全边界选择同一 T6 的下一小步。不得标记 USER-ACCEPTED。

此前共享布局基线部署 `f9e43b32a4e318d3d39bbf4a2c0d6199d18db992`（Worker `c5328323-5498-4110-ad87-dc92a813e1d1`）仅作当前工作的回归基线；不代表本次修改已验证或部署。
