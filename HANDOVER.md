# HANDOVER — 当前唯一任务：§10.59 UNIVERSAL-H4-COMMITTED-FACT-COVERAGE-01

**整体状态：NOT CLOSED；尚未进入统一 Owner iPhone 验收。** 最近复习 `docs/UX2-refine.md` revision `2026-11-16 09:42 UTC`。代码阶段是同一任务的内部边界，不单独请求验收。

## 已部署证据

- `4f3ddce6f9bfdc3877273435b08e99ab463f2edb`：恢复结果 H4；精确 SHA Actions [43866484287](https://github.com/dmoneyUK/three-kingdoms/actions/runs/43866484287) 全绿，Worker `8c452d7f-ade3-405c-8057-907b6a529c0d` 与 production smoke 成功。恢复身份断言路径为 `recoveryFact.identity.interactionId`。
- `e96ad960e11fa437f4ad9908ede0c23e54c1c182`：普通抽牌与周瑜英姿实际抽牌数共享 H4；精确 SHA Actions [43868046409](https://github.com/dmoneyUK/three-kingdoms/actions/runs/43868046409) 全绿，Worker `15088362-95c1-4f5c-a0b4-062f9d7023d1` 与 smoke 成功。

## 当前进展：Dying 恢复与 Rebel 奖励结果

- 13:25 UTC，`20ad17fb3095d0b4ea7249fb6f31d1b67913b02a` 的精确 SHA Actions [43874984270](https://github.com/dmoneyUK/three-kingdoms/actions/runs/43874984270) 失败：lint/fast、build、browser startup smoke 通过；API `lethal damage trigger exhaustion enters shared Dying and Peach rescue exactly once` 在 `tests/api/concurrency.test.mjs:161` 失败；部署跳过。
- 失败证据：救援后目标 HP=1、`pendingDying=null`，但旧 Attack 的 causal envelope 仍停在 `DYING / peach_rescue`。这是真实的终态清理缺陷，不调整既有断言预期。
- 13:32 UTC 修正已提交推送：`cfa2d13a49e083dd95c805e336e8bf7b6a976f6a`。恢复分支仅在不存在 `resumePending`、`resumeTrigger` 或 `resumeEffect` 时，以当前 phase、pending 和 envelope 做 CAS，清除已结束的 causal envelope；仍保留原始恢复公开结果。回归断言补充检查同一响应中存在且仅存在一条公开 `HP_RECOVERED=1` 事实。
- 13:37 UTC，精确 SHA Actions [43876822443](https://github.com/dmoneyUK/three-kingdoms/actions/runs/43876822443) attempt 1 失败：fast/lint、build、browser startup smoke 全绿；API shard 2 通过 174/174。shard 1 从 Diao Chan Lust 测试 #36 起报 `TypeError: fetch failed`（`tests/api/harness.mjs:175`），没有对应 Wrangler error 日志。部署跳过。
- 13:44 UTC，同 SHA attempt 2 仍失败 API：Lint/fast、build、browser smoke 全绿；377 项 API 中，`tests/api/yue-jin-dauntless.test.mjs` 的 “Dauntless damage survives Dying rescue…” 断言实际 phase 为 `resolving`、预期 `draw`；部署跳过。此次失败不是 fetch 错误。
- 13:48 UTC 根因定位：共享救援及 Hand-loss 路径先用 `causalRoomStateWrite` 写入恢复事实和新 causal envelope，之后终态 Dying CAS 仍拿较早读取的 envelope 作比较，因此更新 0 行并提前返回，房间停在 `resolving`。已在 `app/api/rooms/route.ts` 修改为重读 CAS 输入后提交；延续字段仍决定是否保留 envelope。使用现有 Dauntless API 回归覆盖此路径，尚未由远端 CI 验证。
- 按 Owner 指令，未运行本地测试、构建或设备测试；本轮源码修改前 `git diff --check` 通过。当前代码与 HANDOVER 均有未提交变更；`cfa2d13…` 未通过，尚无本阶段部署。

**续接点：** 审阅并提交当前终态 CAS 修正至 `ux-v2`，核实修正 SHA 的完整精确 CI、Worker 部署和 production smoke。全绿后继续 §10.59 指定服务端来源、统一事件筛选/保留、唯一 H4 所有权及系统回归，直到完整目标满足；期间不请求阶段验收，始终保持 NOT CLOSED。
