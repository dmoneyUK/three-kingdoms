# HANDOVER — 当前唯一任务：§10.56 Inspector 保留 H4 的复核修正

## 最近结果

§10.56 先前实现 `c290f9f2b775f36a47e5027055efc2e2af23d3f8` 已部署，精确 SHA Actions [43775398370](https://github.com/dmoneyUK/three-kingdoms/actions/runs/43775398370) 全绿，Worker `4e7bb0aa-f538-4652-837e-4a4d09e09b3d`；该结果仍未通过 Owner iPhone 验收。最新设计已于 2026-11-15 23:53 UTC 澄清：Inspector 可遮住 H4，但 H4 必须由原有 owner 保持同一 DOM/事件/文案/坐标和自然生命周期；打开 Inspector 不得隐藏、移动、重挂载或重置其计时。新设计要求先验证现有部署是否已经满足，再决定是否改代码，禁止盲目重复 z-index 补丁。

§10.60 Step 1 已随 `657b82a36e3f9fa84b28915f9161026020f3d82e` 推送部署；精确 SHA Actions [43776358723](https://github.com/dmoneyUK/three-kingdoms/actions/runs/43776358723) 最终全绿（首跑 API shard 的瞬时 `fetch failed` 在同 SHA 重跑通过），D1 migration、Worker 部署和生产 smoke 全通过；Worker `e34f198a-d48a-46d8-b3cf-11ab0a80157e`。§10.60 Step 2 的新增触摸回归本地 1/1（1.7s）：440×844 移动触屏 Chromium 的真实单指横划命中第一张手牌并推进轨道 `scrollLeft`，没有误选或页面横向溢出；未复现报告中的 iPhone 故障，因此未加无证据 CSS 补丁。该回归与本 HANDOVER 变更待推送。

## 当前执行

仅处理 `docs/UX2-refine.md` §10.56 的最新验收修正。设计基线为最新远端 `origin/ux-v2` `d6555d51dadebc14ef629a842ea57e9d098cdcf6`（Revision 2026-11-15 23:53 UTC）。当前已部署代码已将 `PublicCardDisplay` 与 Inspector 独立渲染，并使 Inspector 在 H4 上方；待用真实 H4 owner 的 440px 手机场景验证：打开前后 H4 是同一节点/事件/文案，display/visibility/opacity 与坐标不变（±2px），Inspector 对重叠点的实际绘制层级在前，关闭后同一 H4 原位恢复且生命周期不重启。先检查现有 browser fixture/真实事件来源并用一次 ≤5 分钟的本地 UI/browser 回归；只有复现 H4 被切换/隐藏/移动时才改生产代码。保持 PAC、Seat、活动 CardFace、Console 与其他保护区可操作，不改 H4 内容/计时/来源或游戏规则。完成后按 exact-SHA CI、Worker 部署和生产 smoke 交付；最终仍待 Owner iPhone 复验。
