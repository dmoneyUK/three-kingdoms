# HANDOVER — 当前执行交接

## 当前唯一任务：PUBLIC-DISCARD-UX-01 / §10.36.1

**状态：IMPLEMENTED / DEPLOYED — PENDING OWNER iPHONE REVIEW。源实现提交 `bf327e76b11efcfefae2f14bc0f7ccfa8090d521` 已通过精确 SHA CI 并部署；不代表用户验收。** 仅实现同一成功的手牌顺手牵羊结算中，偷牌者与原持有人各自短暂私下看到同一真实牌面；其他玩家只看到匿名牌背。保护 E15 已部署待手机复验和独立待验收的 E16；不改规则，不创建子任务 ID。

### 设计与分支基线

- 实现依据：远端 `ux-v2` 的 `docs/UX2-refine.md` §10.36.1（2026-11-04 22:40 UTC）；截至本次安全同步的最新文档 revision 为 **23:38 UTC**（远端 `407a5878`；设计合并提交 `3a4bf00e`）。更新只细化独立 §10.37 Fanjian 并新增 §10.38 Treachery 设计；未更改 §10.36.1 的合同，本 handover 仍只跟踪当前 §10.36.1 手机验收边界。
- 源码基线：`cf779c6b5fa4a21c77de70706222734a45c70b97`；实现提交：`bf327e76b11efcfefae2f14bc0f7ccfa8090d521`。工作分支 `codex/ux2-judgement-seat-01`，已推送至 `origin/ux-v2`。实现提交推送前安全 rebase 到 `875e9628`；随后将 HANDOVER 更新安全 rebase 到远端最新 `407a5878`，仅并入 §10.37/§10.38 设计文档更新。
- 精确 SHA Actions：[`41935465005`](https://github.com/dmoneyUK/three-kingdoms/actions/runs/41935465005)，head SHA `bf327e76b11efcfefae2f14bc0f7ccfa8090d521`，结论 success。Browser startup/room smoke、Lint + fast tests、API tests、deploy 均通过；D1 migrations、Worker deploy 和 production smoke 均通过。Worker version：`ab45581b-bf45-4e05-9d89-1415e682114c`。独立 production `/api/health` 检查返回 HTTP 200 和 `{"ok":true,"worker":"available"}`。

### 当前实现

- `app/api/rooms/route.ts`：在已提交的成功手牌 Steal 结算内原子写入 TAKER gain 与 FORMER_OWNER loss 私有证明；两者绑定同一 room、settlement/root/resolution、真实 physical card 和 12 秒资格窗。只向认证的对应 viewer 输出统一 `privateStealParticipantResult`；私有卡身份从 timeline/projection 清洗，失主不是获得牌的 Hand 到达事件。
- `game/room-safety.js`：校验认证 viewer、参与者角色、物理卡、窗口和 TAKER transfer ID。
- `app/page.tsx`：结果仅在当前已证明并 settled 的 Hand Steal settlement 中进入唯一中央结果层；参与者私下看到真实卡牌及对应无障碍卡面说明，其他视角保留匿名背面。按 viewer/role/settlement/card IDs 防重放；TEST SWITCH 先清除旧 viewer 的手牌到达、卡片/英雄详情与选择；剔除同一 TAKER transfer 的重复牌面，同时保留一般 R7 抽牌生命周期。
- 回归覆盖：`tests/api/stratagems.test.mjs` 增加四视角、提交前/后、私有身份、重复证明与过期窗断言；`tests/browser/target-card-real-gameplay.spec.mjs` 增加唯一 390×844 实际牌局和 TEST SWITCH 场景。

### 进度与验证记录（2026-11-04 UTC）

- 23:15–23:21：完成 server proof、viewer projection、client result lifecycle、TEST SWITCH 清理和四视角 API 断言。首轮 API 30 项中 29 通过；唯一失败是目标断言仍按旧合同要求失主看不到牌身份。更新为“失主仅在自己的私有结果字段看到同一张牌”，重跑后 **30/30 通过**。
- 23:20–23:24：首次 targeted lint 报 3 个错误；修复 timeline 私有字段清洗与私有卡面切换时的状态重置。复跑 lint **0 errors**，有页面原有的 2 条 React Hook warning（`publicCardDisplayAction` 依赖，未改动）。
- 23:21–23:32：唯一 390×844 浏览器场景合计 11 次短运行，累计远低于 5 分钟。前 9 次中的失败均来自测试夹具推进/选中卡假设或过宽/过时断言，逐项修正后场景通过；随后加入参与者无障碍卡面身份断言时，运行曾读到旧 `dist/client`，重建后最终场景 **1 passed，7.8s**。最终断言验证：两名参与者都见同一原始卡面，H4/PAC 无隐藏身份，匿名观察者无卡牌 ID/真牌标签，TEST SWITCH 与刷新无重放，同一牌不重复显示为 R7 Hand 到达牌。
- 23:30–23:36：发现远端推进到 `875e9628`；确认仅文档变更并读完新增设计差异。最终 `npm run build` **通过**（只有项目现有 large chunk 与动态 API 分类提示）；最终 targeted lint **0 errors / 2 warnings**；`git diff --check` **通过**。
- 23:39–23:44：实现提交 `bf327e76b11efcfefae2f14bc0f7ccfa8090d521` 推送到 `ux-v2`；精确 SHA Actions `41935465005` 全部通过，Cloudflare Worker 部署及生产 smoke 成功，版本 `ab45581b-bf45-4e05-9d89-1415e682114c`；独立线上 health 请求 HTTP 200。
- 23:45 UTC：复核远端新增的 §10.37/§10.38 设计更新，确认与已交付 §10.36.1 不冲突；HANDOVER 仍只保留本任务及其待手机验收边界。

### Owner 手机验收边界

技术交付已完成。状态保持 **IMPLEMENTED / DEPLOYED — PENDING OWNER iPHONE REVIEW**，不得自我验收。用户手机复验要求：偷牌者和失主各见同一真牌一次；旁观者只见牌背；所有公共说明不泄露卡面；TEST SWITCH/刷新无泄漏或重放。
