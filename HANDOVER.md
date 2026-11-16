# HANDOVER — 当前唯一任务：§10.59 UNIVERSAL-H4-COMMITTED-FACT-COVERAGE-01

**状态：NOT CLOSED。** 有界提交属于同一任务，不设阶段验收。完成指定服务端结果来源、公共事实保留、唯一 H4 owner 和系统级回归后，统一交 Owner 做最终 iPhone 验收。设计依据：`docs/UX2-refine.md` §10.59，revision `2026-11-16 09:42 UTC`。

## 最新部署基线

- `f6924f800261e71ebd40296c1c17e45aa9e894f4` 已部署；精确 SHA Actions [43900615600](https://github.com/dmoneyUK/three-kingdoms/actions/runs/43900615600) 全部成功，Worker `655dff20-3963-4cfd-8ca7-6f51f7089571`，生产 `/api/health` 正常。

## 当前进展与续接点

- `4ac1534201e3fc2da3df3dde6b37aefaf2d28028` 的精确 SHA Actions [43902113118](https://github.com/dmoneyUK/three-kingdoms/actions/runs/43902113118) 与修正提交 `82fdd6b19f866518648c1b4f1ff297ad23599f3f` 的精确 SHA Actions [43904867601](https://github.com/dmoneyUK/three-kingdoms/actions/runs/43904867601) 均在同一 API 断言失败：Discard Phase timeline 有真实 HAND→DISCARD 事件和 typed `committedOutcome`，但快照候选集合未含其 H4 事实。后一次 build、lint/fast、browser smoke 成功；API shard 2 失败，部署跳过。
- 源码路径发现两个队列边界：`game/presentation-v2.ts` 之前只在 REST 保留或存在活动 causal envelope 时才生成 retained candidate；`game/presentation-snapshot.ts` 只在无活动 authority 时输出该队列，并曾按事实新旧过滤。瞬时阶段切换时，已提交结果可能因此丢失。
- 当前修正：V2 每次从经过验证的公开 timeline 生成有界 retained facts；仍仅在 REST 或匹配当前 frame 时产生 singular retained owner。快照把 retained facts 独立于当前交互事实透传，只去掉已在活动列表中的同一 event ID，不改 server order。H4 presentation cursor 依据真实 `publicSequence` 选 owner，避免旧事实抢占新阶段，也不丢弃晚于活动 root 的结果。
- 回归覆盖活动事实前后的弃牌/摸牌结果；API 弃牌断言检查真实 zone proof、确切数量、共享 formatter、同一 event identity 与 actor/observer owner。
- 不运行本地测试、构建或设备/browser 测试，遵循 Owner 指令。当前只运行 `git diff --check`；随后提交推送，等待精确 SHA Actions。通过后核实 Worker 部署和生产 smoke；失败时只按首个实际失败点修正，不盲目重试。

不得关闭 §10.59、拆成独立子任务、要求阶段验收或声称 USER-ACCEPTED。最终仍待 Owner iPhone review。
