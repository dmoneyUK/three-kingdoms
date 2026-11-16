# HANDOVER — 唯一当前任务：§10.59 UNIVERSAL-H4-COMMITTED-FACT-COVERAGE-01

**整体状态：NOT CLOSED；已部署切片均 PENDING OWNER REVIEW。** 已核对最新 `ux-v2` 设计 revision `2026-11-16 09:42 UTC`。Owner 授权在同一 §10.59 编号下连续完成全部技术覆盖；最终验收由 Owner 统一进行。不得转做 §10.57 或创建新任务编号。

## 最近已部署基线

- `e7dddc17138b089d81e95140a2162f52c374b089`：Benevolence、Equilibrium、Prodigal Healer、Betrothment 的真实公开结果进入共享 `CommittedPublicOutcome → H4`；保留私密抽牌。Actions [43847397840](https://github.com/dmoneyUK/three-kingdoms/actions/runs/43847397840) 全绿，包含 API/build、lint/fast、browser smoke、D1 migration、Worker 部署及 production smoke；Worker `88cf9742-f0b0-438e-8386-62e57fd51430`。
- `8d33844cebe7f95a4e7c6c1933837b2f3f634ad0`：普通装备上场与替换结果按真实顺序报告旧装备弃置和新装备进入装备区。精确 SHA Actions [43849427860](https://github.com/dmoneyUK/three-kingdoms/actions/runs/43849427860) 全绿，包含 API/build、lint/fast、browser smoke、D1 migration、Worker 部署和 production smoke；Worker `da7bd900-5e66-4d8d-ba4a-36714ab8c5e8`。Owner 禁止本地测试、构建和设备测试，均未运行。

## 当前有界阶段：真实弃牌结果接入共享 H4

**进度时间：2026-11-16 11:00 UTC。** `app/api/rooms/route.ts` 现从带唯一物理卡 ID、事件 ID、公开可见性、真实持有者及 DISCARD 目的区的转移证明生成精确弃牌计数；普通弃牌与攻击目标弃牌共用此转换。第一版 `82de57dd56de25dd0848f910814685c8f8c386ca` 已推送，但精确 SHA Actions [43852880381](https://github.com/dmoneyUK/three-kingdoms/actions/runs/43852880381) 的 API tests 失败，部署跳过；浏览器 smoke、lint/fast 通过。失败断言是新回归未在 snapshot 中找到弃牌 H4 fact。修复改为从服务端当前 causal envelope 为同一个实体弃牌事件创建通用、公开的 `CARD_DISCARDED` fact，再接共享 committed outcome；未使用 viewer-local/私密 trigger narration 作为身份来源，也未把卡牌 ID 写入 outcome。

`tests/api/borrowed-sword.test.mjs` 断言真实弃牌计数、统一 H4 文案、单一 committed fact owner，以及另一观察者得到相同公开结果。**按 Owner 指令未运行任何本地测试、构建或设备测试；修复后的 `git diff --check` 已通过。** 当前正在提交 CI 修复；推送后等待精确 SHA 的完整 Actions、Worker 部署和生产 smoke，成功后继续 §10.59 其余已列明的服务端结果来源、公开事件保留与唯一 H4 消费覆盖。
