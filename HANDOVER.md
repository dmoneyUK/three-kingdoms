# HANDOVER — 当前任务

仓库：`dmoneyUK/three-kingdoms` · 目标分支：`ux-v2`

工作树：`/Users/jingedai/.codex/worktrees/ux2-judgement-seat-01` · 本地分支：`codex/ux2-judgement-seat-01`

最新设计已复习并同步：`docs/UX2-refine.md`，修订提交 `ba7ee751cb2d15cfcd406b1552cd29800451d685`（2026-11-03 00:41 UTC）。T5 私有响应指引已由用户接受并关闭；T6 §10.30 仍是唯一当前任务，T3 转换结算和公开反制历史尚未完成。原 T3/T6 新增 iPhone 反馈发生在当前 H4 修正提交之前，不能视为对该修正的测试结果。

## 当前唯一有界任务 — T6 PUBLIC-PAC-REVEAL-ORDER-01（§10.30）

**状态：继续实施中；T6 未整体验收。** 当前子步骤是原 T3 §10.33 的诊断；在确认第一个证明丢失边界前，不改结算代码、不推断截图因果。

**当前诊断目标：** 用真实四人对局核验 Gan Ning 黑色非 Dismantle 物理牌 AS Dismantle，目标为公开 Judgement 区的 Lightning，且所有无懈可击响应通过。沿一条事件链记录原始 `card.id/kind/suit/rank`、有效 `resultingCardKind`、root/interaction/frame/target、`pending.target_card`、经授权的实际选择、最终弃牌事件、`publicDismantleSettlement`、服务端投影、当前 viewer 的 `PublicCardDisplayAction` 与 H4 event ID。定位服务器证明、投影、新弃牌事件识别、当前 action 覆盖、H4 渲染/布局中最先丢失信息的边界，再按 §10.33 修复。截图本身不证明 Lightning 由本次选择移除；没有可读 trace 时不得伪造 event/root ID。若真实权威证明无法取得，停下并报告缺少的确切字段。

**最近交付的共享阶段布局：** 提交 [`f9e43b32a4e318d3d39bbf4a2c0d6199d18db992`](https://github.com/dmoneyUK/three-kingdoms/commit/f9e43b32a4e318d3d39bbf4a2c0d6199d18db992) 已推送并部署。REVEAL→MOVE→PARKED 阶段中真实 CardFace、H4、PAC 和倒计时共用阶段身份；MOVE 保留真实卡牌动画，PARKED 根据卡牌实际落点重新居中 H4。布局测试 6/6、目标 ESLint 0 错误、build 通过、单一 390×844 真实对局场景 1/1 通过（14.1 秒；本地 UI 总时长低于 5 分钟）。精确 SHA [Actions run 41554425229](https://github.com/dmoneyUK/three-kingdoms/actions/runs/41554425229) 的 lint/fast tests、API tests、browser startup/room smoke、deploy、production smoke 全部成功。Worker 版本 `c5328323-5498-4110-ad87-dc92a813e1d1`；2026-11-03 00:44 UTC 直接 `/api/health` 返回 HTTP 200。

**新 iPhone 反馈边界：** 2026-11-03 00:29 的 IMG_4016/IMG_4017 记录了 Gan Ning 转换牌停放与 PAC/H4 的旧布局现象，但早于 `f9e43b32`。图像没有 JSON game log/UX Trace；Lightning 的移除来源和 rootEventId 尚未确认。最新布局修正仍待之后的 owner iPhone review，不得据此宣称通过或失败。

**本步骤限制与下一边界：** 所有本地 UI/browser 运行合计不超过 5 分钟；优先用窄范围权威 API/投影证据及一个四人场景。先完成 §10.33 的证据追踪与结算证明修正，再按 §10.30 审计公开反制历史的渲染所有权。T6 全部修正部署后才准备一次合并 iPhone 复验；不得标记 USER-ACCEPTED。
