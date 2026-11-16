# HANDOVER — 当前唯一任务：§10.59 UNIVERSAL-H4-COMMITTED-FACT-COVERAGE-01

**整体状态：NOT CLOSED；尚未进入统一 Owner iPhone 验收。** 最近复习 `docs/UX2-refine.md` revision `2026-11-16 09:42 UTC`。代码阶段是同一任务的内部边界，不单独请求验收。

## 已部署证据

- `4f3ddce6f9bfdc3877273435b08e99ab463f2edb`：恢复结果 H4；精确 SHA Actions [43866484287](https://github.com/dmoneyUK/three-kingdoms/actions/runs/43866484287) 全绿，Worker `8c452d7f-ade3-405c-8057-907b6a529c0d` 与 production smoke 成功。恢复身份断言路径为 `recoveryFact.identity.interactionId`。
- `e96ad960e11fa437f4ad9908ede0c23e54c1c182`：普通抽牌与周瑜英姿实际抽牌数共享 H4；精确 SHA Actions [43868046409](https://github.com/dmoneyUK/three-kingdoms/actions/runs/43868046409) 全绿，Worker `15088362-95c1-4f5c-a0b4-062f9d7023d1` 与 smoke 成功。

## 当前进展：Dying 恢复与 Rebel 奖励结果

- 13:25 UTC，`20ad17fb3095d0b4ea7249fb6f31d1b67913b02a` 的精确 SHA Actions [43874984270](https://github.com/dmoneyUK/three-kingdoms/actions/runs/43874984270) 失败：lint/fast、build、browser startup smoke 通过；API `lethal damage trigger exhaustion enters shared Dying and Peach rescue exactly once` 在 `tests/api/concurrency.test.mjs:161` 失败；部署跳过。
- 失败证据：救援后目标 HP=1、`pendingDying=null`，但旧 Attack 的 causal envelope 仍停在 `DYING / peach_rescue`。这是真实的终态清理缺陷，不调整既有断言预期。
- 13:32 UTC 修正已在本地：恢复分支仅在不存在 `resumePending`、`resumeTrigger` 或 `resumeEffect` 时，以当前 phase、pending 和 envelope 做 CAS，清除已结束的 causal envelope；仍保留原始恢复公开结果。回归断言补充检查同一响应中存在且仅存在一条公开 `HP_RECOVERED=1` 事实。
- 按 Owner 指令，未运行本地测试、构建或设备测试；`git diff --check` 通过。

**续接点：** 检视并提交当前修正，推送 `ux-v2`，等待精确 SHA CI；全绿后核实 Worker 部署和生产 smoke。随后继续 §10.59 指定服务端结果来源、统一事件筛选/保留、唯一 H4 所有权及系统回归，直到完整目标满足；期间不请求阶段验收，始终保持 NOT CLOSED。
