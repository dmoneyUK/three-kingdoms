# HANDOVER — 当前唯一代码任务（原 H4 未完成任务续做）

## 全游戏 H4 公共事实完整性与 HP/卡牌变化的通用复用修复

**状态：ORIGINAL TASK / PARTIALLY ACCEPTED / CORRECTION REQUIRED / NOT CLOSED。** 黄盖仅是最早发现 H4 信息区缺失的一个场景；**任务原目标是所有支持的公开游戏场景都不能再丢失 H4，新增明确要求：所有实际已提交、规则允许公开的生命和卡牌变化都必须呈现在 H4**。这是**同一未完成原任务**，不是新增 Huang Gai 专项、文案专项、或新编号。执行依据：最新 `docs/UX2-refine.md` 的现有 **§10.59 UNIVERSAL-H4-COMMITTED-FACT-COVERAGE-01**（该章节编号不变）。先阅读 `AGENTS.md`、该完整章节及 R0/R1/R2/R7/R8、`docs/AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md`，按其规定从本任务继续。

**已完成且仅部分通过的证据：** 代码 `32fd22c05969caaac19b52cb940c3dadd490a3a0` 已修复黄盖 Self Sacrifice 的 H4 显示并部署，原精确 SHA [Actions 43765286393](https://github.com/dmoneyUK/three-kingdoms/actions/runs/43765286393) 全绿，Worker `569f1334-63f7-424c-b8e5-1195bd340072`。Owner 在 2026-11-15 22:40 UTC **只确认“黄盖信息显示通过”**；其 `lost 1 HP and drew 2 cards` 结果文案未通过，其他 Hero、正常 Draw/Discard、普通卡牌、Equipment、Dying/Negation/多个连续事实的完整覆盖均尚未验收。**不可关闭原任务**，也不可把黄盖显示成功表述为共享架构已通过。

**Planner 已完成根因与架构审查，Agent 只执行：** 设计文档 §10.59 已列明代码路径、事实模型、唯一 H4 所有权、公共/私有边界、所有变化类型及逐步验收。特别注意：`app/api/rooms/route.ts` 的现有 `addCommittedPublicSkillOutcome` 只有黄盖 `lose_draw` 调用；`publicTriggerFactFor`、`resolveNormalDrawPhase`、`continueDyingResumeEffect`、`addDiscardEvent`、`resolveSourcedDamage`、`give_cards` / `discard_draw`、普通卡牌效果各自发布/处理，尚无全路径共用已提交结果。事实投影与 retained/H4 选择器不完全覆盖 `CARD_DISCARDED` 等类别；`app/page.tsx` 通用、弃牌、真实 CardFace、技能专用展示入口存在多所有权。不得只增加黄盖条件句或改一条字符串就宣称完成。**禁止 Agent 自行调查根因、重新设计、扩大产品行为或创建新任务编号**；遇到具体服务端证明不足，报告准确阻塞点给 Planner，不能编造事实。

**当前唯一可执行的第一步（同一任务内部的 bounded slice）：**
1. 在 `game/presentation-semantics.ts` 的现有公开事实契约上实施**可验证的 typed committed HP/card outcome**，覆盖已提交的 HP COST vs actual damage/recovery、Draw/Discard/Gain/Transfer/Equipment zone 等实际变化；建立共享服务端发布 helper，保留 event/root/causal/publicSequence、actor/target、准确整数数量、匿名私牌安全和旧记录兼容。使用合法 server-confirmed commitment/CAS，避免“声明了但尚未执行”的结果或重复事件。
2. 让 `game/public-activity.ts` 的一个纯共享 formatter 输出数量准确的 outcome-first H4；保留真正无增减时的原始取消/预防/出牌意义，不发明伤害或卡牌。将黄盖存活和濒死救援后的真实结果接到新契约；**同时通过一个不同英雄技能与一个普通卡牌/正常摸弃牌的共享 API/formatter 回归，证明它不是 Huang-only 的类型/组件**。
3. 做定向单元/API 测试，要求公共事实身份/安全校验、黄盖实际 `lost 1 HP and drew 2 cards`，进入 Dying 前**不能**声称未完成的摸牌、死亡不能假摸；实际数量短缺、恢复上限、匿名私牌和同一批多人观察者一致；`git diff --check`、必要 build/lint。禁止以文字解析 `@history` 或本地 HP/Hand diff 填充公共证据。不得创建新 H4 组件、特判 Hero ID 或改变游戏规则。
4. 第一代码 slice 达到可提交状态后，根据原有工作流同步、提交推送 `ux-v2`、检查该精确 SHA 所有必需 CI、Worker 和生产 smoke，如实记录结果。**即使第一 slice 完成，本任务仍 NOT CLOSED**；在本 HANDOVER 写同一原任务的下一 bounded slice（§10.59 的通用 publisher → 其他真实结算源 → 公共投影保留 → 全类别唯一 H4 仲裁/事件队列），不能误切换到 §10.57。所有“正常回合、英雄技能、普通卡牌、装备及其他实际生命/卡牌变化”最终都必须走复用路径并证明不掉 H4。

**验收与禁止事项：** 以设计文档 §10.59 的完整来源覆盖、公共可见结果/不重复/不丢失、隐私/合法行动/实际物理卡牌守恒、手机真实显示为唯一最终完成门槛。所有本地 UI/browser 测试在**每个 bounded slice 合计最多 5 分钟**，不可把它误当每个 test 5 分钟；优先快速 pure/API，CI/部署单独核验。CI 绿不等于 Owner PASS。你只能实施、验证、交付，不做新的原因调查，不自我验收。

**独立已交付但需保留的记录：** §10.56 Inspector 座位锚定已于 `bae5719c054eabaf4d52bec5cf6d6f35c0d24495` 部署，Actions `43758214272` 全绿；2026-11-15 22:58–22:59 UTC 复跑 440px 聚焦浏览器回归通过，**仍待 Owner iPhone 验收**，不因本 handover 调整而宣称通过。§10.57 Skip 红色样式已经批准，但根据 Owner 最新优先级**暂缓至此原 H4 任务完成或明确阻塞的安全边界**。独立 §10.51 仍为证据门控，已通过的 §10.49 不重开。
