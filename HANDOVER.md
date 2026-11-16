# HANDOVER — 当前唯一任务：§10.59 UNIVERSAL-H4-COMMITTED-FACT-COVERAGE-01

**状态：NOT CLOSED。** 有界实现切片属于同一个 §10.59，不要求逐片验收。完成全部服务端结果来源覆盖、公共事实保留、唯一 H4 owner 和系统级回归后，再交 Owner 做一次最终 iPhone 验收。设计：`docs/UX2-refine.md` §10.59，revision `2026-11-16 09:42 UTC`。

## 最新交付

- 普通桃恢复已并入真实 `CARD_PLAYED` committed fact：H4 以 `Peach` 为来源并报告服务端计算的实际 `HP_RECOVERED` 数量；恢复触发沿用同一事件，避免另建泛化 Recovery H4。新增 `tests/api/peach-public-outcome.test.mjs` 覆盖实际恢复量、唯一 H4 owner、旁观者相同公开投影及 outcome 不含物理牌 ID。
- 实现 SHA `6d0f66069da470fa7dd6aefcd3e657e5fae03d49` 的首次 Actions `43917594774` 未通过：API shard manifest 未登记新增测试，失败发生在 API 用例启动前，不是恢复字段错误或业务断言失败。`b3a9f4fc71806173de8b484b30158060100cc56d` 补齐现有 shard 配置后，[精确 SHA Actions 43918235743](https://github.com/dmoneyUK/three-kingdoms/actions/runs/43918235743) 全部通过：API、lint/fast、browser startup/room smoke、D1 migration、Worker deploy、production smoke。
- D1 无待应用 migration；Worker Version ID `c4dd1a4d-d809-498e-a821-629c99a0db57`。CI 生产首页和 `/api/health` smoke 通过；额外线上 health 返回 `{"ok":true,"worker":"available"}`。
- 未运行本地测试、构建或设备/browser 测试；`git diff --check` 通过。所有 API 与浏览器检查由精确 SHA Actions 执行。
- 实现 SHA `1bfd37de34fc926bb8fbec06f14720db6d55f7d5`；[精确 SHA Actions 43914879229](https://github.com/dmoneyUK/three-kingdoms/actions/runs/43914879229) 全部通过：API、lint/build/fast、browser startup/room smoke、D1 migration、Worker deploy、production smoke。
- D1 无待应用 migration；Worker Version ID `f84b230d-1f60-48b6-92a6-84657ad303fd`。额外线上 `/api/health` 返回 `{"ok":true,"worker":"available"}`。
- 按 Owner 指令未运行本地测试、构建或设备/browser 测试；`git diff --check` 通过。完整 API 回归仅通过远端 Actions 执行。
- 先前恢复结果用例的失败原因已核正：测试应读取 `recoveryFact.identity.interactionId`，误用 `recoveryFact.interactionId` 是测试字段错误，不能据此判定 H4 实现故障。

## 当前任务进度

- 已部署共享 retained-fact 队列与 Discard Phase `HAND → DISCARD` 的精确数量、共享 formatter 和统一 H4 owner 覆盖。
- 已部署借刀杀人两种实际武器转移分支的 `EQUIPMENT → HAND` committed outcome。
- 本次补齐 Steal/Burning Bridges 的六种来源组合：Steal 从 HAND/EQUIPMENT/JUDGEMENT 转到 HAND；Burning Bridges 从三种来源区转到 DISCARD。服务端结果绑定现有 settlement proof 和公共区域转移证明；不在通用 outcome 暴露物理牌 ID，Steal 手牌身份仍仅对授权 viewer 私有。
- `tests/api/stratagems.test.mjs` 增加六路径断言：实际区域/数量、统一 H4 owner/文案、各 viewer 公共投影一致和 outcome 不含物理牌 ID。以上由精确 SHA API CI 通过；尚未做 Owner iPhone 验收。

## 唯一续接点

继续同一 §10.59，按设计清单检查并接入 Dying/rescue Peach 的来源与实际恢复结果，再完成其余真实 HP/卡牌变化服务端来源、穷尽式公共事实筛选/留存、单一 H4 所有权与隐私、recency、跨来源系统回归。不得拆成独立任务或要求逐片验收；继续遵守不运行本地测试/构建/设备测试，仅做必要的精确 SHA CI、部署与 production smoke。不得标记 USER-ACCEPTED。
