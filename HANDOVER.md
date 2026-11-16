# HANDOVER — 当前唯一任务：§10.59 Step 2A 普通摸牌结果与公开事实保留

**状态：修复进行中；当前远端 `ux-v2` SHA `3a7d20177302589fc5939bdc6b2060009e2818d8` 的 Actions [43793407438](https://github.com/dmoneyUK/three-kingdoms/actions/runs/43793407438) 失败，尚未部署。** 最新已读设计：`docs/UX2-refine.md` revision `2026-11-16 01:34 UTC`。Owner 要求 Agent 不做本地、浏览器或设备测试；只依赖提交后的必需 Actions、部署和生产 smoke。

## 最近已交付

§10.60 手牌滑动修正：代码提交 `2232d82970703e79e29a67e7d2ac4c638117ca32`，静态断言修正提交 `534b65a6522cfa055bd6f1ce97a45ec23acdad3f`；精确 SHA Actions [43789518444](https://github.com/dmoneyUK/three-kingdoms/actions/runs/43789518444) 通过，Worker `f1d47b59-16a0-44b8-8631-73e93adadaa6` 部署及生产 smoke 通过。状态 **IMPLEMENTED / DEPLOYED — PENDING OWNER iPHONE CHROME REVIEW**。

## 当前任务与实际进度

2026-11-16 02:35–02:37 UTC：读取 Actions `43791469147` 失败日志，定位为 retained 事实只保留最新 causal root 导致 3 项既有判定事实不可见；第四项仍在断言最新 H4 必须是 Heroic，而非按事件顺序更新的真实摸牌结果。未运行本地测试或构建。
- 普通 Draw Phase 已在 `app/api/rooms/route.ts` 用服务端实际 `draw.drawn.length` 写入公开 `CommittedPublicOutcome`，与牌堆、手牌、房间日志同批提交；私有摸牌回执继续保留。
- 新 API 用例已登记至既有 shard。首次 Actions [43791015689](https://github.com/dmoneyUK/three-kingdoms/actions/runs/43791015689) 在 API 测试启动前因 shard 漏登失败；修复后的 Actions [43791469147](https://github.com/dmoneyUK/three-kingdoms/actions/runs/43791469147) 中 lint/fast、browser startup smoke、新摸牌用例通过，但 API shard 1 有三项判定事实保留断言失败，以及一项 Heroic 与最新摸牌结果的 recency 断言不符合新事件顺序，部署跳过。
2026-11-16 02:44 UTC：Actions `43793407438` 已修复先前四项断言回归，但发现两项额外消费者/覆盖缺口：活动判定 PAC 不能只接受最新 retained 根，以及有真实 `publicZoneTransition` 的 `CARD_DISCARDED` 未进入 retention。当前增加精确活动事件 ID 的判定事实读取，并只保留具备真实公开弃置区转移证明的弃牌事实；未运行本地测试或构建。
- 当前本地未提交改动：`game/presentation-semantics.ts` 按每条自身提交身份保留最近 32 条有序公开事实；装备替换弃牌仅凭真实事件、卡牌身份和公开区转移证明进入快照。`game/public-activity.ts` 允许已明确活动的 Judgement event ID 在较新 retained 根存在时继续驱动 PAC。既有 API 测试覆盖此判定和装备替换路径；新增跨根因果/隐私/有界队列断言。
- 尚未推送本轮二次修复；未运行本地测试、构建、浏览器或设备测试。下一步只检查源差异与 handover，提交并推送；随后观察精确 SHA Actions。若绿灯，按仓库部署门禁核实 Worker 与生产 smoke；若失败，依据 CI 修复。不得自我验收 §10.59。

**隐私/行为边界：** 不暴露摸牌身份或卡面，不改玩法、权限或 H4 几何；保留原 `publicFactFor`/因果证明路径。§10.59 仍是唯一当前任务，尚未关闭；Owner 负责最终手机验收。
