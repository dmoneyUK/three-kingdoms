# HANDOVER — 当前唯一任务

仓库：`dmoneyUK/three-kingdoms` · 工作分支：`ux-v2`
工作树：`/Users/jingedai/.codex/worktrees/ux2-judgement-seat-01` · 本地分支：`codex/ux2-judgement-seat-01`

## T6 — PUBLIC-PAC-REVEAL-ORDER-01（§10.30，含原 T3 §10.33）

**当前有界步骤：**让同一组牌根下已提交的公开无懈可击历史，在目标阶段切换、观察者切换及刷新后仍由服务器快照重建，并停放在真实作者座位。不得改牌局规则、卡牌身份、私密选择、计时或已接受的 T5 行为。T6 仍为 **OWNER FAIL / CORRECTION REQUIRED**；不得宣称 iPhone 验收。

**已审阅设计：**`origin/ux-v2` HEAD `3ed3028d5b13f99e1080b478725ebeacaf5c04b1`；最新设计变更 `ba7ee751cb2d15cfcd406b1552cd29800451d685`，已复核 §10.30。当前远端 HEAD 与本地一致。

### 证据、实现和验证（2026-11-03 UTC）

- `01:24` 真实四人 Raining Arrows 场景的诊断附件显示：下一目标 API 快照仍有两张已提交 Negation 的公开事实，分别具有事件 ID、作者 ID、物理牌事件、持久 `publicSequence`、`frameId` 和提交身份；它们的 `frameId` 与组根帧一致，但事实未带 `rootEventId`。此前按 `rootEventId` 过滤的断言过窄，已修正；不改服务器规则或事件投影。
- `app/page.tsx`：以同一 interaction/root frame 的结构化 `CARD_PLAYED / card_play / Negation` 事实为候选；再逐张核对 timeline 事件 ID、公开播放状态、物理牌种类/ID、作者、resolution ID 与持久序号。排序后构建停放历史；若任一事实不匹配则清空该历史，不猜测。向既有 group-root renderer 提供 history，使新观察者/刷新不依赖来源标签页的 React 内存。
- 实际场景同时发现 `targetIndex` 只在 `depth === 0` 分支内声明，却被后续 Negation narration 深度引用，导致页面运行时异常；已提升到函数共同作用域。
- 将浏览器断言改为当前合法的 Negation 主文案与说明文案，并在同一场景验证异玩家刷新、下一组目标阶段的快照事实以及私密失败意图不泄漏。
- `01:23` 一次早期浏览器检查因测试要求不存在的 `rootEventId` 而失败；随后读取追踪附件证实实际关联为 `interactionId + rootFrameId/frameId`。未将这次断言失败记作产品行为失败。
- `01:25` 最终手机尺寸 Raining Arrows 浏览器场景：**1 passed（8.9 秒）**。观察者切换后 3 张牌各出现一次且为 parked，提交作者和真实卡 ID 正确；推进到下一目标后刷新仍保留 3 张；私密失败意图未显示；无页面错误。
- `npm run build` 通过（输出 chunk size 与 vinext 动态路由提示）。目标 ESLint：0 errors、2 个位于未修改区域的 React Hook warnings。`node --import tsx --test tests/api/presentation-semantics.test.mjs`：17/17 通过。`node --check`、`git diff --check` 通过。直接用 `node --test` 首次运行因 TS extensionless import 未加载而失败，改用仓库 tsx loader 后通过。
- 推送前已查看远端最新相关 Actions：`41557817703` 对 `84a114d27c55d08999c2f6e354a1590d0cae1579` 为 SUCCESS。当前修正尚未提交/推送，CI 与 Worker 部署待办。

### 当前交付状态

**本地实现 / 定向验证通过；提交、精确 SHA CI、Worker 部署和健康检查待执行。**此步骤交付后，仍需在 T6 内继续修复共享 CardFace/Frame/H4/PAC 的公共几何与时序，再做合并验收；本文件只保留当前这一项 T6 工作。
