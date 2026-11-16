# HANDOVER — 当前唯一任务：§10.59 UNIVERSAL-H4-COMMITTED-FACT-COVERAGE-01

**状态：NOT CLOSED。** 所有有界提交都属于同一任务，不需要阶段验收。完整完成服务端结果来源覆盖、公共事实保留、唯一 H4 owner 和系统级回归后，再交 Owner 做一次最终 iPhone 验收。设计依据：`docs/UX2-refine.md` §10.59，revision `2026-11-16 09:42 UTC`。

## 最新部署基线

- `f6924f800261e71ebd40296c1c17e45aa9e894f4` 已部署；精确 SHA Actions [43900615600](https://github.com/dmoneyUK/three-kingdoms/actions/runs/43900615600) 全部成功，Worker `655dff20-3963-4cfd-8ca7-6f51f7089571`，生产 `/api/health` 正常。

## 当前进展与续接点

- `4ac1534201e3fc2da3df3dde6b37aefaf2d28028` 的精确 SHA Actions [43902113118](https://github.com/dmoneyUK/three-kingdoms/actions/runs/43902113118) 失败，API 回归在 Discard Phase 真实 HAND→DISCARD 事件上发现：timeline 已有 typed `committedOutcome`，但活动阶段快照没有把它提供给统一 H4 候选集。Lint/fast 与 browser startup smoke 通过；部署被跳过。
- 根因在公共事实队列接线：`game/presentation-v2.ts` 仅在保留的单一 H4 owner 与当前因果 frame 匹配时传递事实；`game/presentation-snapshot.ts` 又只在没有活动 authority 时输出 retained facts。新阶段开始后，较早但已提交的公共结果可能从通用 H4 路径消失。
- 当前本地修正：保留队列在新阶段仍可透传；快照把经验证的跨交互旧事实保留在独立队列中，活动事件仍限定在当前交互，旧事实按 public order 早于活动事实筛选，且不会被提升成活动阶段的单一 retained owner。新增快照回归；保留 API 弃牌断言作为端到端覆盖。
- 未运行本地测试、构建或设备/browser 测试，遵循 Owner 指令。下一步只做 diff/格式检查，然后提交推送、等待精确 SHA CI；成功后核实 Worker 部署与生产 smoke。若 CI 失败，按首个真实失败修正，避免重试循环。

不得关闭 §10.59、拆成独立子任务、要求阶段验收或声称 USER-ACCEPTED。最终仍待 Owner iPhone review。
