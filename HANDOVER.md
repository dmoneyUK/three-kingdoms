# HANDOVER — 唯一当前任务：§10.59 UNIVERSAL-H4-COMMITTED-FACT-COVERAGE-01

**整体状态：NOT CLOSED；已部署切片为 PENDING OWNER REVIEW。** 已复习设计 revision `2026-11-16 09:42 UTC`。继续同一个 §10.59，不创建新任务、不转做 §10.57；最终验收由 Owner 统一进行。

## 最近已部署基线

`b5e049661acc5fee56cb6955da7fe4920a9ac423` 已将弃牌与实际伤害结果接入共享 H4 保留链。精确 SHA Actions [43858161652](https://github.com/dmoneyUK/three-kingdoms/actions/runs/43858161652) 全绿，Worker `52d15d81-39cc-43a8-a1f8-31ee2b14de57`；生产 `/api/health` 正常。

## 当前有界阶段：恢复结果进入共享 H4，避免重复结果

实现提交 `b955ce853872ed680691565d4aa975482d975930` 已推送至 `ux-v2`。通用 `advanceHpRecoveredEvents` 仅在唯一公开根事件的 interaction/frame/committed identity 可验证时补回因 continuation 前进而失去的身份；通用 `recover_player` 传播已提交恢复事件 ID 和 causal context，避免续接再次发布重复 Recovery fact。未获证据时不猜测。

提交 `af245aa78265e5fca94092cbe4dac42b88799e8d` 修正了事实 identity 字段。精确 SHA Actions [43862283496](https://github.com/dmoneyUK/three-kingdoms/actions/runs/43862283496) 的 API 203 项中 202 项通过；唯一失败进一步证明已验证恢复事实在服务器进入后续决策后未被 `derivePublicInteractionNarration()` 选出。提交 `ba865dead2a81f5761fd8b5b78da30228075460f` 加入了按已验证 identity 回退，但其精确 SHA Actions [43863315597](https://github.com/dmoneyUK/three-kingdoms/actions/runs/43863315597) 仍在同一断言失败：活动快照分支先于实际 H4 事件选择，未优先使用调用方提供的精确 event ID。提交 `334677ebdbaad5f4cd733f827f6e55e54828e508` 调整为先查找精确 event ID，但其 Actions [43864366072](https://github.com/dmoneyUK/three-kingdoms/actions/runs/43864366072) 仍失败：Lint/fast 与 Browser startup/room smoke 通过，API 在恢复结果 H4 断言处仍无 headline，并出现后续 shard `fetch failed`；部署被跳过，Worker 仍为基线版本。

当前未提交修正限定在共享 H4 选择：调用方给出的精确 event ID 已经来自通过验证、与相同 root event、interaction 和 root frame 绑定的公开事实；若该事实含有效 `committedOutcome`，选择器不再因根事件在保留投影中的 order 关系而丢弃它。此保留事实仍须通过既有公共投影验证和纯格式化，不放宽隐私、事件身份或合法性。遵从 Owner 指令，不运行本地测试、构建或设备测试。

**续接点：** 审阅当前精确事件选择 diff 与本 handover，提交并推送修正；确认精确 SHA 全部必需 CI、Worker 部署及 production smoke。阶段交付后继续同一 §10.59 的下一明确来源边界（普通 Draw Phase 与实际 draw commit recipients），再完成通用筛选、保留和唯一 H4 展示所有权。不得把单个阶段标为 §10.59 完成，不得自行宣布 USER-ACCEPTED。
